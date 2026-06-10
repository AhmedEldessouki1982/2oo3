import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { Public } from './auth/decorators/public.decorator'
import { AppService } from './app.service'

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOkResponse({ description: 'API scaffold status.' })
  getRoot() {
    return this.appService.getRoot()
  }
}
