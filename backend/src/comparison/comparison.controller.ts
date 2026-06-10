import { Controller, Get, Param } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { ComparisonService } from './comparison.service'

@ApiBearerAuth()
@ApiTags('Comparison')
@Controller('comparison')
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  @Get(':messageId')
  findByMessage(@Param('messageId') messageId: string) {
    return this.comparisonService.getComparison(messageId)
  }
}
