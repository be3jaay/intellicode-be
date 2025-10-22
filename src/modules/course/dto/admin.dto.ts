import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveCourseDto {
  @ApiProperty({
    enum: ['approved', 'rejected'],
    description: 'Approval decision',
  })
  @IsEnum(['approved', 'rejected'])
  @IsNotEmpty()
  status: 'approved' | 'rejected';

  @ApiProperty({
    description: 'Admin feedback/notes',
    required: false,
  })
  @IsString()
  @IsOptional()
  admin_notes?: string;
}

export class PendingCoursesQueryDto {
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

  @ApiProperty({
    required: false,
    enum: ['waiting_for_approval', 'approved', 'rejected'],
    description: 'Filter by course status',
  })
  @IsOptional()
  status?: string;
}

export class ResubmitCourseResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Updated course status' })
  status: string;

  @ApiProperty({ description: 'Course ID' })
  course_id: string;

  @ApiProperty({ description: 'Course title' })
  course_title: string;
}
