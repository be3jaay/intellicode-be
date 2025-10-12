import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class ApproveCourseDto {
  @ApiProperty({ 
    enum: ['approved', 'rejected'], 
    description: 'Approval decision' 
  })
  @IsEnum(['approved', 'rejected'])
  @IsNotEmpty()
  status: 'approved' | 'rejected';

  @ApiProperty({ 
    description: 'Admin feedback/notes', 
    required: false 
  })
  @IsString()
  @IsOptional()
  admin_notes?: string;
}

export class PendingCoursesQueryDto {
  @ApiProperty({ required: false, description: 'Number of records to skip' })
  offset?: number = 0;

  @ApiProperty({ required: false, description: 'Number of records to take' })
  limit?: number = 10;

  @ApiProperty({ 
    required: false, 
    enum: ['waiting_for_approval', 'approved', 'rejected'],
    description: 'Filter by course status' 
  })
  status?: string;
}
