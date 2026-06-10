import { IsArray, IsOptional, IsString, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SendMessageDto {
  @ApiProperty({ example: 'What are the risks of proceeding with GT-1 first fire while HRSG steam blow remains open?' })
  @IsString()
  @MinLength(1)
  content!: string

  @ApiPropertyOptional({ example: ['clx...'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[]
}
