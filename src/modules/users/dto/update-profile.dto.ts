import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'John',
    description: 'User first name',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    example: 'Michael',
    description: 'User middle name',
    required: false,
  })
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

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
}
