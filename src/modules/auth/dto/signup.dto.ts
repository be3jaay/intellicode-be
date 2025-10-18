import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class SignupDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'User password (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  @IsString()
  firstName: string;
  @ApiProperty({
    example: 'Doe',
    description: 'User middle name',
    required: false,
  })
  @IsString()
  @IsOptional()
  middleName: string | null;
  @IsString()
  @ApiProperty({
    example: 'Last',
    description: 'User last name',
  })
  @IsString()
  @IsOptional()
  lastName: string;

  @ApiProperty({
    example: '2021-00001',
    description: 'Student number (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  studentNumber?: string;

  @ApiProperty({
    example: 'BSCS 3A',
    description: 'Section (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  section?: string;

  @ApiProperty({
    example: 'student',
    description: 'User type - student or teacher',
    enum: UserRole,
  })
  @IsEnum(UserRole)
  userType: UserRole;
}

