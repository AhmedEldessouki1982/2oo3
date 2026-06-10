import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ConversationSummaryDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  title!: string

  @ApiProperty()
  type!: string

  @ApiProperty()
  status!: string

  @ApiPropertyOptional()
  lastCompressedAt?: string | null

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string
}

export class MessageBriefDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  role!: string

  @ApiProperty()
  content!: string

  @ApiProperty()
  compressed!: boolean

  @ApiProperty()
  createdAt!: string

  @ApiProperty({ type: [Object] })
  providerResponses!: Array<{
    id: string
    provider: string
    status: string
    content: string | null
    errorSummary: string | null
    latencyMs: number | null
  }>
}

export class ConversationDetailDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  title!: string

  @ApiProperty()
  type!: string

  @ApiProperty()
  status!: string

  @ApiPropertyOptional()
  contextSummary?: string | null

  @ApiPropertyOptional()
  lastCompressedAt?: string | null

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string

  @ApiProperty({ type: [MessageBriefDto] })
  messages!: MessageBriefDto[]
}
