import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateCourseDto,
  CreateCourseWithFileDto,
  CourseQueryDto,
  PaginatedCoursesResponseDto,
  CourseQueryByInstructorDto,
} from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PrismaService } from '@/core/prisma/prisma.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import { EnrollmentService } from './enrollment.service';
import { UuidValidator } from '@/common/utils/uuid.validator';
import { Course, NotificationRelatedType, NotificationType } from '@prisma/client';
import { InstructorAnalyticsDto } from './dto/instructor-analytics.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CourseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly enrollmentService: EnrollmentService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private generateCourseInviteCode() {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  async createCourse(
    createCourseDto: CreateCourseDto | CreateCourseWithFileDto,
    instructorId: string,
    thumbnailFile?: Express.Multer.File,
  ) {
    const { title, description, category } = createCourseDto;
    const courseInviteCode = this.generateCourseInviteCode();

    let thumbnailUrl = '';

    if (thumbnailFile) {
      try {
        // Try regular upload first
        thumbnailUrl = await this.supabaseService.uploadImage(
          thumbnailFile,
          'course-thumbnails',
          'thumbnails',
        );
      } catch (error) {
        try {
          // If regular upload fails, try direct upload
          thumbnailUrl = await this.supabaseService.uploadImageDirect(
            thumbnailFile,
            'course-thumbnails',
            'thumbnails',
          );
        } catch (directError) {
          throw new Error(`Failed to upload thumbnail: ${directError.message}`);
        }
      }
    } else if (createCourseDto.thumbnail && typeof createCourseDto.thumbnail === 'string') {
      thumbnailUrl = createCourseDto.thumbnail;
    }

    const course = await this.prisma.course.create({
      data: {
        id: uuidv4(),
        title,
        description,
        category,
        thumbnail: thumbnailUrl,
        course_invite_code: courseInviteCode,
        instructor_id: instructorId,
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

    await this.notificationsService.createNotification({
      user_id: instructorId,
      type: NotificationType.general as NotificationType,
      title: 'New Course Created',
      message: `A new course "${course.title}" has been created. Please review and approve it.`,
      related_id: course.id,
      related_type: NotificationRelatedType.course as NotificationRelatedType,
    });

    return course;
  }

  async findAll(query: CourseQueryDto): Promise<PaginatedCoursesResponseDto> {
    // Convert string parameters to numbers
    const offset = parseInt(query.offset?.toString() || '0', 10);
    const limit = parseInt(query.limit?.toString() || '10', 10);
    const category = query.category;
    const search = query.search;

    // Build where clause
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Get total count
    const total = await this.prisma.course.count({ where });

    // Get paginated results
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
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    // Format courses with count data
    const formattedCourses = courses.map((course) => ({
      ...course,
      students_count: course._count.enrollments,
      modules_count: course._count.modules,
    }));

    return {
      data: formattedCourses,
      total,
      offset,
      limit,
      totalPages,
      currentPage,
    };
  }

  async findThreeLatestCourses(): Promise<Course[]> {
    const courses = await this.prisma.course.findMany({
      include: {
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 3,
    });

    // Format courses with count data
    return courses.map((course) => ({
      ...course,
      students_count: course._count.enrollments,
      modules_count: course._count.modules,
    }));
  }

  async findAllByInstructor(
    query: CourseQueryDto,
    instructor_id: string,
  ): Promise<CourseQueryByInstructorDto> {
    // Convert string parameters to numbers
    const offset = parseInt(query.offset?.toString() || '0', 10);
    const limit = parseInt(query.limit?.toString() || '10', 10);
    const category = query.category;
    const search = query.search;

    // Build where clause
    const where: any = {};

    if (instructor_id) {
      where.instructor_id = instructor_id;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Get total count
    const total = await this.prisma.course.count({ where });

    // Get paginated results
    const courses = await this.prisma.course.findMany({
      where: { instructor_id: instructor_id },
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
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    // Format courses with count data
    const formattedCourses = courses.map((course) => ({
      ...course,
      students_count: course._count.enrollments,
      modules_count: course._count.modules,
    }));

    return {
      data: formattedCourses,
      instructor_id,
      total,
      offset,
      limit,
      totalPages,
      currentPage,
    };
  }

  async findOne(id: string) {
    // Validate UUID format
    UuidValidator.validate(id, 'course ID');

    const course = await this.prisma.course.findUnique({
      where: { id },
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

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    // Validate UUID format
    UuidValidator.validate(id, 'course ID');

    // Check if course exists
    const existingCourse = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    const course = await this.prisma.course.update({
      where: { id },
      data: updateCourseDto,
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

    return course;
  }

  async remove(id: string) {
    // Validate UUID format
    UuidValidator.validate(id, 'course ID');

    // Check if course exists
    const existingCourse = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    await this.prisma.course.delete({
      where: { id },
    });

    return { message: `Course with ID ${id} has been deleted successfully` };
  }

  async getInstructorAnalytics(instructorId: string): Promise<InstructorAnalyticsDto> {
    // Validate UUID format
    UuidValidator.validate(instructorId, 'instructor ID');

    // Get all courses created by the instructor
    const courses = await this.prisma.course.findMany({
      where: { instructor_id: instructorId },
      include: {
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Calculate total students enrolled across all courses
    const totalStudentsEnrolled = courses.reduce(
      (sum, course) => sum + course._count.enrollments,
      0,
    );

    // Get all modules for instructor's courses
    const courseIds = courses.map((course) => course.id);

    // Count pending grades (submissions with status 'submitted' that haven't been graded)
    const pendingGradesCount = await this.prisma.assignmentSubmission.count({
      where: {
        assignment: {
          module: {
            course_id: {
              in: courseIds,
            },
          },
        },
        status: 'submitted',
      },
    });

    // Get top 3 most popular courses based on enrollment count
    const topPopularCourses = [...courses]
      .sort((a, b) => b._count.enrollments - a._count.enrollments)
      .slice(0, 3)
      .map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        thumbnail: course.thumbnail,
        students_count: course._count.enrollments,
        status: course.status,
        created_at: course.created_at,
      }));

    // Format all courses
    const formattedCourses = courses.map((course) => ({
      id: course.id,
      title: course.title,
      category: course.category,
      thumbnail: course.thumbnail,
      status: course.status,
      students_count: course._count.enrollments,
      modules_count: course._count.modules,
    }));

    return {
      instructor_id: instructorId,
      total_courses: courses.length,
      total_students_enrolled: totalStudentsEnrolled,
      pending_grades_count: pendingGradesCount,
      courses: formattedCourses,
      top_popular_courses: topPopularCourses,
    };
  }
}
