


import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { CreateLessonDto, BulkCreateLessonsDto, BulkCreateLessonsFromObjectDto, LessonResponseDto, LessonDifficulty } from './dto/lesson.dto';
import { v4 as uuidv4 } from 'uuid';
import { UuidValidator } from '@/common/utils/uuid.validator';

@Injectable()
export class LessonService {
  constructor(private readonly prisma: PrismaService) {}

  async createLesson(createLessonDto: CreateLessonDto, moduleId: string, instructorId: string): Promise<LessonResponseDto> {
    // Validate UUID formats
    UuidValidator.validateMultiple({
      'module ID': moduleId,
      'instructor ID': instructorId
    });

    // Verify instructor owns the course that contains this module
    const module = await this.prisma.module.findFirst({
      where: { 
        id: moduleId,
        course: {
          instructor_id: instructorId
        }
      },
      include: {
        course: true
      }
    });

    if (!module) {
      throw new NotFoundException('Module not found or you do not have permission');
    }

    const lesson = await this.prisma.lesson.create({
      data: {
        id: uuidv4(),
        module_id: moduleId,
        title: createLessonDto.title,
        description: createLessonDto.description,
        content: createLessonDto.content,
        order_index: createLessonDto.order_index,
        is_published: createLessonDto.is_published || false,
        difficulty: (createLessonDto.difficulty as LessonDifficulty) || LessonDifficulty.BEGINNER,
        estimated_duration: createLessonDto.estimated_duration || null,
        tags: createLessonDto.tags || []
      }
    });

    return {
      id: lesson.id,
      module_id: lesson.module_id,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      order_index: lesson.order_index,
      is_published: lesson.is_published,
      difficulty: lesson.difficulty as LessonDifficulty,
      estimated_duration: lesson.estimated_duration,
      tags: lesson.tags,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
      module: {
        id: module.id,
        title: module.title,
        description: module.description
      }
    };
  }

  async bulkCreateLessons(bulkCreateDto: BulkCreateLessonsDto, instructorId: string): Promise<LessonResponseDto[]> {
    // Validate UUID formats
    UuidValidator.validateMultiple({
      'module ID': bulkCreateDto.module_id,
      'instructor ID': instructorId
    });

    // Verify instructor owns the course that contains this module
    const module = await this.prisma.module.findFirst({
      where: { 
        id: bulkCreateDto.module_id,
        course: {
          instructor_id: instructorId
        }
      },
      include: {
        course: true
      }
    });

    if (!module) {
      throw new NotFoundException('Module not found or you do not have permission');
    }

    const lessonsData = bulkCreateDto.lessons.map(lesson => ({
      id: uuidv4(),
      module_id: bulkCreateDto.module_id,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      order_index: lesson.order_index,
      is_published: lesson.is_published || false,
      difficulty: (lesson.difficulty as LessonDifficulty) || LessonDifficulty.BEGINNER,
      estimated_duration: lesson.estimated_duration || null,
      tags: lesson.tags || []
    }));

    await this.prisma.lesson.createMany({
      data: lessonsData
    });

    // Return created lessons
    const createdLessons = await this.prisma.lesson.findMany({
      where: { module_id: bulkCreateDto.module_id },
      orderBy: { order_index: 'asc' }
    });

    return createdLessons.map(lesson => ({
      id: lesson.id,
      module_id: lesson.module_id,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      order_index: lesson.order_index,
      is_published: lesson.is_published,
      difficulty: lesson.difficulty as LessonDifficulty,
      estimated_duration: lesson.estimated_duration,
      tags: lesson.tags,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
      module: {
        id: module.id,
        title: module.title,
        description: module.description
      }
    }));
  }

  async bulkCreateLessonsFromObject(bulkCreateDto: BulkCreateLessonsFromObjectDto, instructorId: string): Promise<LessonResponseDto[]> {
    // Validate UUID formats
    UuidValidator.validateMultiple({
      'module ID': bulkCreateDto.module_id,
      'instructor ID': instructorId
    });

    // Verify instructor owns the course that contains this module
    const module = await this.prisma.module.findFirst({
      where: { 
        id: bulkCreateDto.module_id,
        course: {
          instructor_id: instructorId
        }
      },
      include: {
        course: true
      }
    });

    if (!module) {
      throw new NotFoundException('Module not found or you do not have permission');
    }

    // Convert object format to array format with new fields
    const lessonsArray = Object.values(bulkCreateDto.lessons).map((lesson, index) => ({
      id: uuidv4(),
      module_id: bulkCreateDto.module_id,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      order_index: lesson.order ?? index + 1, // Use provided order or default to index + 1
      is_published: lesson.isPublished || false,
      difficulty: (lesson.difficulty as LessonDifficulty) || LessonDifficulty.BEGINNER,
      estimated_duration: lesson.estimatedDuration || null,
      tags: lesson.tags || []
    }));

    await this.prisma.lesson.createMany({
      data: lessonsArray 
    });

    // Return created lessons
    const createdLessons = await this.prisma.lesson.findMany({
      where: { module_id: bulkCreateDto.module_id },
      orderBy: { order_index: 'asc' }
    });

    return createdLessons.map(lesson => ({
      id: lesson.id,
      module_id: lesson.module_id,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      order_index: lesson.order_index,
      is_published: lesson.is_published,
      difficulty: lesson.difficulty as LessonDifficulty,
      estimated_duration: lesson.estimated_duration,
      tags: lesson.tags,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
      module: {
        id: module.id,
        title: module.title,
        description: module.description
      }
    }));
  }

  async getModuleLessons(moduleId: string, instructorId: string) {
    // Validate UUID formats
    UuidValidator.validateMultiple({
      'module ID': moduleId,
      'instructor ID': instructorId
    });

    // Verify instructor owns the course that contains this module
    const module = await this.prisma.module.findFirst({
      where: { 
        id: moduleId,
        course: {
          instructor_id: instructorId
        }
      },
      include: {
        course: true
      }
    });

    if (!module) {
      throw new NotFoundException('Module not found or you do not have permission');
    }

    return await this.prisma.lesson.findMany({
      where: { module_id: moduleId },
      orderBy: { order_index: 'asc' },
      include: {
        activities: {
          orderBy: { created_at: 'asc' }
        }
      }
    });
  }
}