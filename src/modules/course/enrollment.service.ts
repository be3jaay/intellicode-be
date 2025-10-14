import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { 
  EnrollCourseDto, 
  EnrollmentResponseDto, 
  StudentEnrollmentsQueryDto,
  PaginatedEnrollmentsResponseDto 
} from './dto/enrollment.dto';
import { v4 as uuidv4 } from 'uuid';
import { UuidValidator } from '@/common/utils/uuid.validator';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  async enrollInCourse(enrollDto: EnrollCourseDto, studentId: string): Promise<EnrollmentResponseDto> {
    const course = await this.prisma.course.findFirst({
      where: { 
        course_invite_code: enrollDto.course_invite_code,
        status: 'approved' // Only allow enrollment in approved courses
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

    if (!course) {
      throw new NotFoundException('Course not found or not approved');
    }

    // Check if already enrolled
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        student_id_course_id: {
          student_id: studentId,
          course_id: course.id
        }
      }
    });

    if (existingEnrollment) {
      throw new BadRequestException('You are already enrolled in this course');
    }

    // Create enrollment
    const enrollment = await this.prisma.enrollment.create({
      data: {
        id: uuidv4(),
        student_id: studentId,
        course_id: course.id,
        status: 'active'
      },
      include: {
        course: {
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
        }
      }
    });

    return {
      id: enrollment.id,
      student_id: enrollment.student_id,
      course_id: enrollment.course_id,
      enrolled_at: enrollment.enrolled_at,
      status: enrollment.status,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        category: enrollment.course.category,
        thumbnail: enrollment.course.thumbnail,
        instructor: enrollment.course.instructor
      }
    };
  }

  async getStudentEnrollments(
    query: StudentEnrollmentsQueryDto, 
    studentId: string
  ): Promise<PaginatedEnrollmentsResponseDto> {
    const offset = parseInt(query.offset?.toString() || '0', 10);
    const limit = parseInt(query.limit?.toString() || '10', 10);
    const status = query.status;

    const where: any = { student_id: studentId };
    if (status) {
      where.status = status;
    }

    const total = await this.prisma.enrollment.count({ where });

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        course: {
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
        }
      },
      orderBy: { enrolled_at: 'desc' }
    });

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      data: enrollments.map(enrollment => ({
        id: enrollment.id,
        student_id: enrollment.student_id,
        course_id: enrollment.course_id,
        enrolled_at: enrollment.enrolled_at,
        status: enrollment.status,
        course: {
          id: enrollment.course.id,
          title: enrollment.course.title,
          description: enrollment.course.description,
          category: enrollment.course.category,
          thumbnail: enrollment.course.thumbnail,
          instructor: enrollment.course.instructor
        }
      })),
      total,
      offset,
      limit,
      totalPages,
      currentPage
    };
  }

  async getCourseEnrollmentsLength(courseId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { course_id: courseId }
    });

    return enrollments.length;
  }

  async getEnrolledCourseDetails(courseId: string, studentId: string) {
    UuidValidator.validateMultiple({
      'course ID': courseId,
      'student ID': studentId
    });

    // Verify student is enrolled
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        student_id_course_id: {
          student_id: studentId,
          course_id: courseId
        }
      }
    });

    if (!enrollment) {
      throw new NotFoundException('You are not enrolled in this course');
    }

    // Get course with lessons
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          }
        },
        modules: {
          where: { is_published: true },
          orderBy: { order_index: 'asc' },
          include: {
            lessons: {
              where: { is_published: true },
              orderBy: { order_index: 'asc' },
              include: {
                activities: {
                  where: { is_published: true },
                  orderBy: { created_at: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }
}