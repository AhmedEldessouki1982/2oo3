import { ApiProperty } from '@nestjs/swagger'

export class ConversationSummaryDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  title!: string

  @ApiProperty()
  status!: string

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
  status!: string

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string

  @ApiProperty({ type: [MessageBriefDto] })
  messages!: MessageBriefDto[]
}
