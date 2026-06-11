// ai-orchestrator.service.ts
import { Injectable } from '@nestjs/common';
import { Anthropic } from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from './prisma.service';

interface AIResponse {
  source: 'claude' | 'chatgpt' | 'gemini';
  content: string;
  model: string;
  tokens: number;
  timestamp: Date;
}

interface ChatContext {
  userPrompt: string;
  history: Array<{ role: string; content: string }>;
  documentContext?: string; // For commissioning mode
}

@Injectable()
export class AIOrchestrator {
  private claude: Anthropic;
  private openai: OpenAI;
  private gemini: GoogleGenerativeAI;

  private systemPrompts = {
    claude: `You are Claude, made by Anthropic. You are helpful, harmless, and honest.
- Provide thoughtful, nuanced responses with appropriate caveats
- Acknowledge uncertainty when unsure
- Explain reasoning step-by-step when appropriate
- Be direct and clear, preferring conciseness
- For commissioning/engineering: Provide structured analysis with clear sections and risk considerations`,

    chatgpt: `You are ChatGPT (GPT-4), made by OpenAI. You are helpful, creative, and precise.
- Provide comprehensive, well-organized responses with practical examples
- Use structured formatting (bullets, numbered lists) when helpful
- Explain complex topics in accessible language
- Focus on actionable steps and best practices
- For commissioning/engineering: Emphasize practical implementation, risk mitigation, and resource optimization`,

    gemini: `You are Gemini, made by Google. You are versatile and solution-focused.
- Provide balanced responses considering multiple perspectives
- Use clear formatting and numbered lists
- Think through tradeoffs explicitly
- Synthesize information across domains
- For commissioning/engineering: Analyze schedule impacts, resource requirements, integration points, and cost-benefit`
  };

  constructor(private prisma: PrismaService) {
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }

  /**
   * CHAT MODE: Fork prompt to all three AIs in parallel
   * Returns complete, authentic responses from each
   */
  async generateChatResponse(context: ChatContext): Promise<AIResponse[]> {
    const startTime = Date.now();

    // Build conversation history for each AI
    const claudeMessages = this.buildClaudeMessages(context);
    const openaiMessages = this.buildOpenAIMessages(context);
    const geminiContent = this.buildGeminiContent(context);

    // Execute all three in PARALLEL - this is critical for speed and reliability
    const [claudeResult, openaiResult, geminiResult] = await Promise.allSettled([
      this.callClaude(claudeMessages),
      this.callOpenAI(openaiMessages),
      this.callGemini(geminiContent),
    ]);

    const responses: AIResponse[] = [];

    // Process Claude response
    if (claudeResult.status === 'fulfilled') {
      responses.push({
        source: 'claude',
        content: claudeResult.value.content,
        model: 'claude-opus-4-20250514',
        tokens: claudeResult.value.tokens,
        timestamp: new Date(),
      });
    }

    // Process ChatGPT response
    if (openaiResult.status === 'fulfilled') {
      responses.push({
        source: 'chatgpt',
        content: openaiResult.value.content,
        model: 'gpt-4-turbo',
        tokens: openaiResult.value.tokens,
        timestamp: new Date(),
      });
    }

    // Process Gemini response
    if (geminiResult.status === 'fulfilled') {
      responses.push({
        source: 'gemini',
        content: geminiResult.value.content,
        model: 'gemini-1.5-pro',
        tokens: geminiResult.value.tokens,
        timestamp: new Date(),
      });
    }

    console.log(`All three AI responses completed in ${Date.now() - startTime}ms`);
    return responses;
  }

  /**
   * COMMISSIONING MODE: Upload document, all three analyze it
   * Each bot gets the same document + question but responds authentically
   */
  async analyzeDocument(
    documentContent: string,
    userQuestion: string,
    context: { userId: string; sessionId: string }
  ): Promise<AIResponse[]> {
    const analysisPrompt = `You are analyzing a commissioning document for a project.

DOCUMENT:
${documentContent}

USER QUESTION:
${userQuestion}

Provide your authentic analysis as requested above.`;

    const chatContext: ChatContext = {
      userPrompt: analysisPrompt,
      history: [], // Fresh analysis, no prior context
      documentContext: documentContent,
    };

    return this.generateChatResponse(chatContext);
  }

  // ============ PRIVATE METHODS ============

  /**
   * Call Claude - handles message formatting correctly
   * Returns FULL response, not truncated
   */
  private async callClaude(
    messages: Array<{ role: string; content: string }>
  ): Promise<{ content: string; tokens: number }> {
    try {
      const response = await this.claude.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 2048, // FIX: Ensure high enough for complete responses
        system: this.systemPrompts.claude,
        messages: messages as any, // Type is compatible
      });

      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('\n');

      return {
        content,
        tokens: response.usage.output_tokens,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }

  /**
   * Call OpenAI - handles streaming-like buffering
   */
  private async callOpenAI(
    messages: Array<{ role: string; content: string }>
  ): Promise<{ content: string; tokens: number }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        max_tokens: 2048, // FIX: Ensure complete responses
        temperature: 0.7,
        system: this.systemPrompts.chatgpt,
        messages,
      });

      const content = response.choices
        .map((choice) => choice.message.content)
        .filter(Boolean)
        .join('\n');

      return {
        content,
        tokens: response.usage?.completion_tokens || 0,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Call Gemini - handles its unique API format
   */
  private async callGemini(
    userMessage: string
  ): Promise<{ content: string; tokens: number }> {
    try {
      const model = this.gemini.getGenerativeModel({
        model: 'gemini-1.5-pro',
        systemInstruction: this.systemPrompts.gemini,
      });

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: userMessage }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2048, // FIX: Complete responses
          temperature: 0.7,
        },
      });

      const content =
        result.response.text() || 'No response generated from Gemini';

      return {
        content,
        tokens: result.response.usageMetadata?.outputTokens || 0,
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  /**
   * Format messages for Claude (Uses object format with role)
   */
  private buildClaudeMessages(context: ChatContext) {
    const messages = context.history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    messages.push({
      role: 'user',
      content: context.userPrompt,
    });

    return messages;
  }

  /**
   * Format messages for OpenAI (Standard format)
   */
  private buildOpenAIMessages(context: ChatContext) {
    const messages = context.history.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    messages.push({
      role: 'user',
      content: context.userPrompt,
    });

    return messages;
  }

  /**
   * Format prompt for Gemini (Text-only, no system message in content)
   */
  private buildGeminiContent(context: ChatContext): string {
    let fullPrompt = '';

    // Add prior conversation if exists
    if (context.history.length > 0) {
      fullPrompt = context.history
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      fullPrompt += '\n\n';
    }

    fullPrompt += `User: ${context.userPrompt}`;

    return fullPrompt;
  }
}
