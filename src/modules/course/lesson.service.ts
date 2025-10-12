


import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { CreateLessonDto, BulkCreateLessonsDto, LessonResponseDto } from './dto/lesson.dto';
import { LessonType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LessonService {
  constructor(private readonly prisma: PrismaService) {}

  async createLesson(createLessonDto: CreateLessonDto, courseId: string, instructorId: string): Promise<LessonResponseDto> {
    // Verify instructor owns the course
    const course = await this.prisma.course.findFirst({
      where: { 
        id: courseId, 
        instructor_id: instructorId 
      }
    });

    if (!course) {
      throw new NotFoundException('Course not found or you do not have permission');
    }

    const lesson = await this.prisma.lesson.create({
      data: {
        id: uuidv4(),
        course_id: courseId,
        title: createLessonDto.title,
        description: createLessonDto.description,
        content: createLessonDto.content,
        lesson_type: createLessonDto.lesson_type || LessonType.content,
        order_index: createLessonDto.order_index,
        is_published: createLessonDto.is_published || false
      }
    });

    return {
      id: lesson.id,
      course_id: lesson.course_id,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      lesson_type: lesson.lesson_type,
      order_index: lesson.order_index,
      is_published: lesson.is_published,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at
    };
  }

  async bulkCreateLessons(bulkCreateDto: BulkCreateLessonsDto, instructorId: string): Promise<LessonResponseDto[]> {
    // Verify instructor owns the course
    const course = await this.prisma.course.findFirst({
      where: { 
        id: bulkCreateDto.course_id, 
        instructor_id: instructorId 
      }
    });

    if (!course) {
      throw new NotFoundException('Course not found or you do not have permission');
    }

    const lessonsData = bulkCreateDto.lessons.map(lesson => ({
      id: uuidv4(),
      course_id: bulkCreateDto.course_id,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      lesson_type: lesson.lesson_type || LessonType.content,
      order_index: lesson.order_index,
      is_published: lesson.is_published || false
    }));

    await this.prisma.lesson.createMany({
      data: lessonsData
    });

    // Return created lessons
    const createdLessons = await this.prisma.lesson.findMany({
      where: { course_id: bulkCreateDto.course_id },
      orderBy: { order_index: 'asc' }
    });

    return createdLessons.map(lesson => ({
      id: lesson.id,
      course_id: lesson.course_id,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      lesson_type: lesson.lesson_type,
      order_index: lesson.order_index,
      is_published: lesson.is_published,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at
    }));
  }

  async getCourseLessons(courseId: string, instructorId: string) {
    // Verify instructor owns the course
    const course = await this.prisma.course.findFirst({
      where: { 
        id: courseId, 
        instructor_id: instructorId 
      }
    });

    if (!course) {
      throw new NotFoundException('Course not found or you do not have permission');
    }

    return await this.prisma.lesson.findMany({
      where: { course_id: courseId },
      orderBy: { order_index: 'asc' },
      include: {
        activities: {
          orderBy: { created_at: 'asc' }
        }
      }
    });
  }
}