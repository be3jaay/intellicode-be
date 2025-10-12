import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { ApproveCourseDto, PendingCoursesQueryDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPendingCourses(query: PendingCoursesQueryDto) {
    const { offset = 0, limit = 10, status = 'waiting_for_approval' } = query;

    const where: any = { status };
    
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
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      data: courses,
      total,
      offset,
      limit,
      totalPages,
      currentPage
    };
  }

  async approveCourse(courseId: string, approveDto: ApproveCourseDto, adminId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        status: approveDto.status,
        updated_at: new Date()
      },
      include: {
        instructor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          }
        }
      }
    });

    return updatedCourse;
  }
}
