import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { UuidValidator } from '@/common/utils/uuid.validator';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async completeLesson(studentId: string, lessonId: string) {
    // Validate UUID formats
    UuidValidator.validateMultiple({
      'student ID': studentId,
      'lesson ID': lessonId,
    });

    // Check if lesson exists and student is enrolled in the course
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        module: {
          course: {
            enrollments: {
              some: {
                student_id: studentId,
                status: 'active',
              },
            },
          },
        },
      },
      include: {
        module: {
          include: {
            course: true,
            lessons: {
              where: { is_published: true },
              orderBy: { order_index: 'asc' },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found or you are not enrolled in this course');
    }

    // Check if the lesson can be unlocked (previous lesson is completed)
    if (lesson.order_index > 1) {
      const previousLesson = lesson.module.lessons.find(
        (l) => l.order_index === lesson.order_index - 1,
      );

      if (previousLesson) {
        const previousProgress = await this.prisma.lessonProgress.findUnique({
          where: {
            student_id_lesson_id: {
              student_id: studentId,
              lesson_id: previousLesson.id,
            },
          },
        });

        if (!previousProgress?.is_completed) {
          throw new NotFoundException('Previous lesson must be completed first');
        }
      }
    }

    // Check if progress record exists
    const existingProgress = await this.prisma.lessonProgress.findUnique({
      where: {
        student_id_lesson_id: {
          student_id: studentId,
          lesson_id: lessonId,
        },
      },
    });

    const progressData = {
      student_id: studentId,
      lesson_id: lessonId,
      completion_percentage: 100,
      is_completed: true,
      last_accessed: new Date(),
      completed_at: new Date(),
    };

    let updatedProgress;
    if (existingProgress) {
      // Update existing progress
      updatedProgress = await this.prisma.lessonProgress.update({
        where: {
          student_id_lesson_id: {
            student_id: studentId,
            lesson_id: lessonId,
          },
        },
        data: progressData,
      });
    } else {
      // Create new progress record
      updatedProgress = await this.prisma.lessonProgress.create({
        data: {
          id: uuidv4(),
          ...progressData,
        },
      });
    }

    // Get the next lesson to check if it should be unlocked
    const nextLesson = lesson.module.lessons.find((l) => l.order_index === lesson.order_index + 1);

    return {
      message: 'Lesson completed successfully',
      lesson_id: lessonId,
      is_completed: true,
      completion_percentage: 100,
      next_lesson_id: nextLesson?.id,
      next_lesson_unlocked: !!nextLesson,
    };
  }

  async updateLessonProgress(
    studentId: string,
    lessonId: string,
    completionPercentage: number,
    isCompleted: boolean = false,
  ) {
    // Validate UUID formats
    UuidValidator.validateMultiple({
      'student ID': studentId,
      'lesson ID': lessonId,
    });

    // Check if lesson exists and student is enrolled in the course
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        module: {
          course: {
            enrollments: {
              some: {
                student_id: studentId,
                status: 'active',
              },
            },
          },
        },
      },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found or you are not enrolled in this course');
    }

    // Check if progress record exists
    const existingProgress = await this.prisma.lessonProgress.findUnique({
      where: {
        student_id_lesson_id: {
          student_id: studentId,
          lesson_id: lessonId,
        },
      },
    });

    const progressData = {
      student_id: studentId,
      lesson_id: lessonId,
      completion_percentage: Math.min(100, Math.max(0, completionPercentage)),
      is_completed: isCompleted || completionPercentage >= 100,
      last_accessed: new Date(),
      completed_at: isCompleted || completionPercentage >= 100 ? new Date() : null,
    };

    if (existingProgress) {
      // Update existing progress
      return await this.prisma.lessonProgress.update({
        where: {
          student_id_lesson_id: {
            student_id: studentId,
            lesson_id: lessonId,
          },
        },
        data: progressData,
      });
    } else {
      // Create new progress record
      return await this.prisma.lessonProgress.create({
        data: {
          id: uuidv4(),
          ...progressData,
        },
      });
    }
  }

  async getStudentCourseProgress(studentId: string, courseId: string) {
    // Validate UUID formats
    UuidValidator.validateMultiple({
      'student ID': studentId,
      'course ID': courseId,
    });

    // Check if student is enrolled in the course
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        student_id: studentId,
        course_id: courseId,
        status: 'active',
      },
    });

    if (!enrollment) {
      throw new NotFoundException('You are not enrolled in this course');
    }

    // Get course with all related data
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        modules: {
          where: { is_published: true },
          orderBy: { order_index: 'asc' },
          include: {
            lessons: {
              where: { is_published: true },
              orderBy: { order_index: 'asc' },
            },
            assignments: {
              where: { is_published: true },
              orderBy: { created_at: 'asc' },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get student's progress for all lessons
    const lessonProgress = await this.prisma.lessonProgress.findMany({
      where: {
        student_id: studentId,
        lesson: {
          module: {
            course_id: courseId,
          },
        },
      },
    });

    // Get student's assignment submissions
    const assignmentSubmissions = await this.prisma.assignmentSubmission.findMany({
      where: {
        student_id: studentId,
        assignment: {
          module: {
            course_id: courseId,
          },
        },
      },
    });

    // Create progress map for quick lookup
    const progressMap = new Map();
    lessonProgress.forEach((progress) => {
      progressMap.set(progress.lesson_id, progress);
    });

    const submissionMap = new Map();
    assignmentSubmissions.forEach((submission) => {
      submissionMap.set(submission.assignment_id, submission);
    });

    // Calculate progress for each module and lesson
    let totalLessons = 0;
    let completedLessons = 0;
    let totalModules = 0;
    let completedModules = 0;
    let totalEstimatedDuration = 0;

    const modulesWithProgress = course.modules.map((module) => {
      const moduleLessons = module.lessons.map((lesson) => {
        const progress = progressMap.get(lesson.id);
        const isCompleted = progress?.is_completed || false;
        const completionPercentage = progress?.completion_percentage || 0;
        const isUnlocked = this.isLessonUnlocked(lesson, module.lessons, progressMap);

        if (isCompleted) completedLessons++;
        totalLessons++;

        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          content: lesson.content,
          order_index: lesson.order_index,
          is_published: lesson.is_published,
          difficulty: lesson.difficulty,
          estimated_duration: lesson.estimated_duration,
          tags: lesson.tags,
          is_completed: isCompleted,
          is_unlocked: isUnlocked,
          completion_percentage: completionPercentage,
          last_accessed: progress?.last_accessed,
          completed_at: progress?.completed_at,
        };
      });

      const moduleCompletedLessons = moduleLessons.filter((lesson) => lesson.is_completed).length;
      const moduleCompletionPercentage =
        moduleLessons.length > 0
          ? Math.round((moduleCompletedLessons / moduleLessons.length) * 100)
          : 0;

      const moduleTotalDuration = moduleLessons.reduce(
        (sum, lesson) => sum + (lesson.estimated_duration || 0),
        0,
      );

      totalEstimatedDuration += moduleTotalDuration;

      if (moduleCompletionPercentage === 100) completedModules++;
      totalModules++;

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        order_index: module.order_index,
        is_published: module.is_published,
        lessons: moduleLessons,
        total_lessons: moduleLessons.length,
        completed_lessons: moduleCompletedLessons,
        completion_percentage: moduleCompletionPercentage,
        total_duration: moduleTotalDuration,
      };
    });

    // Process assignments
    const assignmentsWithProgress = course.modules.flatMap((module) =>
      module.assignments.map((assignment) => {
        const submission = submissionMap.get(assignment.id);
        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          assignment_type: assignment.assignment_type,
          assignment_subtype: assignment.assignment_subtype,
          difficulty: assignment.difficulty,
          points: assignment.points,
          due_date: assignment.due_date,
          is_published: assignment.is_published,
          is_submitted: !!submission,
          score: submission?.score,
          submitted_at: submission?.submitted_at,
        };
      }),
    );

    const courseCompletionPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      thumbnail: course.thumbnail,
      status: course.status,
      instructor: course.instructor,
      modules: modulesWithProgress,
      assignments: assignmentsWithProgress,
      total_modules: totalModules,
      completed_modules: completedModules,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      course_completion_percentage: courseCompletionPercentage,
      total_estimated_duration: totalEstimatedDuration,
      enrolled_at: enrollment.enrolled_at,
      last_accessed: enrollment.enrolled_at, // You might want to track this separately
      created_at: course.created_at,
      updated_at: course.updated_at,
    };
  }

  async getAdminCourseView(courseId: string) {
    // Validate UUID format
    UuidValidator.validate(courseId, 'course ID');

    // Get course with all related data (no enrollment check for admin)
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        modules: {
          where: { is_published: true },
          orderBy: { order_index: 'asc' },
          include: {
            lessons: {
              where: { is_published: true },
              orderBy: { order_index: 'asc' },
            },
            assignments: {
              where: { is_published: true },
              orderBy: { created_at: 'asc' },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Calculate course statistics without student-specific progress
    let totalLessons = 0;
    let totalModules = 0;
    let totalEstimatedDuration = 0;

    const modulesWithStructure = course.modules.map((module) => {
      const moduleLessons = module.lessons.map((lesson) => {
        totalLessons++;

        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          content: lesson.content,
          order_index: lesson.order_index,
          is_published: lesson.is_published,
          difficulty: lesson.difficulty,
          estimated_duration: lesson.estimated_duration,
          tags: lesson.tags,
          is_completed: false, // No student progress for admin view
          is_unlocked: true, // All lessons visible to admin
          completion_percentage: 0,
          last_accessed: null,
          completed_at: null,
        };
      });

      const moduleTotalDuration = moduleLessons.reduce(
        (sum, lesson) => sum + (lesson.estimated_duration || 0),
        0,
      );

      totalEstimatedDuration += moduleTotalDuration;
      totalModules++;

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        order_index: module.order_index,
        is_published: module.is_published,
        lessons: moduleLessons,
        total_lessons: moduleLessons.length,
        completed_lessons: 0, // No student progress
        completion_percentage: 0,
        total_duration: moduleTotalDuration,
      };
    });

    // Process assignments (no submission data for admin view)
    const assignmentsWithStructure = course.modules.flatMap((module) =>
      module.assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        assignment_type: assignment.assignment_type,
        assignment_subtype: assignment.assignment_subtype,
        difficulty: assignment.difficulty,
        points: assignment.points,
        due_date: assignment.due_date,
        is_published: assignment.is_published,
        is_submitted: false, // No student submissions
        score: null,
        submitted_at: null,
      })),
    );

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      thumbnail: course.thumbnail,
      status: course.status,
      instructor: course.instructor,
      modules: modulesWithStructure,
      assignments: assignmentsWithStructure,
      total_modules: totalModules,
      completed_modules: 0, // No student progress
      total_lessons: totalLessons,
      completed_lessons: 0, // No student progress
      course_completion_percentage: 0, // No student progress
      total_estimated_duration: totalEstimatedDuration,
      enrolled_at: null, // Admin not enrolled
      last_accessed: null,
      created_at: course.created_at,
      updated_at: course.updated_at,
    };
  }

  private isLessonUnlocked(lesson: any, allLessons: any[], progressMap: Map<string, any>): boolean {
    // First lesson is always unlocked
    if (lesson.order_index === 1) return true;

    // Find the previous lesson
    const previousLesson = allLessons.find((l) => l.order_index === lesson.order_index - 1);

    if (!previousLesson) return true;

    // Check if previous lesson is completed
    const previousProgress = progressMap.get(previousLesson.id);
    return previousProgress?.is_completed || false;
  }
}
