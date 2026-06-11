// streaming.service.ts
import { Injectable } from '@nestjs/common';
import { Anthropic } from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StreamingService {
  private encryptionKey: Buffer;

  constructor(private prisma: PrismaService) {
    // Use ENCRYPTION_KEY from environment for decryption
    this.encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }

  /**
   * Decrypt token stored in database
   */
  private decryptToken(encryptedToken: string): string {
    try {
      const parts = encryptedToken.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const cipher = Buffer.from(parts[1], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
      let decrypted = decipher.update(cipher);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Get user's AI provider tokens (decrypted)
   */
  async getUserTokens(userId: string): Promise<{
    anthropic?: string;
    openai?: string;
    google?: string;
  }> {
    const userTokens = await this.prisma.userAIToken.findMany({
      where: { userId },
    });

    const decryptedTokens = {
      anthropic: undefined,
      openai: undefined,
      google: undefined,
    };

    for (const token of userTokens) {
      try {
        const decrypted = this.decryptToken(token.encryptedToken);
        decryptedTokens[token.provider] = decrypted;
      } catch (error) {
        console.error(`Failed to decrypt ${token.provider} token:`, error);
      }
    }

    return decryptedTokens;
  }

  /**
   * Stream from Claude (Anthropic) using user's token
   * Returns EventEmitter that emits 'data' events with tokens
   */
  async streamClaude(
    prompt: string,
    userToken: string,
  ): Promise<EventEmitter> {
    const emitter = new EventEmitter();

    try {
      const client = new Anthropic({
        apiKey: userToken, // User's token, not backend key
      });

      // Use streaming API
      (async () => {
        try {
          const stream = client.messages.stream({
            model: 'claude-opus-4-20250514',
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
            system: `You are Claude, made by Anthropic. You are helpful, harmless, and honest.
- Provide thoughtful, nuanced responses with appropriate caveats
- Acknowledge uncertainty when unsure
- Explain reasoning step-by-step when appropriate
- Be direct and clear, preferring conciseness`,
          });

          // Emit each token as it arrives
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta') {
              const delta = chunk.delta as any;
              if (delta.text) {
                emitter.emit('data', delta.text);
              }
            }
          }

          emitter.emit('end');
        } catch (error) {
          console.error('Claude streaming error:', error);
          emitter.emit('error', error);
        }
      })();
    } catch (error) {
      console.error('Claude setup error:', error);
      emitter.emit('error', error);
    }

    return emitter;
  }

  /**
   * Stream from OpenAI (ChatGPT) using user's token
   */
  async streamOpenAI(
    prompt: string,
    userToken: string,
  ): Promise<EventEmitter> {
    const emitter = new EventEmitter();

    try {
      const client = new OpenAI({
        apiKey: userToken, // User's token, not backend key
      });

      (async () => {
        try {
          const stream = await client.chat.completions.create({
            model: 'gpt-4-turbo',
            max_tokens: 2048,
            temperature: 0.7,
            stream: true,
            system: `You are ChatGPT (GPT-4), made by OpenAI. You are helpful, creative, and precise.
- Provide comprehensive, well-organized responses
- Use bullet points and structured formatting
- Explain complex topics in accessible language
- Provide practical examples and use cases`,
            messages: [{ role: 'user', content: prompt }],
          });

          // Emit each chunk's delta text
          for await (const chunk of stream) {
            const choice = chunk.choices[0];
            if (choice.delta?.content) {
              emitter.emit('data', choice.delta.content);
            }
          }

          emitter.emit('end');
        } catch (error) {
          console.error('OpenAI streaming error:', error);
          emitter.emit('error', error);
        }
      })();
    } catch (error) {
      console.error('OpenAI setup error:', error);
      emitter.emit('error', error);
    }

    return emitter;
  }

  /**
   * Stream from Gemini (Google) using user's token
   * Note: Gemini API may not support true streaming, so we chunk the response
   */
  async streamGemini(
    prompt: string,
    userToken: string,
  ): Promise<EventEmitter> {
    const emitter = new EventEmitter();

    try {
      const client = new GoogleGenerativeAI(userToken);
      const model = client.getGenerativeModel({
        model: 'gemini-1.5-pro',
        systemInstruction: `You are Gemini, made by Google. You are versatile and solution-focused.
- Provide balanced responses considering multiple perspectives
- Use clear formatting and numbered lists
- Think through tradeoffs explicitly
- Synthesize information across domains`,
      });

      (async () => {
        try {
          const result = await model.generateContent(prompt);
          const response = result.response.text();

          // Simulate streaming by emitting chunks (Gemini doesn't have true streaming)
          const chunkSize = 50;
          for (let i = 0; i < response.length; i += chunkSize) {
            emitter.emit('data', response.substring(i, i + chunkSize));
            // Small delay to simulate real streaming
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          emitter.emit('end');
        } catch (error) {
          console.error('Gemini streaming error:', error);
          emitter.emit('error', error);
        }
      })();
    } catch (error) {
      console.error('Gemini setup error:', error);
      emitter.emit('error', error);
    }

    return emitter;
  }

  /**
   * Complete (non-streaming) calls for batch mode
   */
  async callClaudeComplete(
    prompt: string,
    userToken: string,
  ): Promise<string> {
    const client = new Anthropic({ apiKey: userToken });
    const response = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('');
  }

  async callOpenAIComplete(
    prompt: string,
    userToken: string,
  ): Promise<string> {
    const client = new OpenAI({ apiKey: userToken });
    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices.map((choice) => choice.message.content).join('');
  }

  async callGeminiComplete(
    prompt: string,
    userToken: string,
  ): Promise<string> {
    const client = new GoogleGenerativeAI(userToken);
    const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
