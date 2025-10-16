import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsEnum, IsUUID, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
  SUSPENDED = 'suspended'
}

export class StudentDto {
  @ApiProperty({ description: 'Student ID' })
  id: string;

  @ApiProperty({ description: 'Student first name' })
  first_name: string;

  @ApiProperty({ description: 'Student last name' })
  last_name: string;

  @ApiProperty({ description: 'Student email' })
  email: string;

  @ApiPropertyOptional({ description: 'Student number' })
  student_number?: string;

  @ApiPropertyOptional({ description: 'Student section' })
  section?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  profile_picture?: string;

  @ApiProperty({ description: 'Enrollment status' })
  enrollment_status: EnrollmentStatus;

  @ApiProperty({ description: 'Enrollment date' })
  enrolled_at: Date;

  @ApiProperty({ description: 'Course progress percentage' })
  progress_percentage: number;

  @ApiProperty({ description: 'Total assignments completed' })
  assignments_completed: number;

  @ApiProperty({ description: 'Total assignments assigned' })
  assignments_total: number;

  @ApiProperty({ description: 'Last activity date' })
  last_activity?: Date;
}

export class CourseStudentsQueryDto {
  @ApiPropertyOptional({ description: 'Number of records to skip', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Number of records to take', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: EnrollmentStatus, description: 'Filter by enrollment status' })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiPropertyOptional({ description: 'Search by student name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by section' })
  @IsOptional()
  @IsString()
  section?: string;
}

export class PaginatedStudentsResponseDto {
  @ApiProperty({ description: 'Array of students', type: [StudentDto] })
  data: StudentDto[];

  @ApiProperty({ description: 'Total number of students' })
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

export class UpdateEnrollmentStatusDto {
  @ApiProperty({ enum: EnrollmentStatus, description: 'New enrollment status' })
  @IsEnum(EnrollmentStatus)
  status: EnrollmentStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class EnrollmentStatusResponseDto {
  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Student name' })
  student_name: string;

  @ApiProperty({ description: 'Student email' })
  student_email: string;

  @ApiProperty({ description: 'Previous status' })
  previous_status: EnrollmentStatus;

  @ApiProperty({ description: 'New status' })
  new_status: EnrollmentStatus;

  @ApiProperty({ description: 'Status change date' })
  updated_at: Date;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  reason?: string;
}

export class CourseProgressDto {
  @ApiProperty({ description: 'Course ID' })
  course_id: string;

  @ApiProperty({ description: 'Total students enrolled' })
  total_students: number;

  @ApiProperty({ description: 'Active students' })
  active_students: number;

  @ApiProperty({ description: 'Completed students' })
  completed_students: number;

  @ApiProperty({ description: 'Dropped students' })
  dropped_students: number;

  @ApiProperty({ description: 'Suspended students' })
  suspended_students: number;

  @ApiProperty({ description: 'Average progress percentage' })
  average_progress: number;

  @ApiProperty({ description: 'Total assignments' })
  total_assignments: number;

  @ApiProperty({ description: 'Average completion rate' })
  average_completion_rate: number;
}

