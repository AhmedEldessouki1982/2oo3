import { IsString, MinLength } from 'class-validator'

export class UpdateProviderCredentialDto {
  @IsString()
  @MinLength(1)
  apiKey!: string
}
