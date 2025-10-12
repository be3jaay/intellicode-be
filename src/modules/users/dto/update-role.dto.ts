import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../../auth/interfaces/user.interface';

export class UpdateRoleDto {
  @ApiProperty({
    example: 'teacher',
    description: 'New role for the user',
    enum: UserRole,
  })
  @IsEnum(UserRole)
  role: UserRole;
}

