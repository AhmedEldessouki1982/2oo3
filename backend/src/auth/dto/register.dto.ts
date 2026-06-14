import { IsEmail, IsString, Matches, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({ example: 'engineer@example.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'SecurePass1!' })
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[a-z])/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/(?=.*\d)/, { message: 'Password must contain at least one number' })
  @Matches(/(?=.*[!@#$%^&*])/, {
    message: 'Password must contain at least one special character',
  })
  password!: string

  @ApiProperty({ example: 'Nadia Hassan' })
  @IsString()
  @MinLength(2)
  displayName!: string
}
