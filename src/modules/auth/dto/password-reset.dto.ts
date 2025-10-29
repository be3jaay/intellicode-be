import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ 
    description: 'Email address to send OTP',
    example: 'user@example.com'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({ 
    description: 'Email address',
    example: 'user@example.com'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: '6-digit OTP code',
    example: '123456'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP code must be exactly 6 digits' })
  otp_code: string;
}

export class ResetPasswordDto {
  @ApiProperty({ 
    description: 'Reset token received after OTP verification',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  @IsNotEmpty()
  reset_token: string;

  @ApiProperty({ 
    description: 'New password (min 8 characters, must include uppercase, lowercase, number, and special character)',
    example: 'NewSecureP@ss123'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
  )
  new_password: string;
}

export class VerifyOtpResponseDto {
  @ApiProperty({ description: 'Temporary reset token' })
  reset_token: string;

  @ApiProperty({ description: 'Token expiry time in seconds' })
  expires_in: number;

  @ApiProperty({ description: 'Success message' })
  message: string;
}

