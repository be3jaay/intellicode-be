import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class EnrollCourseDto {
  @ApiProperty({
    description: 'Course invite code provided by instructor',
    example: 'ABC123XYZ789',
  })
  @IsString()
  @IsNotEmpty()
  course_invite_code: string;
}

export class EnrollmentResponseDto {
  @ApiProperty({ description: 'Enrollment ID' })
  id: string;

  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Course ID' })
  course_id: string;

  @ApiProperty({ description: 'Enrollment date' })
  enrolled_at: Date;

  @ApiProperty({ description: 'Enrollment status' })
  status: string;

  @ApiProperty({ description: 'Course details' })
  course: {
    id: string;
    title: string;
    description: string;
    category: string;
    thumbnail: string;
    instructor: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

export class StudentEnrollmentsQueryDto {
  @ApiProperty({ required: false, description: 'Number of records to skip' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset?: number = 0;

  @ApiProperty({ required: false, description: 'Number of records to take' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;

  @ApiProperty({ required: false, description: 'Filter by enrollment status' })
  @IsOptional()
  @IsEnum(['active', 'completed', 'dropped', 'suspended'])
  status?: string;
}

export class PaginatedEnrollmentsResponseDto {
  @ApiProperty({ description: 'List of enrollments' })
  data: EnrollmentResponseDto[];

  @ApiProperty({ description: 'Total number of enrollments' })
  total: number;

  @ApiProperty({ description: 'Number of records skipped' })
  offset: number;

  @ApiProperty({ description: 'Number of records taken' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Current page number' })
  currentPage: number;
}
