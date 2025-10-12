import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
    required: false,
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    example: '2021-00001',
    description: 'Student number',
    required: false,
  })
  @IsString()
  @IsOptional()
  studentNumber?: string;

  @ApiProperty({
    example: 'BSCS 3A',
    description: 'Section',
    required: false,
  })
  @IsString()
  @IsOptional()
  section?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'Profile picture URL',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  profilePicture?: string;
}

