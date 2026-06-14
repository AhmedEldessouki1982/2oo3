import { Injectable, Logger } from '@nestjs/common'

import { ProviderCredentialsService } from '../provider-credentials/provider-credentials.service'
import { Provider } from '@prisma/client'

export interface StreamChunk {
  source: 'claude' | 'chatgpt' | 'gemini'
  token: string
  done?: boolean
  error?: string
}

type ChunkEmitter = (chunk: StreamChunk) => void

interface ProviderTexts {
  claude: string
  chatgpt: string
  gemini: string
}

@Injectable()
export class CompareStreamingService {
  private readonly logger = new Logger(CompareStreamingService.name)

  constructor(
    private readonly credentialsService: ProviderCredentialsService,
  ) {}

  async streamAll(
    userId: string,
    prompt: string,
    emit: ChunkEmitter,
    abortSignal: AbortSignal,
  ): Promise<ProviderTexts> {
    const credentials = await this.credentialsService.listDecrypted(userId)
    const keyMap = new Map<Provider, string>()
    for (const cred of credentials) {
      if (cred.enabled && cred.apiKey) {
        keyMap.set(cred.provider, cred.apiKey)
      }
    }

    const summaries: ProviderTexts = {
      claude: '',
      chatgpt: '',
      gemini: '',
    }

    const tasks = [
      this.processProvider(
        Provider.ANTHROPIC,
        'claude',
        prompt,
        keyMap.get(Provider.ANTHROPIC) ?? null,
        emit,
        abortSignal,
      ).then((text) => {
        summaries.claude = text
      }),
      this.processProvider(
        Provider.OPENAI,
        'chatgpt',
        prompt,
        keyMap.get(Provider.OPENAI) ?? null,
        emit,
        abortSignal,
      ).then((text) => {
        summaries.chatgpt = text
      }),
      this.processProvider(
        Provider.GOOGLE,
        'gemini',
        prompt,
        keyMap.get(Provider.GOOGLE) ?? null,
        emit,
        abortSignal,
      ).then((text) => {
        summaries.gemini = text
      }),
    ]

    await Promise.all(tasks)

    return summaries
  }

  private async processProvider(
    provider: Provider,
    source: StreamChunk['source'],
    prompt: string,
    apiKey: string | null,
    emit: ChunkEmitter,
    abortSignal: AbortSignal,
  ): Promise<string> {
    if (abortSignal.aborted) return ''

    emit({ source, token: '' })

    try {
      const text = apiKey
        ? await this.invokeProvider(provider, prompt, apiKey, abortSignal)
        : await this.simulatedResponse(provider, prompt)

      await this.emitChunks(source, text, emit, abortSignal)
      emit({ source, token: '', done: true })
      return text
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Provider request failed'
      this.logger.error(`Provider ${provider} failed: ${message}`)
      emit({ source, token: '', error: message, done: true })
      return ''
    }
  }

  private async invokeProvider(
    provider: Provider,
    prompt: string,
    apiKey: string,
    abortSignal: AbortSignal,
  ): Promise<string> {
    switch (provider) {
      case Provider.OPENAI:
        return this.callOpenAI(prompt, apiKey, abortSignal)
      case Provider.ANTHROPIC:
        return this.callAnthropic(prompt, apiKey, abortSignal)
      case Provider.GOOGLE:
        return this.callGemini(prompt, apiKey, abortSignal)
      default:
        return this.simulatedResponse(provider, prompt)
    }
  }

  private async callOpenAI(
    prompt: string,
    apiKey: string,
    abortSignal: AbortSignal,
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: abortSignal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content:
              'You are ChatGPT, providing crisp, well structured answers for commissioning engineers. Keep responses under 500 words.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI returned ${response.status}`)
    }

    const data: any = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      throw new Error('OpenAI response missing content')
    }
    return content
  }

  private async callAnthropic(
    prompt: string,
    apiKey: string,
    abortSignal: AbortSignal,
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: abortSignal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 900,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system:
          'You are Claude providing structured, risk-aware commissioning guidance. Keep answers concise, focus on risks, diagnostics, and recommended actions.',
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic returned ${response.status}`)
    }

    const data: any = await response.json()
    const contentBlocks = data?.content
    if (!Array.isArray(contentBlocks)) {
      throw new Error('Anthropic response missing content blocks')
    }
    return contentBlocks
      .filter(
        (block: any) =>
          block?.type === 'text' && typeof block.text === 'string',
      )
      .map((block: any) => block.text)
      .join('\n')
  }

  private async callGemini(
    prompt: string,
    apiKey: string,
    abortSignal: AbortSignal,
  ): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        signal: abortSignal,
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
          generationConfig: {
            temperature: 0.45,
          },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini returned ${response.status}`)
    }

    const data: any = await response.json()
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text ?? '')
      .join('\n')
    if (!text) {
      throw new Error('Gemini response missing text')
    }
    return text
  }

  private async emitChunks(
    source: StreamChunk['source'],
    text: string,
    emit: ChunkEmitter,
    abortSignal: AbortSignal,
  ) {
    const segments = text.split(/(\s+)/)
    let buffer = ''
    for (const segment of segments) {
      if (abortSignal.aborted) return
      buffer += segment
      if (buffer.length >= 24) {
        emit({ source, token: buffer })
        buffer = ''
        await delay(25)
      }
    }

    if (buffer && !abortSignal.aborted) {
      emit({ source, token: buffer })
    }
  }

  private async simulatedResponse(
    provider: Provider,
    prompt: string,
  ): Promise<string> {
    const preview = prompt.length > 80 ? `${prompt.slice(0, 80)}...` : prompt
    switch (provider) {
      case Provider.OPENAI:
        return `Simulated ChatGPT response for "${preview}". Provide structured guidance, key bullet points, and next steps. This placeholder keeps free tier usable.`
      case Provider.ANTHROPIC:
        return `Simulated Claude analysis for "${preview}" highlighting risks, missing data, and recommended commissioning actions.`
      case Provider.GOOGLE:
        return `Simulated Gemini perspective on "${preview}" focusing on options, alternative approaches, and practical implementation tips.`
      default:
        return `Simulated response for "${preview}".`
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
