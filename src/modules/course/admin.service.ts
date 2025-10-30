import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { ApproveCourseDto, PendingCoursesQueryDto } from './dto/admin.dto';
import { UuidValidator } from '@/common/utils/uuid.validator';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getPendingCourses(query: PendingCoursesQueryDto) {
    // Convert string parameters to numbers
    const offset = parseInt(query.offset?.toString() || '0', 10);
    const limit = parseInt(query.limit?.toString() || '10', 10);

    // Build where clause - only add status filter if provided
    const where: any = {};
    // If status is provided by admin, use it. Otherwise, by default exclude newly-created 'pending' courses
    // and only return courses that are awaiting approval or already processed by admins.
    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { in: ['waiting_for_approval', 'approved', 'rejected'] };
    }

    const total = await this.prisma.course.count({ where });

    const courses = await this.prisma.course.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        instructor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      data: courses,
      total,
      offset,
      limit,
      totalPages,
      currentPage,
    };
  }

  async approveCourse(courseId: string, approveDto: ApproveCourseDto, adminId: string) {
    // Validate UUID formats
    UuidValidator.validateMultiple({
      'course ID': courseId,
      'admin ID': adminId,
    });

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        status: approveDto.status,
        admin_notes: approveDto.admin_notes,
        updated_at: new Date(),
      },
      include: {
        instructor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    // Send notification to instructor if the course has an instructor
    if (updatedCourse.instructor_id) {
      const isApproved = approveDto.status === 'approved';
      await this.notificationsService.notifyInstructorCourseApproval(
        updatedCourse.instructor_id,
        updatedCourse.id,
        updatedCourse.title,
        isApproved,
      );
    }

    return updatedCourse;
  }
}
