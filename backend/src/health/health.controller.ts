import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger'

import { HealthService } from './health.service'

@ApiTags('Health')
@Controller('healthz')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ description: 'Application readiness status.' })
  @ApiServiceUnavailableResponse({ description: 'Database readiness failed.' })
  check() {
    return this.healthService.check()
  }
}
