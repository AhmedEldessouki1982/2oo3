import { IsEnum, IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateRoutineDto {
  @ApiProperty({ example: 'Morning commissioning report' })
  @IsString()
  @MinLength(1)
  name!: string

  @ApiProperty({ example: 'Summarize today\'s commissioning progress for GT-1 and HRSG steam blow schedule' })
  @IsString()
  @MinLength(1)
  description!: string

  @ApiProperty({ enum: ['HOURLY', 'DAILY'], example: 'DAILY' })
  @IsEnum(['HOURLY', 'DAILY'] as const)
  schedule!: 'HOURLY' | 'DAILY'
}
