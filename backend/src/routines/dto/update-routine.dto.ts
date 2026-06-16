import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateRoutineDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string

  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ enum: ['HOURLY', 'DAILY'] })
  @IsEnum(['HOURLY', 'DAILY'] as const)
  @IsOptional()
  schedule?: 'HOURLY' | 'DAILY'

  @ApiPropertyOptional()
  @IsOptional()
  active?: boolean
}
