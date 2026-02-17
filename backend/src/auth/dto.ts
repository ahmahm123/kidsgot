import { IsEmail, IsString } from 'class-validator';

export class RegisterDto { @IsEmail() email!: string; @IsString() password!: string; }
export class LoginDto { @IsEmail() email!: string; @IsString() password!: string; }
export class VerifyEmailDto { @IsString() token!: string; }
