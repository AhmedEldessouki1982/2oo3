import { IsEnum, IsString, MinLength } from 'class-validator'

export class CreateProviderCredentialDto {
  @IsEnum(['OPENAI', 'ANTHROPIC', 'GOOGLE', 'BIG_PICKLE'])
  provider!: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'BIG_PICKLE'

  @IsString()
  @MinLength(1)
  apiKey!: string
}
