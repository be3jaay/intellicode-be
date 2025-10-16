import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { 
  EnrollCourseDto, 
  EnrollmentResponseDto, 
  StudentEnrollmentsQueryDto,
  PaginatedEnrollmentsResponseDto 
} from './dto/enrollment.dto';
import {
  StudentDto,
  CourseStudentsQueryDto,
  PaginatedStudentsResponseDto,
  UpdateEnrollmentStatusDto,
  EnrollmentStatusResponseDto,
  CourseProgressDto,
  EnrollmentStatus
} from './dto/student.dto';
import { v4 as uuidv4 } from 'uuid';
import { UuidValidator } from '@/common/utils/uuid.validator';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}


  async getMyThreeLatestEnrollments(studentId: string): Promise<EnrollmentResponseDto[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { student_id: studentId },
      orderBy: { enrolled_at: 'desc' },
      take: 3,
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
    return enrollments
  }

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

  async getCourseStudents(courseId: string, query: CourseStudentsQueryDto, instructorId: string): Promise<PaginatedStudentsResponseDto> {
    UuidValidator.validate(courseId, 'course ID');

    // Check if course exists and belongs to instructor
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        instructor_id: instructorId
      }
    });

    if (!course) {
      throw new NotFoundException('Course not found or you do not have permission to view students');
    }

    const { offset = 0, limit = 10, status, search, section } = query;

    // Build where clause
    const where: any = {
      course_id: courseId
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.student = {
        OR: [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { student_number: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    if (section) {
      where.student = {
        ...where.student,
        section: section
      };
    }

    // Get total count
    const total = await this.prisma.enrollment.count({ where });

    // Get paginated results
    const enrollments = await this.prisma.enrollment.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
            section: true,
            profile_picture: true
          }
        }
      },
      orderBy: { enrolled_at: 'desc' }
    });

    // Transform to StudentDto with mocked progress
    const students = enrollments.map(enrollment => {
      const progressPercentage = this.calculateMockProgress(enrollment.student_id, courseId);
      const assignmentsData = this.getMockAssignmentsData(enrollment.student_id, courseId);

      return {
        id: enrollment.student.id,
        first_name: enrollment.student.first_name,
        last_name: enrollment.student.last_name,
        email: enrollment.student.email,
        student_number: enrollment.student.student_number,
        section: enrollment.student.section,
        profile_picture: enrollment.student.profile_picture,
        enrollment_status: enrollment.status as EnrollmentStatus,
        enrolled_at: enrollment.enrolled_at,
        progress_percentage: progressPercentage,
        assignments_completed: assignmentsData.completed,
        assignments_total: assignmentsData.total,
        last_activity: this.getMockLastActivity(enrollment.student_id, courseId)
      };
    });

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      data: students,
      total,
      offset,
      limit,
      totalPages,
      currentPage
    };
  }

  async updateEnrollmentStatus(
    courseId: string, 
    studentId: string, 
    updateDto: UpdateEnrollmentStatusDto, 
    instructorId: string
  ): Promise<EnrollmentStatusResponseDto> {
    UuidValidator.validate(courseId, 'course ID');
    UuidValidator.validate(studentId, 'student ID');

    // Check if course exists and belongs to instructor
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        instructor_id: instructorId
      }
    });

    if (!course) {
      throw new NotFoundException('Course not found or you do not have permission to manage enrollments');
    }

    // Get current enrollment
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        course_id: courseId,
        student_id: studentId
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });

    if (!enrollment) {
      throw new NotFoundException('Student is not enrolled in this course');
    }

    const previousStatus = enrollment.status as EnrollmentStatus;

    // Update enrollment status
    const updatedEnrollment = await this.prisma.enrollment.update({
      where: {
        id: enrollment.id
      },
      data: {
        status: updateDto.status
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });

    return {
      student_id: updatedEnrollment.student_id,
      student_name: `${updatedEnrollment.student.first_name} ${updatedEnrollment.student.last_name}`,
      student_email: updatedEnrollment.student.email,
      previous_status: previousStatus,
      new_status: updateDto.status,
      updated_at: new Date(),
      reason: updateDto.reason
    };
  }

  async getCourseProgress(courseId: string, instructorId: string): Promise<CourseProgressDto> {
    UuidValidator.validate(courseId, 'course ID');

    // Check if course exists and belongs to instructor
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        instructor_id: instructorId
      }
    });

    if (!course) {
      throw new NotFoundException('Course not found or you do not have permission to view progress');
    }

    // Get enrollment statistics
    const enrollments = await this.prisma.enrollment.findMany({
      where: { course_id: courseId },
      include: {
        student: true
      }
    });

    const totalStudents = enrollments.length;
    const activeStudents = enrollments.filter(e => e.status === 'active').length;
    const completedStudents = enrollments.filter(e => e.status === 'completed').length;
    const droppedStudents = enrollments.filter(e => e.status === 'dropped').length;
    const suspendedStudents = enrollments.filter(e => e.status === 'suspended').length;

    // Calculate average progress (mocked)
    const averageProgress = enrollments.length > 0 
      ? enrollments.reduce((sum, enrollment) => sum + this.calculateMockProgress(enrollment.student_id, courseId), 0) / enrollments.length
      : 0;

    // Get assignment statistics (mocked)
    const totalAssignments = this.getMockTotalAssignments(courseId);
    const averageCompletionRate = this.getMockAverageCompletionRate(courseId);

    return {
      course_id: courseId,
      total_students: totalStudents,
      active_students: activeStudents,
      completed_students: completedStudents,
      dropped_students: droppedStudents,
      suspended_students: suspendedStudents,
      average_progress: Math.round(averageProgress),
      total_assignments: totalAssignments,
      average_completion_rate: averageCompletionRate
    };
  }

  // Mock methods for progress calculation (to be replaced with real implementation)
  private calculateMockProgress(studentId: string, courseId: string): number {
    // Mock progress calculation - returns random percentage between 0-100
    const seed = studentId.charCodeAt(0) + courseId.charCodeAt(0);
    return Math.abs(seed) % 101;
  }

  private getMockAssignmentsData(studentId: string, courseId: string): { completed: number; total: number } {
    // Mock assignment data
    const seed = studentId.charCodeAt(0) + courseId.charCodeAt(0);
    const total = Math.abs(seed) % 10 + 5; // 5-14 assignments
    const completed = Math.abs(seed) % (total + 1); // 0 to total
    return { completed, total };
  }

  private getMockLastActivity(studentId: string, courseId: string): Date {
    // Mock last activity - returns random date within last 30 days
    const daysAgo = Math.abs(studentId.charCodeAt(0)) % 30;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  private getMockTotalAssignments(courseId: string): number {
    // Mock total assignments for course
    const seed = courseId.charCodeAt(0);
    return Math.abs(seed) % 15 + 10; // 10-24 assignments
  }

  private getMockAverageCompletionRate(courseId: string): number {
    // Mock average completion rate
    const seed = courseId.charCodeAt(0);
    return Math.abs(seed) % 41 + 60; // 60-100%
  }
}