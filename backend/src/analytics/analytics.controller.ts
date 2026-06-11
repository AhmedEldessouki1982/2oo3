import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AnalyticsService } from './analytics.service'

class TrackEventDto {
  event!: string
  properties?: Record<string, unknown>
}

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('track')
  @ApiOperation({ summary: 'Track an analytics event' })
  async track(@Req() req: any, @Body() dto: TrackEventDto) {
    await this.analytics.track(dto.event, req.user?.sub, dto.properties)
    return { recorded: true }
  }
}
