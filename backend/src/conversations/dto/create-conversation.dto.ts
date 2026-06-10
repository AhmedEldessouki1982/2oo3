import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ConversationType } from '@prisma/client'

export class CreateConversationDto {
  @ApiProperty({ example: 'GT-1 vibration analysis investigation' })
  @IsString()
  @MinLength(1)
  title!: string

  @ApiPropertyOptional({ enum: ConversationType, default: 'COMMISSIONING' })
  @IsEnum(ConversationType)
  @IsOptional()
  type?: ConversationType

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contextSummary?: string
}
