import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { CreateModuleDto, UpdateModuleDto, ModuleQueryDto, ModuleResponseDto, PaginatedModulesResponseDto, BulkCreateModulesDto, ModuleListQueryDto, PaginatedModuleListResponseDto, ModuleListItemDto } from './dto/module.dto';
import { UuidValidator } from '@/common/utils/uuid.validator';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ModuleService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllModulesByCourseId(courseId: string): Promise<{module_id: string, module_title: string}[]> {
    const modules = await this.prisma.module.findMany({
      where: { course_id: courseId },
      orderBy: {
        order_index: 'asc',
      },
    });
    return modules.map(module => ({
      module_id: module.id,
      module_title: module.title,
    }));
  }

  async createModule(createModuleDto: CreateModuleDto, instructorId: string): Promise<ModuleResponseDto> {
    const { course_id, ...moduleData } = createModuleDto;

    // Validate course ID format
    if (!UuidValidator.validate(course_id)) {
      throw new BadRequestException('Invalid course ID format');
    }

    // Check if course exists and belongs to instructor
    const course = await this.prisma.course.findFirst({
      where: {
        id: course_id,
        instructor_id: instructorId,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found or you do not have permission to add modules to this course');
    }

    // Get the next order index if not provided
    const orderIndex = moduleData.order_index ?? await this.getNextOrderIndex(course_id);

    const module = await this.prisma.module.create({
      data: {
        id: uuidv4(),
        course_id,
        order_index: orderIndex,
        ...moduleData,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        _count: {
          select: {
            lessons: true,
            files: true,
          },
        },
      },
    });

    return this.formatModuleResponse(module);
  }

  async getModules(courseId: string, query: ModuleQueryDto, instructorId?: string): Promise<PaginatedModulesResponseDto> {
    // Validate course ID format
    if (!UuidValidator.validate(courseId)) {
      throw new BadRequestException('Invalid course ID format');
    }

    // Check if course exists and user has permission
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        ...(instructorId && { instructor_id: instructorId }),
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found or you do not have permission to view modules');
    }

    const { offset = 0, limit = 10, is_published, search } = query;

    const where: any = {
      course_id: courseId,
    };

    if (is_published !== undefined) {
      where.is_published = is_published;
    }

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [modules, total] = await Promise.all([
      this.prisma.module.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [
          { order_index: 'asc' },
          { created_at: 'asc' },
        ],
        include: {
          course: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
          _count: {
            select: {
              lessons: true,
              files: true,
            },
          },
        },
      }),
      this.prisma.module.count({ where }),
    ]);

    const formattedModules = modules.map(module => this.formatModuleResponse(module));

    return {
      modules: formattedModules,
      total,
      offset,
      limit,
      hasNext: offset + limit < total,
      hasPrevious: offset > 0,
    };
  }

  async getModuleById(moduleId: string, instructorId?: string): Promise<ModuleResponseDto> {
    // Validate module ID format
    if (!UuidValidator.validate(moduleId)) {
      throw new BadRequestException('Invalid module ID format');
    }

    const module = await this.prisma.module.findFirst({
      where: {
        id: moduleId,
        ...(instructorId && {
          course: {
            instructor_id: instructorId,
          },
        }),
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        _count: {
          select: {
            lessons: true,
            files: true,
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found or you do not have permission to view this module');
    }

    return this.formatModuleResponse(module);
  }

  async updateModule(moduleId: string, updateModuleDto: UpdateModuleDto, instructorId: string): Promise<ModuleResponseDto> {
    // Validate module ID format
    if (!UuidValidator.validate(moduleId)) {
      throw new BadRequestException('Invalid module ID format');
    }

    // Check if module exists and belongs to instructor's course
    const existingModule = await this.prisma.module.findFirst({
      where: {
        id: moduleId,
        course: {
          instructor_id: instructorId,
        },
      },
    });

    if (!existingModule) {
      throw new NotFoundException('Module not found or you do not have permission to update this module');
    }

    const module = await this.prisma.module.update({
      where: { id: moduleId },
      data: updateModuleDto,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        _count: {
          select: {
            lessons: true,
            files: true,
          },
        },
      },
    });

    return this.formatModuleResponse(module);
  }

  async deleteModule(moduleId: string, instructorId: string): Promise<void> {
    // Validate module ID format
    if (!UuidValidator.validate(moduleId)) {
      throw new BadRequestException('Invalid module ID format');
    }

    // Check if module exists and belongs to instructor's course
    const module = await this.prisma.module.findFirst({
      where: {
        id: moduleId,
        course: {
          instructor_id: instructorId,
        },
      },
      include: {
        _count: {
          select: {
            lessons: true,
            files: true,
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found or you do not have permission to delete this module');
    }

    // Check if module has lessons or files
    if (module._count.lessons > 0 || module._count.files > 0) {
      throw new BadRequestException('Cannot delete module that contains lessons or files. Please remove all lessons and files first.');
    }

    await this.prisma.module.delete({
      where: { id: moduleId },
    });
  }

  async bulkCreateModules(bulkCreateDto: BulkCreateModulesDto, instructorId: string): Promise<ModuleResponseDto[]> {
    const { course_id, modules } = bulkCreateDto;

    // Validate course ID format
    if (!UuidValidator.validate(course_id)) {
      throw new BadRequestException('Invalid course ID format');
    }

    // Check if course exists and belongs to instructor
    const course = await this.prisma.course.findFirst({
      where: {
        id: course_id,
        instructor_id: instructorId,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found or you do not have permission to add modules to this course');
    }

    // Get the starting order index
    const startingOrderIndex = await this.getNextOrderIndex(course_id);

    // Create modules with proper order indices
    const modulesToCreate = modules.map((module, index) => ({
      id: uuidv4(),
      course_id,
      order_index: startingOrderIndex + index,
      ...module,
    }));

    const createdModules = await this.prisma.module.createMany({
      data: modulesToCreate,
    });

    // Fetch the created modules with full details
    const createdModulesWithDetails = await this.prisma.module.findMany({
      where: {
        course_id,
        id: {
          in: modulesToCreate.map(m => m.id),
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        _count: {
          select: {
            lessons: true,
            files: true,
          },
        },
      },
      orderBy: {
        order_index: 'asc',
      },
    });

    return createdModulesWithDetails.map(module => this.formatModuleResponse(module));
  }

  async getCourseModules(courseId: string, query: ModuleQueryDto): Promise<PaginatedModulesResponseDto> {
    // Validate course ID format
    if (!UuidValidator.validate(courseId)) {
      throw new BadRequestException('Invalid course ID format');
    }

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.getModules(courseId, query);
  }

  private async getNextOrderIndex(courseId: string): Promise<number> {
    const lastModule = await this.prisma.module.findFirst({
      where: { course_id: courseId },
      orderBy: { order_index: 'desc' },
      select: { order_index: true },
    });

    return (lastModule?.order_index ?? -1) + 1;
  }

  private formatModuleResponse(module: any): ModuleResponseDto {
    return {
      id: module.id,
      title: module.title,
      description: module.description,
      course_id: module.course_id,
      order_index: module.order_index,
      is_published: module.is_published,
      created_at: module.created_at,
      updated_at: module.updated_at,
      course: module.course,
      lessons_count: module._count?.lessons ?? 0,
      files_count: module._count?.files ?? 0,
    };
  }

  async getCourseModulesList(
    courseId: string, 
    query: ModuleListQueryDto, 
    userId: string
  ): Promise<PaginatedModuleListResponseDto> {
    const { offset = 0, limit = 10, search } = query;

    // Validate course ID format
    if (!UuidValidator.validate(courseId)) {
      throw new BadRequestException('Invalid course ID format');
    }

    // Check if course exists and user has access
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { instructor_id: userId },
          { enrollments: { some: { student_id: userId } } }
        ]
      }
    });

    if (!course) {
      throw new NotFoundException('Course not found or you do not have access to this course');
    }

    // Build search conditions
    const whereConditions: any = {
      course_id: courseId
    };

    if (search) {
      whereConditions.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const total = await this.prisma.module.count({
      where: whereConditions
    });

    // Get modules with counts and lessons
    const modules = await this.prisma.module.findMany({
      where: whereConditions,
      select: {
        id: true,
        title: true,
        description: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            lessons: true,
            assignments: true
          }
        },
        lessons: {
          select: {
            id: true,
            title: true,
            description: true,
            order_index: true,
            is_published: true,
            difficulty: true,
            estimated_duration: true,
            tags: true,
            created_at: true,
            updated_at: true
          },
          orderBy: {
            order_index: 'asc'
          }
        }
      },
      orderBy: {
        order_index: 'asc'
      },
      skip: offset,
      take: limit
    });

    // Format response
    const formattedModules: ModuleListItemDto[] = modules.map(module => ({
      id: module.id,
      title: module.title,
      description: module.description,
      created_at: module.created_at,
      updated_at: module.updated_at,
      lessons_count: module._count.lessons,
      activities_count: module._count.assignments,
      lessons: module.lessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        order_index: lesson.order_index,
        is_published: lesson.is_published,
        difficulty: lesson.difficulty,
        estimated_duration: lesson.estimated_duration,
        tags: lesson.tags,
        created_at: lesson.created_at,
        updated_at: lesson.updated_at
      }))
    }));

    return {
      modules: formattedModules,
      total,
      offset,
      limit,
      hasNext: offset + limit < total,
      hasPrevious: offset > 0
    };
  }
}
