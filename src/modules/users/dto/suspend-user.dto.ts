import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SuspendUserDto {
  @ApiProperty({
    example: true,
    description: 'Whether to suspend or unsuspend the user',
  })
  @IsBoolean()
  isSuspended: boolean;

  @ApiProperty({
    example: 'Violation of terms of service',
    description: 'Reason for suspension (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

