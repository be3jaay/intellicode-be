import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourseDto, CreateCourseWithFileDto, CourseQueryDto, PaginatedCoursesResponseDto, CourseQueryByInstructorDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PrismaService } from '@/core/prisma/prisma.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CourseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService
  ) {}

  private generateCourseInviteCode() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async createCourse(createCourseDto: CreateCourseDto | CreateCourseWithFileDto, instructorId: string, thumbnailFile?: Express.Multer.File) {
    const { title, description, category } = createCourseDto;
    const courseInviteCode = this.generateCourseInviteCode();

    let thumbnailUrl = '';

    if (thumbnailFile) {
      try {
        thumbnailUrl = await this.supabaseService.uploadImage(
          thumbnailFile,
          'course-thumbnails',
          'thumbnails'
        );
      } catch (error) {
        throw new Error(`Failed to upload thumbnail: ${error.message}`);
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
          }
        }
      }
    });

    return course;
  }

  async findAll(query: CourseQueryDto): Promise<PaginatedCoursesResponseDto> {
    const { offset = 0, limit = 10, category, search } = query;

    // Build where clause
    const where: any = {};
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive'
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
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
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

  async findAllByInstructor(query: CourseQueryDto, instructor_id: string): Promise<CourseQueryByInstructorDto> {
    const { offset = 0, limit = 10, category, search } = query;

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
        mode: 'insensitive'
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
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      data: courses,
      instructor_id,
      total,
      offset,
      limit,
      totalPages,
      currentPage
    };
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
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
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    // Check if course exists
    const existingCourse = await this.prisma.course.findUnique({
      where: { id }
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
          }
        }
      }
    });

    return course;
  }

  async remove(id: string) {
    // Check if course exists
    const existingCourse = await this.prisma.course.findUnique({
      where: { id }
    });

    if (!existingCourse) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    await this.prisma.course.delete({
      where: { id }
    });

    return { message: `Course with ID ${id} has been deleted successfully` };
  }
}
