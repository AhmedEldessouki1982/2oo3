import { IsEnum, IsString, MinLength } from 'class-validator'

export class CreateProviderCredentialDto {
  @IsEnum(['OPENAI', 'ANTHROPIC', 'GOOGLE'])
  provider!: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE'

  @IsString()
  @MinLength(1)
  apiKey!: string
}
