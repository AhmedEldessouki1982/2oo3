import { Injectable, Logger } from '@nestjs/common'

import { ComparisonService } from '../comparison/comparison.service'
import { PrismaService } from '../prisma/prisma.service'
import { StreamEventService } from '../streaming/stream-event.service'

interface ProviderDispatch {
  providerResponseId: string
  messageId: string
  conversationId: string
  userId: string
  provider: string
  prompt: string
}

@Injectable()
export class ProviderOrchestratorService {
  private readonly logger = new Logger(ProviderOrchestratorService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly streamEvents: StreamEventService,
    private readonly comparisonService: ComparisonService,
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
        this.logger.error(`Auto-comparison trigger failed for message ${messageId}: ${error instanceof Error ? error.message : 'unknown'}`)
      }
    }
  }

  private async dispatchSingle(dispatch: ProviderDispatch) {
    const { providerResponseId, messageId, conversationId, provider, prompt } = dispatch
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

      const chunks = await this.simulateStream(provider, prompt)

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
      const errorMessage = error instanceof Error ? error.message : 'Provider request failed'

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

  private async simulateStream(
    provider: string,
    prompt: string,
  ): Promise<string[]> {
    const responses: Record<string, string> = {
      OPENAI: `**OpenAI Analysis**\n\nBased on your query about "${prompt.slice(0, 60)}...", here is the analysis:\n\n1. **Key Finding**: This commissioning activity requires careful coordination between mechanical and I&C disciplines.\n\n2. **Risk Assessment**: The primary risk is proceeding without completing all permissive checks and protection device validation. This could lead to equipment damage or personnel safety incidents.\n\n3. **Recommendation**: Hold first fire until all loop checks, protection relay tests, and fuel gas system validation are complete and witnessed.\n\n4. **Timeline Impact**: Estimated 2–3 day delay to close open punch items, after which first fire can proceed safely.\n\n> *This is a simulated response from OpenAI for development purposes.*`,
      ANTHROPIC: `**Anthropic Analysis**\n\nReviewing the commissioning readiness for "${prompt.slice(0, 60)}...", I find:\n\n1. **Critical Path Items**: DCS alarm rationalization must be complete before startup. Vibration probe loop checks are essential for detecting instability during ramp-up.\n\n2. **Hidden Risks**: Unresolved loop checks can mask permissive failures. This creates startup delays and potential equipment damage during purge and ignition sequences.\n\n3. **System Boundary Approach**: Recommend punch list review by system boundary before energization and fuel admission, not by discipline.\n\n4. **Verification**: Confirming HRSG drum level transmitter calibration is uniquely important before steam blow to protect downstream temporary systems.\n\n> *This is a simulated response from Anthropic for development purposes.*`,
      GOOGLE: `**Google Analysis**\n\nFor the query regarding "${prompt.slice(0, 60)}...", my assessment is:\n\n1. **Permissive Conditions**: GT-1 should wait for critical protection relay, fuel gas skid, purge permissive, and E-stop validation before proceeding.\n\n2. **Parallel Work**: HRSG steam blow items can proceed in parallel only if temporary steam path checks are complete and exclusion zones are established.\n\n3. **Documentation**: Ensure turnover packages have proper sign-off by system, not by discipline. Missing electrical acceptance signatures are a common gating item.\n\n4. **Calibration Note**: HRSG drum level transmitter calibration should be confirmed before steam blow to protect downstream temporary systems and ensure accurate drum level control during the blow.\n\n> *This is a simulated response from Google for development purposes.*`,
    }

    const text = responses[provider] ?? `**${provider} Analysis**\n\nSimulated analysis for "${prompt.slice(0, 60)}..."\n\n> *This is a simulated placeholder response for development.*`

    return text.split(/(?=\n)/)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
