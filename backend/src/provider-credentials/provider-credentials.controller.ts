import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { CreateProviderCredentialDto } from './dto/create-provider-credential.dto'
import { UpdateProviderCredentialDto } from './dto/update-provider-credential.dto'
import { ProviderCredentialsService } from './provider-credentials.service'

@ApiBearerAuth()
@ApiTags('Provider Credentials')
@Controller('credentials')
export class ProviderCredentialsController {
  constructor(private readonly service: ProviderCredentialsService) {}

  @Get()
  async list(@CurrentUser('sub') userId: string) {
    return this.service.findAll(userId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateProviderCredentialDto,
  ) {
    return this.service.create(userId, dto.provider, dto.apiKey)
  }

  @Put(':provider')
  async update(
    @CurrentUser('sub') userId: string,
    @Param('provider') provider: string,
    @Body() dto: UpdateProviderCredentialDto,
  ) {
    return this.service.update(userId, provider.toUpperCase(), dto.apiKey)
  }

  @Patch(':provider/toggle')
  async toggle(
    @CurrentUser('sub') userId: string,
    @Param('provider') provider: string,
  ) {
    return this.service.toggle(userId, provider.toUpperCase())
  }

  @Delete(':provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('provider') provider: string,
  ) {
    return this.service.remove(userId, provider.toUpperCase())
  }

  @Get(':provider/health')
  async health(
    @CurrentUser('sub') userId: string,
    @Param('provider') provider: string,
  ) {
    return this.service.checkHealth(userId, provider.toUpperCase())
  }
}
