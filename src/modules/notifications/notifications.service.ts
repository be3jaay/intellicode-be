import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { UuidValidator } from '@/common/utils/uuid.validator';
import {
  CreateNotificationDto,
  NotificationResponseDto,
  NotificationQueryDto,
  PaginatedNotificationsResponseDto,
  NotificationType,
  NotificationRelatedType,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    // Validate UUID
    UuidValidator.validate(createNotificationDto.user_id, 'user ID');

    if (createNotificationDto.related_id) {
      UuidValidator.validate(createNotificationDto.related_id, 'related ID');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: createNotificationDto.user_id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Log notification create attempt (use console.log so it's visible in most environments)
    // eslint-disable-next-line no-console
    console.log('Creating notification for user', createNotificationDto.user_id, 'type', createNotificationDto.type);

    let notification;
    try {
      notification = await this.prisma.notification.create({
        data: {
          id: uuidv4(),
          user_id: createNotificationDto.user_id,
          type: createNotificationDto.type,
          title: createNotificationDto.title,
          message: createNotificationDto.message,
          related_id: createNotificationDto.related_id,
          related_type: createNotificationDto.related_type,
          is_read: false,
        },
      });

      // Confirm created
      // eslint-disable-next-line no-console
      console.log('Notification created', { id: notification.id, user_id: notification.user_id, type: notification.type });
    } catch (err) {
      // Log error with context to help debugging, then rethrow so callers can decide how to handle it
      // eslint-disable-next-line no-console
      console.error('Failed to create notification', {
        error: err?.message || err,
        payload: createNotificationDto,
      });
      throw err;
    }

    return this.formatNotificationResponse(notification);
  }

  async createBulkNotifications(
    notifications: CreateNotificationDto[],
  ): Promise<NotificationResponseDto[]> {
    const createdNotifications = await Promise.all(
      notifications.map((notificationDto) => this.createNotification(notificationDto)),
    );

    return createdNotifications;
  }

  async getMyNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    UuidValidator.validate(userId, 'user ID');

    const offset = parseInt(query.offset?.toString() || '0', 10);
    const limit = parseInt(query.limit?.toString() || '10', 10);

    const where: any = { user_id: userId };

    if (query.is_read !== undefined) {
      where.is_read = query.is_read;
    }

    if (query.type) {
      where.type = query.type;
    }

    const total = await this.prisma.notification.count({ where });

    // Get unread count
    const unread_count = await this.prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    const notifications = await this.prisma.notification.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { created_at: 'desc' },
    });

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      data: notifications.map((notification) => this.formatNotificationResponse(notification)),
      total,
      offset,
      limit,
      totalPages,
      currentPage,
      unread_count,
    };
  }

  async getNotificationById(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    UuidValidator.validate(notificationId, 'notification ID');
    UuidValidator.validate(userId, 'user ID');

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    return this.formatNotificationResponse(notification);
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationResponseDto> {
    UuidValidator.validate(notificationId, 'notification ID');
    UuidValidator.validate(userId, 'user ID');

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    const updatedNotification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return this.formatNotificationResponse(updatedNotification);
  }

  async markAllAsRead(userId: string): Promise<{ updated_count: number; message: string }> {
    UuidValidator.validate(userId, 'user ID');

    const result = await this.prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: { is_read: true },
    });

    return {
      updated_count: result.count,
      message: `Successfully marked ${result.count} notification(s) as read`,
    };
  }

  async deleteNotification(notificationId: string, userId: string): Promise<{ message: string }> {
    UuidValidator.validate(notificationId, 'notification ID');
    UuidValidator.validate(userId, 'user ID');

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return {
      message: 'Notification deleted successfully',
    };
  }

  async getUnreadCount(userId: string): Promise<{ unread_count: number }> {
    UuidValidator.validate(userId, 'user ID');

    const unread_count = await this.prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    return { unread_count };
  }

  // Helper method to notify admins about pending course approval
  async notifyAdminsPendingCourse(
    courseId: string,
    courseTitle: string,
    instructorName: string,
  ): Promise<void> {
    // Get all admin users
    const admins = await this.prisma.user.findMany({
      where: {
        role: 'admin',
      },
      select: {
        id: true,
      },
    });

    if (admins.length === 0) {
      return;
    }

    // Create notifications for all admins
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      type: NotificationType.course_pending_approval,
      title: 'New Course Pending Approval',
      message: `Instructor ${instructorName} has created a new course "${courseTitle}" that requires approval.`,
      related_id: courseId,
      related_type: NotificationRelatedType.course,
    }));

    await this.createBulkNotifications(notifications);
  }

  // Helper method to create course approval notification
  async notifyInstructorCourseApproval(
    instructorId: string,
    courseId: string,
    courseTitle: string,
    isApproved: boolean,
  ): Promise<void> {
    const notificationType = isApproved
      ? NotificationType.course_approved
      : NotificationType.course_rejected;

    const title = isApproved ? 'Course Approved!' : 'Course Rejected';
    const message = isApproved
      ? `Your course "${courseTitle}" has been approved and is now visible to students.`
      : `Your course "${courseTitle}" has been rejected. Please review and resubmit.`;

    await this.createNotification({
      user_id: instructorId,
      type: notificationType,
      title,
      message,
      related_id: courseId,
      related_type: NotificationRelatedType.course,
    });
  }

  // Helper method to create new assignment notification for enrolled students
  async notifyStudentsNewAssignment(
    courseId: string,
    assignmentId: string,
    assignmentTitle: string,
    moduleTitle: string,
  ): Promise<void> {
    // Get all enrolled students in the course
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        course_id: courseId,
        status: 'active',
      },
      select: {
        student_id: true,
      },
    });

    if (enrollments.length === 0) {
      return;
    }

    // Create notifications for all enrolled students
    const notifications = enrollments.map((enrollment) => ({
      user_id: enrollment.student_id,
      type: NotificationType.new_assignment,
      title: 'New Assignment Available',
      message: `A new assignment "${assignmentTitle}" has been posted in module "${moduleTitle}".`,
      related_id: assignmentId,
      related_type: NotificationRelatedType.assignment,
    }));

    await this.createBulkNotifications(notifications);
  }

  // Notify the instructor that a student was detected leaving the secured browser
  async notifyInstructorLeaveDetection(
    instructorId: string,
    assignmentId: string,
    studentName: string,
    assignmentTitle?: string,
  ): Promise<void> {
    if (!instructorId) return;

    const title = 'Student left secured assignment';
    const message = assignmentTitle
      ? `${studentName} was detected leaving the secured browser during assignment "${assignmentTitle}".`
      : `${studentName} was detected leaving the secured browser during an assignment.`;

    // NOTE: schema was updated to include `student_left_assignment`.
    // If your local @prisma/client is not yet regenerated this will fall back to `general`.
    const notifType = (NotificationType as any).student_left_assignment || NotificationType.general;

    // eslint-disable-next-line no-console
    console.log('Notify instructor leave detection', { instructorId, assignmentId, notifType, studentName });

    await this.createNotification({
      user_id: instructorId,
      type: notifType,
      title,
      message,
      related_id: assignmentId,
      related_type: NotificationRelatedType.assignment,
    });
  }

  private formatNotificationResponse(notification: any): NotificationResponseDto {
    return {
      id: notification.id,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      is_read: notification.is_read,
      related_id: notification.related_id,
      related_type: notification.related_type,
      created_at: notification.created_at,
    };
  }
}
