import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { ProviderCredentialsService } from '../provider-credentials/provider-credentials.service'
import { ProviderOrchestratorService } from '../providers/provider-orchestrator.service'
import { RoutinesService } from './routines.service'

@Injectable()
export class RoutineSchedulerService {
  private readonly logger = new Logger(RoutineSchedulerService.name)

  constructor(
    private readonly routinesService: RoutinesService,
    private readonly providerCredentials: ProviderCredentialsService,
    private readonly orchestrator: ProviderOrchestratorService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    const due = await this.routinesService.findDueRoutines()
    if (due.length === 0) return

    this.logger.log(`Executing ${due.length} due routine(s)`)

    for (const routine of due) {
      try {
        const credential = await this.providerCredentials
          .findOneInternal(routine.userId, 'BIG_PICKLE')
          .catch(() => null)

        const apiKey = credential
          ? await this.providerCredentials.decryptKey(credential)
          : null

        let response: string
        if (apiKey) {
          response = await this.orchestrator.callBigPickle(apiKey, routine.description)
        } else {
          response = await this.orchestrator.bigPickleStandalone(routine.description)
        }

        await this.routinesService.recordRun(routine.id, response)
        this.logger.log(`Routine "${routine.name}" executed successfully`)
      } catch (err) {
        this.logger.error(`Routine "${routine.name}" failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
  }
}
