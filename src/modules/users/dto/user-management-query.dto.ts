import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean, IsNumberString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { Transform } from 'class-transformer';

export class UserManagementQueryDto {
  @ApiProperty({
    example: 'student',
    description: 'Filter by user role',
    enum: UserRole,
    required: false,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({
    example: 'john',
    description: 'Search by name or email',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    example: true,
    description: 'Filter by suspension status',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isSuspended?: boolean;

  @ApiProperty({
    example: 1,
    description: 'Page number for pagination',
    required: false,
  })
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page',
    required: false,
  })
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}
