// ai-orchestrator.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AIOrchestrator } from './ai-orchestrator.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestDto {
  prompt: string;
  history?: ChatMessageDto[]; // Prior messages in conversation
  sessionId?: string; // Optional: for storing in DB
}

interface DocumentAnalysisDto {
  documentContent: string; // Raw text from uploaded file
  userQuestion: string;
  fileName?: string;
  sessionId?: string;
}

@Controller('api/ai')
@UseGuards(JwtAuthGuard)
export class AIOrchestrationController {
  constructor(private aiOrchestrator: AIOrchestrator) {}

  /**
   * CHAT MODE: Post a prompt, get responses from all three AIs in parallel
   * Returns { claude, chatgpt, gemini } with full, authentic responses
   */
  @Post('chat')
  async chat(@Body() dto: ChatRequestDto, @Req() req: any) {
    if (!dto.prompt || dto.prompt.trim().length === 0) {
      throw new BadRequestException('Prompt cannot be empty');
    }

    try {
      const context = {
        userPrompt: dto.prompt,
        history: dto.history || [],
      };

      const responses = await this.aiOrchestrator.generateChatResponse(context);

      // Format response for frontend
      return {
        success: true,
        data: {
          sessionId: dto.sessionId,
          userPrompt: dto.prompt,
          timestamp: new Date(),
          responses: responses.map((r) => ({
            source: r.source,
            model: r.model,
            response: r.content, // Full, complete response
            tokensUsed: r.tokens,
          })),
        },
      };
    } catch (error) {
      console.error('Chat orchestration error:', error);
      throw new InternalServerErrorException('Failed to generate chat responses');
    }
  }

  /**
   * COMMISSIONING MODE: Upload document, all three AIs analyze it
   * Same endpoint, different purpose - all three respond to the user's question about the doc
   */
  @Post('analyze-document')
  async analyzeDocument(@Body() dto: DocumentAnalysisDto, @Req() req: any) {
    if (!dto.documentContent || dto.documentContent.trim().length === 0) {
      throw new BadRequestException('Document content cannot be empty');
    }

    if (!dto.userQuestion || dto.userQuestion.trim().length === 0) {
      throw new BadRequestException('User question cannot be empty');
    }

    try {
      const responses = await this.aiOrchestrator.analyzeDocument(
        dto.documentContent,
        dto.userQuestion,
        {
          userId: req.user.id,
          sessionId: dto.sessionId || 'new',
        }
      );

      return {
        success: true,
        data: {
          sessionId: dto.sessionId,
          fileName: dto.fileName,
          userQuestion: dto.userQuestion,
          timestamp: new Date(),
          responses: responses.map((r) => ({
            source: r.source,
            model: r.model,
            analysis: r.content, // Full, authentic analysis
            tokensUsed: r.tokens,
          })),
        },
      };
    } catch (error) {
      console.error('Document analysis error:', error);
      throw new InternalServerErrorException(
        'Failed to analyze document with AI models'
      );
    }
  }
}
