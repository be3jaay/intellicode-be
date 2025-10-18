import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
  })
  refreshToken: string;

  @ApiProperty({
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'john.doe@example.com',
      role: 'student',
      firstName: 'John',
      middleName: 'Middle',
      lastName: 'Last',
    },
    description: 'User information',
  })
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
  };

  @ApiProperty({
    example: 'Registration successful. Please wait for admin approval before you can log in.',
    description: 'Message for user (optional)',
    required: false,
  })
  message?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the user requires approval',
    required: false,
  })
  requiresApproval?: boolean;
}

