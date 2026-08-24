import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(1, { message: 'What should we call you?' })
  @MaxLength(80)
  name!: string;

  @IsEmail({}, { message: 'That does not look like an email address.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Passwords are at least eight characters.' })
  @MaxLength(128)
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'That does not look like an email address.' })
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'That does not look like an email address.' })
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
