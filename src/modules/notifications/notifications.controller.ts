import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  NotificationResponseDto,
  NotificationQueryDto,
  PaginatedNotificationsResponseDto,
  MarkAllAsReadResponseDto,
  NotificationType,
} from './dto/notification.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notifications retrieved successfully',
    type: PaginatedNotificationsResponseDto,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return',
  })
  @ApiQuery({
    name: 'is_read',
    required: false,
    type: Boolean,
    description: 'Filter by read status',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: NotificationType,
    description: 'Filter by notification type',
  })
  async getMyNotifications(@Query() query: NotificationQueryDto, @CurrentUser() user: RequestUser) {
    return await this.notificationsService.getMyNotifications(user.id, query);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(@CurrentUser() user: RequestUser) {
    return await this.notificationsService.getUnreadCount(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification retrieved successfully',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Notification not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have access to this notification',
  })
  async getNotificationById(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return await this.notificationsService.getNotificationById(id, user.id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification marked as read',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Notification not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have access to this notification',
  })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return await this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('mark-all-read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All notifications marked as read',
    type: MarkAllAsReadResponseDto,
  })
  async markAllAsRead(@CurrentUser() user: RequestUser) {
    return await this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notification deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Notification not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have access to this notification',
  })
  @HttpCode(HttpStatus.OK)
  async deleteNotification(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return await this.notificationsService.deleteNotification(id, user.id);
  }
}



