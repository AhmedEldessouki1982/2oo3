import { IsOptional, IsString, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateConversationDto {
  @ApiProperty({ example: 'GT-1 vibration analysis investigation' })
  @IsString()
  @MinLength(1)
  title!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contextSummary?: string
}
