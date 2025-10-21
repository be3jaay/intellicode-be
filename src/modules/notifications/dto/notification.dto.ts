import { IsString, IsBoolean, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Import Prisma enums to ensure type compatibility
import { NotificationType as PrismaNotificationType, NotificationRelatedType as PrismaNotificationRelatedType } from '@prisma/client';

export const NotificationType = PrismaNotificationType;
export type NotificationType = PrismaNotificationType;

export const NotificationRelatedType = PrismaNotificationRelatedType;
export type NotificationRelatedType = PrismaNotificationRelatedType;

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID to receive the notification' })
  @IsString()
  user_id: string;

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Related entity ID' })
  @IsOptional()
  @IsString()
  related_id?: string;

  @ApiPropertyOptional({ enum: NotificationRelatedType, description: 'Related entity type' })
  @IsOptional()
  @IsEnum(NotificationRelatedType)
  related_type?: NotificationRelatedType;
}

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  is_read: boolean;

  @ApiPropertyOptional()
  related_id?: string;

  @ApiPropertyOptional({ enum: NotificationRelatedType })
  related_type?: NotificationRelatedType;

  @ApiProperty()
  created_at: Date;
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ description: 'Number of records to skip', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Number of records to return', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsOptional()
  @IsBoolean()
  is_read?: boolean;

  @ApiPropertyOptional({ enum: NotificationType, description: 'Filter by notification type' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}

export class PaginatedNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  offset: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  unread_count: number;
}

export class MarkAsReadDto {
  @ApiProperty({ description: 'Notification ID to mark as read' })
  @IsString()
  notification_id: string;
}

export class MarkAllAsReadResponseDto {
  @ApiProperty()
  updated_count: number;

  @ApiProperty()
  message: string;
}


