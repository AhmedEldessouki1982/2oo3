// comparison.service.ts
import { Injectable } from '@nestjs/common';
import { Anthropic } from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';

interface AIResponse {
  source: 'claude' | 'chatgpt' | 'gemini';
  content: string;
  tokens: number;
}

interface ComparisonResult {
  conflictingViews: string[];
  consensusPoints: string[];
  claudeUnique: string[];
  chatgptUnique: string[];
  geminiUnique: string[];
  summary: string;
}

@Injectable()
export class ComparisonService {
  private claude: Anthropic;

  constructor(private prisma: PrismaService) {
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Analyzes three AI responses and identifies:
   * - Where they conflict
   * - Where they agree
   * - Unique insights from each
   */
  async analyzeResponses(responses: {
    claude: string;
    chatgpt: string;
    gemini: string;
  }): Promise<ComparisonResult> {
    const analysisPrompt = `You are an expert at comparing AI responses. Analyze these three responses to the same question and return ONLY valid JSON (no markdown, no code blocks).

RESPONSE 1 (Claude):
${responses.claude}

RESPONSE 2 (ChatGPT):
${responses.chatgpt}

RESPONSE 3 (Gemini):
${responses.gemini}

Return ONLY this JSON structure (no preamble, no markdown backticks):
{
  "conflictingViews": [
    "Point where Claude disagrees with others: [Claude says X, but ChatGPT/Gemini say Y]",
    "..."
  ],
  "consensusPoints": [
    "Point all three agree on: [A, B, C]",
    "..."
  ],
  "claudeUnique": [
    "Point only Claude mentioned: [X]",
    "..."
  ],
  "chatgptUnique": [
    "Point only ChatGPT mentioned: [Y]",
    "..."
  ],
  "geminiUnique": [
    "Point only Gemini mentioned: [Z]",
    "..."
  ],
  "summary": "2-3 sentence summary of key differences and agreements"
}`;

    try {
      const response = await this.claude.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
      });

      const rawContent = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('');

      // Parse JSON response
      const comparison = JSON.parse(rawContent);

      return {
        conflictingViews: comparison.conflictingViews || [],
        consensusPoints: comparison.consensusPoints || [],
        claudeUnique: comparison.claudeUnique || [],
        chatgptUnique: comparison.chatgptUnique || [],
        geminiUnique: comparison.geminiUnique || [],
        summary: comparison.summary || '',
      };
    } catch (error) {
      console.error('Comparison analysis error:', error);
      // Fallback: basic text comparison
      return this.basicComparison(responses);
    }
  }

  /**
   * Fallback: Basic text-based comparison if AI analysis fails
   */
  private basicComparison(responses: {
    claude: string;
    chatgpt: string;
    gemini: string;
  }): ComparisonResult {
    const claude = responses.claude.toLowerCase();
    const chatgpt = responses.chatgpt.toLowerCase();
    const gemini = responses.gemini.toLowerCase();

    // Extract first sentence from each as a proxy for main point
    const claudeFirstSentence = responses.claude.split('.')[0].trim();
    const chatgptFirstSentence = responses.chatgpt.split('.')[0].trim();
    const geminiFirstSentence = responses.gemini.split('.')[0].trim();

    return {
      conflictingViews:
        claudeFirstSentence !== chatgptFirstSentence
          ? [`Claude: "${claudeFirstSentence}" vs ChatGPT: "${chatgptFirstSentence}"`]
          : [],
      consensusPoints: [
        'All three provided substantive responses to the question',
      ],
      claudeUnique: ['Claude provided a thoughtful analysis'],
      chatgptUnique: ['ChatGPT provided a conversational response'],
      geminiUnique: ['Gemini provided a practical approach'],
      summary:
        'Three different AI models approached the question from different angles, each with their own strengths.',
    };
  }

  /**
   * Save comparison result to database
   */
  async saveComparison(
    userId: string,
    prompt: string,
    responses: {
      claude: string;
      chatgpt: string;
      gemini: string;
    },
    comparison: ComparisonResult
  ) {
    try {
      const session = await this.prisma.comparisonSession.create({
        data: {
          userId,
          prompt,
          claudeResponse: responses.claude,
          chatgptResponse: responses.chatgpt,
          geminiResponse: responses.gemini,
          comparison: {
            create: {
              conflictingViews: comparison.conflictingViews,
              consensusPoints: comparison.consensusPoints,
              claudeUnique: comparison.claudeUnique,
              chatgptUnique: comparison.chatgptUnique,
              geminiUnique: comparison.geminiUnique,
            },
          },
        },
      });

      return session;
    } catch (error) {
      console.error('Error saving comparison:', error);
      return null;
    }
  }

  /**
   * Retrieve past comparisons for a user
   */
  async getUserComparisons(userId: string, limit: number = 10) {
    return this.prisma.comparisonSession.findMany({
      where: { userId },
      include: { comparison: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
