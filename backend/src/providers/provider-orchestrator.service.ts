import { Injectable, Logger } from '@nestjs/common'
import { Provider } from '@prisma/client'

import { AttachmentsService } from '../attachments/attachments.service'
import { ComparisonService } from '../comparison/comparison.service'
import { ProviderCredentialsService } from '../provider-credentials/provider-credentials.service'
import { PrismaService } from '../prisma/prisma.service'
import { StreamEventService } from '../streaming/stream-event.service'
import { SYSTEM_PROMPTS } from './system-prompts'
import { WebSearchService, type SearchResult } from './web-search.service'

interface ProviderDispatch {
  providerResponseId: string
  messageId: string
  conversationId: string
  userId: string
  provider: string
  prompt: string
  conversationType: 'COMMISSIONING' | 'CHAT'
}

interface AIResponse {
  source: string
  content: string
  model: string
  tokens: number
}

interface ResponseContext {
  prompt: string
  conversationType: 'COMMISSIONING' | 'CHAT'
  history: string
  attachmentContext: string
  searchResult: SearchResult
}

interface OpenAIMessage {
  content: string
}

interface OpenAIChoice {
  message: OpenAIMessage
}

interface OpenAIResponse {
  choices: OpenAIChoice[]
}

interface AnthropicContentBlock {
  type: string
  text: string
}

interface AnthropicResponse {
  content: AnthropicContentBlock[]
}

interface GeminiPart {
  text: string
}

interface GeminiContent {
  parts: GeminiPart[]
}

interface GeminiCandidate {
  content: GeminiContent
}

interface GeminiResponse {
  candidates: GeminiCandidate[]
}

@Injectable()
export class ProviderOrchestratorService {
  private readonly logger = new Logger(ProviderOrchestratorService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly streamEvents: StreamEventService,
    private readonly comparisonService: ComparisonService,
    private readonly attachmentsService: AttachmentsService,
    private readonly credentials: ProviderCredentialsService,
    private readonly webSearch: WebSearchService,
  ) {}

  async dispatchAll(dispatches: ProviderDispatch[]) {
    await Promise.allSettled(
      dispatches.map((d) => this.dispatchSingle(d)),
    )

    if (dispatches.length > 0) {
      const { messageId, conversationId } = dispatches[0]
      try {
        await this.comparisonService.generateComparison(messageId, conversationId)
      } catch (error) {
        this.logger.error(
          `Auto-comparison trigger failed for message ${messageId}: ${error instanceof Error ? error.message : 'unknown'}`,
        )
      }
    }
  }

  async dispatchAllSync(dispatches: ProviderDispatch[]): Promise<AIResponse[]> {
    const settled = await Promise.allSettled(
      dispatches.map((d) => this.dispatchSingleSync(d)),
    )

    const responses: AIResponse[] = []
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        responses.push(result.value)
      }
    }
    return responses
  }

  private async dispatchSingleSync(dispatch: ProviderDispatch): Promise<AIResponse> {
    const { providerResponseId, conversationId, provider, prompt, conversationType } = dispatch
    const startedAt = new Date()

    const [history, attachmentContext, searchResult] = await Promise.all([
      this.buildConversationHistory(conversationId),
      this.attachmentsService.getAttachmentContext(conversationId),
      conversationType === 'CHAT'
        ? this.webSearch.search(prompt)
        : Promise.resolve({ query: prompt, results: [], summary: '' } as SearchResult),
    ])

    const context = { prompt, conversationType, history, attachmentContext, searchResult }
    const finalPrompt = this.composeAugmentedPrompt(context)
    const { text: fullContent } = await this.generateProviderResponse(
      dispatch,
      finalPrompt,
      context,
    )

    const completedAt = new Date()
    const latencyMs = completedAt.getTime() - startedAt.getTime()

    await this.prisma.providerResponse.update({
      where: { id: providerResponseId },
      data: {
        content: fullContent,
        status: 'COMPLETED',
        completedAt,
        latencyMs,
      },
    })

    return {
      source: provider,
      content: fullContent,
      model: this.getModelName(provider),
      tokens: this.estimateTokens(fullContent),
    }
  }

  private getModelName(provider: string): string {
    const models: Record<string, string> = {
      OPENAI: 'gpt-4-turbo',
      ANTHROPIC: 'claude-opus-4-20250514',
      GOOGLE: 'gemini-1.5-pro',
    }
    return models[provider] ?? `${provider.toLowerCase()}-latest`
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  private async dispatchSingle(dispatch: ProviderDispatch) {
    const { providerResponseId, messageId, conversationId, provider, prompt, conversationType } = dispatch
    const startedAt = new Date()

    try {
      await this.prisma.providerResponse.update({
        where: { id: providerResponseId },
        data: { status: 'STREAMING', startedAt },
      })

      this.streamEvents.emit({
        conversationId,
        messageId,
        providerResponseId,
        provider,
        chunk: '',
        done: false,
      })

      const [history, attachmentContext, searchResult] = await Promise.all([
        this.buildConversationHistory(conversationId),
        this.attachmentsService.getAttachmentContext(conversationId),
        conversationType === 'CHAT'
          ? this.webSearch.search(prompt)
          : Promise.resolve({ query: prompt, results: [], summary: '' } as SearchResult),
      ])

      const context = { prompt, conversationType, history, attachmentContext, searchResult }
      const finalPrompt = this.composeAugmentedPrompt(context)
      const { text } = await this.generateProviderResponse(dispatch, finalPrompt, context)

      const chunks = this.chunkText(text)

      let fullContent = ''
      for (const chunk of chunks) {
        fullContent += chunk
        this.streamEvents.emit({
          conversationId,
          messageId,
          providerResponseId,
          provider,
          chunk,
          done: false,
        })
        await this.sleep(30)
      }

      const completedAt = new Date()
      const latencyMs = completedAt.getTime() - startedAt.getTime()

      await this.prisma.providerResponse.update({
        where: { id: providerResponseId },
        data: {
          content: fullContent,
          status: 'COMPLETED',
          completedAt,
          latencyMs,
        },
      })

      this.streamEvents.emit({
        conversationId,
        messageId,
        providerResponseId,
        provider,
        chunk: '',
        done: true,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Provider request failed'

      this.logger.error(`Provider ${provider} failed: ${errorMessage}`)

      await this.prisma.providerResponse.update({
        where: { id: providerResponseId },
        data: {
          status: 'FAILED',
          errorSummary: errorMessage,
          errorCode: 'PROVIDER_ERROR',
          completedAt: new Date(),
        },
      })

      this.streamEvents.emit({
        conversationId,
        messageId,
        providerResponseId,
        provider,
        chunk: '',
        done: true,
        error: errorMessage,
      })
    }
  }

  private async buildConversationHistory(conversationId: string): Promise<string> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    if (messages.length <= 1) return ''

    return messages
      .slice(0, -1)
      .map((m) => `${m.role === 'USER' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n')
  }

  private composeAugmentedPrompt(context: ResponseContext): string {
    const sections: string[] = []

    sections.push(
      context.conversationType === 'COMMISSIONING'
        ? 'You are assisting a commissioning engineer. Provide precise, technically grounded guidance with clear risks, prerequisites, and next actions.'
        : 'You are assisting in a general chat. Provide accurate, structured, and concise guidance with actionable steps.',
    )

    if (context.history) {
      sections.push(`Recent conversation (most recent last):\n${context.history}`)
    }

    if (context.attachmentContext) {
      sections.push(`Relevant attachment context provided by the user:\n${context.attachmentContext}`)
    }

    if (context.searchResult.summary) {
      sections.push(`Web research summary (DuckDuckGo):\n${context.searchResult.summary}`)
    }

    sections.push(`Current user question:\n${context.prompt}`)
    sections.push('Respond with well-structured paragraphs and bullet lists when useful. Highlight critical risks or decision points, and reference attachments or research when appropriate.')

    return sections.join('\n\n')
  }

  private chunkText(text: string): string[] {
    const segments = text.split(/(\s+)/)
    const chunks: string[] = []
    let buffer = ''
    for (const segment of segments) {
      buffer += segment
      if (buffer.length >= 140) {
        chunks.push(buffer)
        buffer = ''
      }
    }
    if (buffer.trim().length > 0) {
      chunks.push(buffer)
    }
    return chunks
  }

  private async generateProviderResponse(
    dispatch: ProviderDispatch,
    finalPrompt: string,
    context: ResponseContext,
  ): Promise<{ text: string; simulated: boolean }> {
    const providerEnum = (dispatch.provider as Provider) ?? Provider.OPENAI

    try {
      const credential = await this.credentials.findDecrypted(dispatch.userId, dispatch.provider)
      if (credential && credential.enabled && credential.apiKey) {
        const realText = await this.invokeProvider(providerEnum, credential.apiKey, finalPrompt)
        if (realText.trim().length > 0) {
          return { text: realText.trim(), simulated: false }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown'
      this.logger.error(`Provider ${dispatch.provider} real-call failed: ${message}`)
    }

    const fallback = this.buildSimulatedText(dispatch.provider, context)
    return { text: fallback.trim(), simulated: true }
  }

  private buildSimulatedText(provider: string, context: ResponseContext): string {
    const isFirstTurn = !context.history
    const hasAttachments = !!context.attachmentContext

    if (context.conversationType === 'CHAT') {
      return this.generalResponse(
        provider,
        context.prompt,
        context.searchResult,
        isFirstTurn,
        hasAttachments,
      ).join('')
    }

    const preview = context.prompt.length > 80 ? `${context.prompt.slice(0, 80)}...` : context.prompt
    return this.commissioningResponse(
      provider,
      context.prompt,
      preview,
      isFirstTurn,
      hasAttachments,
    ).join('')
  }

  private async invokeProvider(provider: Provider, apiKey: string, prompt: string): Promise<string> {
    switch (provider) {
      case Provider.OPENAI:
        return this.callOpenAI(apiKey, prompt)
      case Provider.ANTHROPIC:
        return this.callAnthropic(apiKey, prompt)
      case Provider.GOOGLE:
        return this.callGemini(apiKey, prompt)
      default:
        throw new Error(`Unsupported provider ${provider}`)
    }
  }

  private async callOpenAI(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.OPENAI },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI returned ${response.status}`)
    }

    const data = (await response.json()) as OpenAIResponse
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      throw new Error('OpenAI response missing content')
    }
    return content
  }

  private async callAnthropic(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 900,
        temperature: 0.3,
        system: SYSTEM_PROMPTS.ANTHROPIC,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic returned ${response.status}`)
    }

    const data = (await response.json()) as AnthropicResponse
    const contentBlocks = data?.content
    if (!Array.isArray(contentBlocks)) {
      throw new Error('Anthropic response missing content blocks')
    }
    return contentBlocks
      .filter((block): block is AnthropicContentBlock => block?.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n')
  }

  private async callGemini(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPTS.GOOGLE }],
          },
          generationConfig: {
            temperature: 0.4,
          },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini returned ${response.status}`)
    }

    const data = (await response.json()) as GeminiResponse
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text ?? '').join('\n')
    if (!text) {
      throw new Error('Gemini response missing text')
    }
    return text
  }

  private generalResponse(
    provider: string,
    prompt: string,
    searchResult: SearchResult,
    isFirstTurn: boolean,
    hasAttachments: boolean,
  ): string[] {
    const hasWebResults = searchResult.results.length > 0
    const needsSearch = prompt.length > 15

    const responses: Record<string, string> = {
      OPENAI: this.openaiResponse(prompt, searchResult, isFirstTurn, hasAttachments, hasWebResults, needsSearch),
      ANTHROPIC: this.anthropicResponse(prompt, searchResult, isFirstTurn, hasAttachments, hasWebResults, needsSearch),
      GOOGLE: this.googleResponse(prompt, searchResult, isFirstTurn, hasAttachments, hasWebResults, needsSearch),
    }

    const text = responses[provider] ?? this.defaultGeneralResponse(prompt)

    return text.split(/(?=\n)/)
  }

  private openaiResponse(
    prompt: string,
    searchResult: SearchResult,
    isFirstTurn: boolean,
    hasAttachments: boolean,
    hasWebResults: boolean,
    needsSearch: boolean,
  ): string {
    const greeting = isFirstTurn
      ? 'Hey! Great to chat with you.'
      : 'Great question — happy to keep going!'

    const attachmentRef = hasAttachments
      ? '\n\nI took a look at the files you shared — thanks for including those. They give me good context to work with.'
      : ''

    const webRef =
      hasWebResults && needsSearch
        ? `\n\nI looked this up online, and here's what I found:\n\n${searchResult.results.map((r, i) => `**${i + 1}. ${r.title}** — ${r.snippet}`).join('\n')}\n\nThere's a lot more out there, but those should give you a solid starting point.`
        : ''

    const body = needsSearch
      ? `\n\nSo regarding "${prompt.length > 80 ? prompt.slice(0, 80) + '...' : prompt}" — honestly, this is a really interesting topic. Let me share my take on it.\n\nI think the best way to approach this is to first understand what you're really trying to achieve, then work backward from there. There are a bunch of different angles you could take, and the right one really depends on your specific situation.\n\nWhat's your specific use case here? That would help me give you more targeted advice.`
      : `\n\nSure, happy to chat! What's on your mind? Feel free to ask me anything — I'm here to help.`

    return `${greeting}${attachmentRef}${webRef}${body}\n\n> *This is a simulated response from OpenAI for development purposes.*`
  }

  private anthropicResponse(
    prompt: string,
    searchResult: SearchResult,
    isFirstTurn: boolean,
    hasAttachments: boolean,
    hasWebResults: boolean,
    needsSearch: boolean,
  ): string {
    const greeting = isFirstTurn
      ? 'Hello! Thanks for reaching out — I appreciate the conversation.'
      : 'That\'s a thoughtful follow-up. Let me reflect on that.'

    const attachmentRef = hasAttachments
      ? '\n\nI\'ve reviewed the attachments you provided. They\'re helpful context, and I\'ve incorporated what I can from them into my thinking.'
      : ''

    const webRef =
      hasWebResults && needsSearch
        ? `\n\nI did some research on this to give you the most accurate information. Here's what I found:\n\n${searchResult.results.map((r) => `• **${r.title}** — ${r.snippet}`).join('\n')}\n\nI'd encourage you to look into these sources directly if you want to dive deeper into any of them.`
        : ''

    const body = needsSearch
      ? `\n\nYou're asking about "${prompt.length > 80 ? prompt.slice(0, 80) + '...' : prompt}" — that's a really interesting area. Let me share some thoughts.\n\nI think the most helpful way to approach this is to consider it from a few different perspectives. There's rarely one single right answer, and the best path forward usually depends on your particular context and goals.\n\nA couple of things I'd keep in mind:\n\n1. Start with a clear understanding of the problem you're solving\n2. Consider the trade-offs involved in different approaches\n3. Think about how your solution will hold up over time\n\nDoes that help? I'm happy to explore any specific aspect in more detail.`
      : `\n\nI'm here to chat! What would you like to talk about? I can help with a wide range of topics.`

    return `${greeting}${attachmentRef}${webRef}${body}\n\n> *This is a simulated response from Anthropic for development purposes.*`
  }

  private googleResponse(
    prompt: string,
    searchResult: SearchResult,
    isFirstTurn: boolean,
    hasAttachments: boolean,
    hasWebResults: boolean,
    needsSearch: boolean,
  ): string {
    const greeting = isFirstTurn
      ? 'Hi there! Happy to help with whatever you\'re working on.'
      : 'Good question! Let me dig into this.'

    const attachmentRef = hasAttachments
      ? '\n\nThanks for the attachments — I\'ve had a chance to look through them and they provide useful context for our conversation.'
      : ''

    const webRef =
      hasWebResults && needsSearch
        ? `\n\nI searched for the latest information on this topic. Here are some relevant results:\n\n${searchResult.results.map((r) => `📌 **${r.title}**\n   ${r.snippet}`).join('\n\n')}\n\nThese should give you a good overview. Let me know if you want me to dig deeper into any of them.`
        : ''

    const body = needsSearch
      ? `\n\nRegarding your question about "${prompt.length > 80 ? prompt.slice(0, 80) + '...' : prompt}" — this is a great topic. Let me break it down.\n\nThe key thing to understand is the context around it. There are several important factors to consider:\n\n• First, think about what success looks like for you specifically\n• Then work through the available options and their trade-offs\n• Finally, consider how to implement your chosen approach effectively\n\nI've found that taking a structured approach usually leads to the best outcomes. Would you like me to go into more detail on any particular aspect?`
      : `\n\nWhat can I help you with today? I'm ready to assist with questions, research, creative projects, or just casual conversation.`

    return `${greeting}${attachmentRef}${webRef}${body}\n\n> *This is a simulated response from Google for development purposes.*`
  }

  private defaultGeneralResponse(prompt: string): string {
    const preview = prompt.length > 80 ? prompt.slice(0, 80) + '...' : prompt
    return `Hi! Thanks for your message about "${preview}".\n\nThat's an interesting topic. Here are my thoughts on it — I think the best approach really depends on what you're looking to achieve. There's a lot of depth here, so feel free to ask follow-up questions about any specific aspect.\n\nLet me know if you'd like me to explore this further!\n\n> *This is a simulated placeholder response for development.*`
  }

  private commissioningResponse(
    provider: string,
    prompt: string,
    promptPreview: string,
    isFirstTurn: boolean,
    hasAttachments: boolean,
  ): string[] {
    const attachmentNote = hasAttachments
      ? '\n\n**Attachment Analysis**\n\nI have reviewed the attached documents and incorporated the findings into the analysis below. The key data points from the attachments have been factored into the technical assessment.'
      : ''

    const responses: Record<string, string> = {
      OPENAI: `${isFirstTurn ? 'Welcome to the commissioning investigation. I\'ll help you analyze this from an engineering perspective.' : 'Good follow-up. Let me analyze this from a commissioning standpoint.'}

Regarding "${promptPreview}", here is my engineering analysis:${attachmentNote}

**System Assessment**\n\nFrom a commissioning perspective, this involves several critical subsystems that need to be carefully coordinated. The key is to approach this systematically — verifying each permissive, interlock, and protection device before proceeding to the next stage.

**Technical Considerations**\n\nThe main technical factors to account for include:\n- Proper sequencing of pre-commissioning activities before startup\n- Verification of all loop checks and calibration certificates\n- Ensuring vendor technical support is available for critical milestones\n- Confirming that all temporary systems (steam blow screens, strainers, jumpers) are properly installed and documented

**Risk Mitigation**\n\nTo manage risk effectively, I recommend:\n- Hold point reviews before each major transition (purge, ignition, synchronizing)\n- Clear pass/fail criteria for each test procedure\n- Document all exceptions and deviations with disposition\n- Maintain a real-time punch list by system, not by discipline

**Recommended Path Forward**\n\nProceed with systematic system-by-system turnover, ensuring all documentation is current and all outstanding items have a clear path to closure. This approach minimizes rework and maintains commissioning schedule integrity.

> *This is a simulated response from OpenAI for development purposes.*`,
      ANTHROPIC: `${isFirstTurn ? 'Thank you for bringing this to the commissioning investigation. Let me work through this methodically.' : 'Let me build on what we\'ve discussed and examine this further.'}

You're asking about "${promptPreview}" — let me provide a thorough commissioning analysis.${attachmentNote}

**Initial Observations**\n\nAfter carefully considering your query, I believe the most important factor is ensuring we maintain a systems-based approach to commissioning. Too often, commissioning activities are organized by discipline rather than by system, which creates gaps in verification and increases the risk of something being missed.

**Critical Path Analysis**\n\nThe following items should be on your critical path:\n1. Complete all protection device validation before any energized work\n2. Verify DCS/PLC logic matches the approved cause-and-effect matrix\n3. Confirm all field instrument loop checks are signed off by system\n4. Ensure mechanical completion certificates align with the commissioning scope

**Safety and Risk**\n\nSafety must remain the primary driver. Key risks to address:\n- Proceeding with incomplete loop checks can mask underlying issues\n- Unvalidated protection relays create personnel safety risks during first fire\n- Inadequate temporary system verification can lead to equipment damage\n- Missing or outdated documentation causes rework and schedule slips

**Next Steps**\n\nLet me suggest a practical path forward. I'd recommend reviewing the system demarcation boundaries, confirming all pre-commissioning walk-downs are complete, and then proceeding with a structured sequence of tests with clear acceptance criteria for each step.

> *This is a simulated response from Anthropic for development purposes.*`,
      GOOGLE: `${isFirstTurn ? 'Let me help with your commissioning investigation. I\'ll provide practical engineering guidance.' : 'Let me continue the analysis with some additional engineering perspective.'}

For your query regarding "${promptPreview}", here is my commissioning engineering assessment:${attachmentNote}

**Engineering Review**\n\nThis needs to be evaluated against standard commissioning practices (NFPA, IEEE, and project-specific procedures). The fundamental requirement is that all systems are verified as installed per design and function as intended before being placed into service.

**Key Technical Requirements**\n\nFrom a practical engineering standpoint:\n\n✅ Verify all permissive and interlock logic before any equipment operation\n✅ Complete cable insulation resistance testing and megger readings\n✅ Confirm protection relay settings match the approved coordination study\n✅ Validate all emergency stop circuits function correctly under simulated conditions\n✅ Ensure all pressure tests (hydrostatic, pneumatic) are witnessed and documented

**Schedule and Coordination**\n\nPractical timeline considerations:\n- Pre-commissioning activities typically take 2-4 weeks per major system\n- System-by-system turnover should be planned with 2-week look-ahead schedules\n- Vendor attendance should be confirmed at least 2 weeks in advance for critical milestones\n- Parallel work streams are possible where systems are truly independent

**Documentation Requirements**\n\nEnsure the following documentation is current:\n- System completion certificates (mechanical, electrical, I&C)\n- Test results and calibration records\n- Punch list items with clear responsibility and target dates\n- Signed turnover packages for each system boundary

> *This is a simulated response from Google for development purposes.*`,
    }

    const text =
      responses[provider] ??
      `**${provider} Commissioning Analysis**\n\nAnalyzing your query about "${promptPreview}"...\n\nFrom a commissioning engineering perspective, this requires careful evaluation against project specifications and industry standards. I recommend a systematic approach: start with document review, proceed to field verification, and then move to energized testing with clear hold points at each stage.\n\nLet me know if you need more specific guidance on any aspect.\n\n> *This is a simulated placeholder response for development.*`

    return text.split(/(?=\n)/)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
