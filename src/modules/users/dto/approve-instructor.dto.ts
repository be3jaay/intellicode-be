import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ApproveInstructorDto {
  @ApiProperty({
    example: true,
    description: 'Whether to approve or reject the instructor',
  })
  @IsBoolean()
  isApproved: boolean;

  @ApiProperty({
    example: 'Instructor credentials verified',
    description: 'Reason for approval/rejection (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
