// streaming.controller.ts
import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { StreamingService } from './streaming.service';
import { ComparisonService } from './comparison.service';

interface AIResponseChunk {
  source: 'claude' | 'chatgpt' | 'gemini';
  token: string;
  isComplete?: boolean;
}

@Controller('api/compare')
@UseGuards(JwtAuthGuard)
export class StreamingController {
  constructor(
    private streamingService: StreamingService,
    private comparisonService: ComparisonService,
  ) {}

  /**
   * Stream responses from all three AIs in real-time via Server-Sent Events (SSE)
   * Endpoint: GET /api/compare/stream?prompt="Your question"
   * Returns: text/event-stream with real-time tokens from each AI
   */
  @Get('stream')
  async streamComparison(
    @Query('prompt') prompt: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException('Prompt cannot be empty');
    }

    const userId = req.user.id;

    // Set response headers for Server-Sent Events (streaming)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      // Get user's encrypted tokens for all three AI providers
      const userTokens = await this.streamingService.getUserTokens(userId);

      if (!userTokens.anthropic || !userTokens.openai || !userTokens.google) {
        res.write(
          `data: ${JSON.stringify({
            error: 'Missing API authentication. Please connect all three AI providers.',
          })}\n\n`,
        );
        res.end();
        return;
      }

      // Start all three AI streams in parallel
      const responses = {
        claude: '',
        chatgpt: '',
        gemini: '',
      };

      // Helper function to send SSE chunk to frontend
      const sendChunk = (chunk: AIResponseChunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      };

      // Start streaming from all three AIs simultaneously
      const [claudeStream, openaiStream, geminiStream] = await Promise.all([
        this.streamingService.streamClaude(prompt, userTokens.anthropic),
        this.streamingService.streamOpenAI(prompt, userTokens.openai),
        this.streamingService.streamGemini(prompt, userTokens.google),
      ]);

      // Process Claude stream
      claudeStream.on('data', (chunk: string) => {
        responses.claude += chunk;
        sendChunk({
          source: 'claude',
          token: chunk,
        });
      });

      claudeStream.on('end', () => {
        sendChunk({
          source: 'claude',
          token: '',
          isComplete: true,
        });
      });

      claudeStream.on('error', (error) => {
        console.error('Claude stream error:', error);
        sendChunk({
          source: 'claude',
          token: `[Error: ${error.message}]`,
          isComplete: true,
        });
      });

      // Process OpenAI stream
      openaiStream.on('data', (chunk: string) => {
        responses.chatgpt += chunk;
        sendChunk({
          source: 'chatgpt',
          token: chunk,
        });
      });

      openaiStream.on('end', () => {
        sendChunk({
          source: 'chatgpt',
          token: '',
          isComplete: true,
        });
      });

      openaiStream.on('error', (error) => {
        console.error('OpenAI stream error:', error);
        sendChunk({
          source: 'chatgpt',
          token: `[Error: ${error.message}]`,
          isComplete: true,
        });
      });

      // Process Gemini stream
      geminiStream.on('data', (chunk: string) => {
        responses.gemini += chunk;
        sendChunk({
          source: 'gemini',
          token: chunk,
        });
      });

      geminiStream.on('end', () => {
        sendChunk({
          source: 'gemini',
          token: '',
          isComplete: true,
        });

        // After all three finish, run comparison analysis
        setTimeout(async () => {
          try {
            const comparison =
              await this.comparisonService.analyzeResponses(responses);

            sendChunk({
              source: 'comparison',
              token: JSON.stringify(comparison),
              isComplete: true,
            });

            // Save to database
            await this.comparisonService.saveComparison(
              userId,
              prompt,
              responses,
              comparison,
            );
          } catch (error) {
            console.error('Comparison error:', error);
            sendChunk({
              source: 'comparison',
              token: `[Comparison error: ${error.message}]`,
              isComplete: true,
            });
          } finally {
            res.end();
          }
        }, 100); // Small delay to ensure all three are complete
      });

      geminiStream.on('error', (error) => {
        console.error('Gemini stream error:', error);
        sendChunk({
          source: 'gemini',
          token: `[Error: ${error.message}]`,
          isComplete: true,
        });
      });

      // Cleanup on client disconnect
      req.on('close', () => {
        claudeStream.destroy();
        openaiStream.destroy();
        geminiStream.destroy();
      });
    } catch (error) {
      console.error('Streaming error:', error);
      res.write(
        `data: ${JSON.stringify({
          error: error.message,
        })}\n\n`,
      );
      res.end();
    }
  }

  /**
   * Alternative: Non-streaming endpoint if you want to compare without real-time updates
   * Waits for all three to complete, then returns comparison analysis
   */
  @Get('compare-batch')
  async compareBatch(@Query('prompt') prompt: string, @Req() req: any) {
    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException('Prompt cannot be empty');
    }

    const userId = req.user.id;

    try {
      const userTokens = await this.streamingService.getUserTokens(userId);

      // Call all three in parallel (no streaming)
      const [claudeResponse, openaiResponse, geminiResponse] =
        await Promise.all([
          this.streamingService.callClaudeComplete(prompt, userTokens.anthropic),
          this.streamingService.callOpenAIComplete(prompt, userTokens.openai),
          this.streamingService.callGeminiComplete(prompt, userTokens.google),
        ]);

      const responses = {
        claude: claudeResponse,
        chatgpt: openaiResponse,
        gemini: geminiResponse,
      };

      // Run comparison
      const comparison =
        await this.comparisonService.analyzeResponses(responses);

      // Save to database
      await this.comparisonService.saveComparison(
        userId,
        prompt,
        responses,
        comparison,
      );

      return {
        success: true,
        data: {
          responses,
          comparison,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      console.error('Batch compare error:', error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get past comparisons for authenticated user
   * Endpoint: GET /api/compare/history
   */
  @Get('history')
  async getHistory(@Req() req: any) {
    const userId = req.user.id;
    const comparisons =
      await this.comparisonService.getUserComparisons(userId);

    return {
      success: true,
      data: comparisons,
    };
  }
}
