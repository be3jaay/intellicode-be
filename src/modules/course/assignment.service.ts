import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import { UuidValidator } from '@/common/utils/uuid.validator';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentResponseDto,
  AssignmentQueryDto,
  PaginatedAssignmentsResponseDto,
  AssignmentSubmissionDto,
  AssignmentSubmissionResponseDto,
  CodeSubmissionDto,
  StudentScoreDto,
  ManualGradingDto,
  AssignmentGradingResponseDto,
  AssignmentType,
  AssignmentSubtype,
  DifficultyLevel,
  ExamQuestionType,
} from './dto/assignment.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAssignment(
    createAssignmentDto: CreateAssignmentDto,
    instructorId: string,
    moduleId: string,
  ): Promise<AssignmentResponseDto> {
    const { questions, attachment, ...assignmentData } = createAssignmentDto;

    // Validate module exists and belongs to instructor
    const module = await this.prisma.module.findFirst({
      where: {
        id: moduleId,
        course: {
          instructor_id: instructorId,
        },
      },
      include: {
        course: true,
      },
    });

    if (!module) {
      throw new NotFoundException(
        'Module not found or you do not have permission to create assignments in this module',
      );
    }

    // Auto-enable secured browser for quiz and exam types
    const secured_browser =
      assignmentData.secured_browser ||
      assignmentData.assignmentType === AssignmentType.activity ||
      assignmentData.assignmentType === AssignmentType.exam;

    // Handle assignment subtype-specific logic
    const processedData = this.processAssignmentData(assignmentData, questions);

    // Create assignment
    const assignment = await this.prisma.assignment.create({
      data: {
        id: uuidv4(),
        module_id: moduleId,
        title: processedData.title,
        description: processedData.description,
        assignment_type: processedData.assignmentType,
        assignment_subtype: processedData.assignmentSubtype,
        difficulty: processedData.difficulty,
        points: processedData.points,
        due_date: processedData.dueDate ? new Date(processedData.dueDate) : null,
        is_published: true,
        secured_browser: secured_browser,
        starter_code: processedData.starterCode,
        questions: processedData.questions
          ? {
              create: processedData.questions.map((question, index) => ({
                id: uuidv4(),
                question_text: question.question,
                question_type: question.type,
                points: question.points,
                order_index: index + 1,
                correct_answer: question.correct_answer,
                correct_answers: question.correct_answers || [],
                options: question.options || [],
                explanation: question.explanation,
                case_sensitive: question.case_sensitive || false,
                is_true: question.is_true,
              })),
            }
          : undefined,
      },
      include: {
        questions: {
          orderBy: { order_index: 'asc' },
        },
      },
    });

    // Handle file upload for file_upload assignments
    if (assignmentData.assignmentSubtype === AssignmentSubtype.file_upload && attachment) {
      try {
        const fileUrl = await this.supabaseService.uploadFile(
          attachment,
          'assignments',
          'assignment-files',
          module.course_id,
        );

        await this.prisma.fileStorage.create({
          data: {
            id: uuidv4(),
            filename: attachment.filename || attachment.name,
            original_name: attachment.originalname || attachment.name,
            file_type: this.getFileTypeFromMime(attachment.mimetype),
            category: 'assignment',
            mime_type: attachment.mimetype,
            size: attachment.size,
            public_url: fileUrl,
            storage_path: `assignments/${assignment.id}/${attachment.filename || attachment.name}`,
            course_id: module.course_id,
            module_id: moduleId,
            assignment_id: assignment.id,
          },
        });
      } catch (error) {
        // If file upload fails, delete the assignment
        await this.prisma.assignment.delete({ where: { id: assignment.id } });
        throw new BadRequestException(`Failed to upload assignment file: ${error.message}`);
      }
    }

    // Send notifications to enrolled students if assignment is published
    if (assignment.is_published) {
      await this.notificationsService.notifyStudentsNewAssignment(
        module.course_id,
        assignment.id,
        assignment.title,
        module.title,
      );
    }

    return this.formatAssignmentResponse(assignment);
  }

  async createAssignmentWithFile(
    createAssignmentDto: CreateAssignmentDto,
    instructorId: string,
    moduleId: string,
    attachmentFile: Express.Multer.File,
  ): Promise<AssignmentResponseDto> {
    const { questions, ...assignmentData } = createAssignmentDto;

    // Validate module exists and belongs to instructor
    const module = await this.prisma.module.findFirst({
      where: {
        id: moduleId,
        course: {
          instructor_id: instructorId,
        },
      },
      include: {
        course: true,
      },
    });

    if (!module) {
      throw new NotFoundException(
        'Module not found or you do not have permission to create assignments in this module',
      );
    }

    // Auto-enable secured browser for quiz and exam types
    const secured_browser =
      assignmentData.secured_browser ||
      assignmentData.assignmentType === AssignmentType.activity ||
      assignmentData.assignmentType === AssignmentType.exam;

    // Handle assignment subtype-specific logic
    const processedData = this.processAssignmentData(assignmentData, questions);

    // Create assignment
    const assignment = await this.prisma.assignment.create({
      data: {
        id: uuidv4(),
        module_id: moduleId,
        title: processedData.title,
        description: processedData.description,
        assignment_type: processedData.assignmentType,
        assignment_subtype: processedData.assignmentSubtype,
        difficulty: processedData.difficulty,
        points: processedData.points,
        due_date: processedData.dueDate ? new Date(processedData.dueDate) : null,
        is_published: true,
        secured_browser: secured_browser,
        starter_code: processedData.starterCode,
        questions: processedData.questions
          ? {
              create: processedData.questions.map((question, index) => ({
                id: uuidv4(),
                question_text: question.question,
                question_type: question.type,
                points: question.points,
                order_index: index + 1,
                correct_answer: question.correct_answer,
                correct_answers: question.correct_answers || [],
                options: question.options || [],
                explanation: question.explanation,
                case_sensitive: question.case_sensitive || false,
                is_true: question.is_true,
              })),
            }
          : undefined,
      },
      include: {
        questions: {
          orderBy: { order_index: 'asc' },
        },
      },
    });

    // Handle file upload for assignments
    if (attachmentFile) {
      try {
        const fileUrl = await this.supabaseService.uploadFile(
          attachmentFile,
          'assignments',
          'assignment-files',
          module.course_id,
        );

        await this.prisma.fileStorage.create({
          data: {
            id: uuidv4(),
            filename: attachmentFile.filename || attachmentFile.originalname,
            original_name: attachmentFile.originalname,
            file_type: this.getFileTypeFromMime(attachmentFile.mimetype),
            category: 'assignment',
            mime_type: attachmentFile.mimetype,
            size: attachmentFile.size,
            public_url: fileUrl,
            storage_path: `assignments/${assignment.id}/${attachmentFile.filename || attachmentFile.originalname}`,
            course_id: module.course_id,
            module_id: moduleId,
            assignment_id: assignment.id,
          },
        });
      } catch (error) {
        // If file upload fails, delete the assignment
        await this.prisma.assignment.delete({ where: { id: assignment.id } });
        throw new BadRequestException(`Failed to upload assignment file: ${error.message}`);
      }
    }

    // Send notifications to enrolled students if assignment is published
    if (assignment.is_published) {
      await this.notificationsService.notifyStudentsNewAssignment(
        module.course_id,
        assignment.id,
        assignment.title,
        module.title,
      );
    }

    return this.formatAssignmentResponse(assignment);
  }

  async getModuleAssignments(
    moduleId: string,
    query: AssignmentQueryDto,
    userId?: string,
  ): Promise<PaginatedAssignmentsResponseDto> {
    UuidValidator.validate(moduleId, 'module ID');

    // Check if user has access to the module and determine if they are the instructor
    let isInstructor = false;
    if (userId) {
      const module = await this.prisma.module.findFirst({
        where: {
          id: moduleId,
          OR: [
            { course: { instructor_id: userId } },
            { course: { enrollments: { some: { student_id: userId, status: 'active' } } } },
          ],
        },
        include: {
          course: {
            select: {
              instructor_id: true,
            },
          },
        },
      });

      if (!module) {
        throw new NotFoundException('Module not found or you do not have access to it');
      }

      isInstructor = module.course.instructor_id === userId;
    }

    const {
      offset = 0,
      limit = 10,
      assignment_type,
      assignment_subtype,
      difficulty,
      is_published,
      secured_browser,
      search,
    } = query;

    const where: any = { module_id: moduleId };

    if (assignment_type) {
      where.assignment_type = assignment_type;
    }

    if (assignment_subtype) {
      where.assignment_subtype = assignment_subtype;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (is_published !== undefined) {
      where.is_published = is_published;
    }

    if (secured_browser !== undefined) {
      where.secured_browser = secured_browser;
    }

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const total = await this.prisma.assignment.count({ where });

    const assignments = await this.prisma.assignment.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        questions: {
          orderBy: { order_index: 'asc' },
        },
        attachments: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      data: assignments.map((assignment) =>
        this.formatAssignmentResponse(assignment, isInstructor),
      ),
      total,
      offset,
      limit,
      totalPages,
      currentPage,
    };
  }

  async getAssignmentById(assignmentId: string, userId?: string): Promise<AssignmentResponseDto> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        ...(userId
          ? {
              OR: [
                { module: { course: { instructor_id: userId } } },
                {
                  module: {
                    course: { enrollments: { some: { student_id: userId, status: 'active' } } },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        questions: {
          orderBy: { order_index: 'asc' },
        },
        attachments: true,
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found or you do not have access to it');
    }

    // Determine if the current user is the instructor
    const isInstructor = userId && assignment.module.course.instructor_id === userId;

    // Determine if the current user already submitted this assignment
    let alreadySubmitted = false;
    if (userId) {
      const existingSubmission = await this.prisma.assignmentSubmission.findFirst({
        where: {
          assignment_id: assignment.id,
          student_id: userId,
        },
        select: { id: true },
      });
      alreadySubmitted = !!existingSubmission;
    }

    return {
      ...this.formatAssignmentResponse(assignment, isInstructor),
      already_submitted: alreadySubmitted,
    };
  }

  async updateAssignment(
    assignmentId: string,
    updateAssignmentDto: UpdateAssignmentDto,
    instructorId: string,
  ): Promise<AssignmentResponseDto> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    // Check if assignment exists and belongs to instructor
    const existingAssignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        module: {
          course: {
            instructor_id: instructorId,
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

    if (!existingAssignment) {
      throw new NotFoundException(
        'Assignment not found or you do not have permission to update it',
      );
    }

    const { questions, ...assignmentData } = updateAssignmentDto;

    // Auto-enable secured browser for quiz and exam types if not explicitly set
    const secured_browser =
      assignmentData.secured_browser !== undefined
        ? assignmentData.secured_browser
        : assignmentData.assignmentType === AssignmentType.activity ||
          assignmentData.assignmentType === AssignmentType.exam;

    // Handle assignment subtype-specific logic
    const processedData = this.processAssignmentData(assignmentData, questions);

    // Check if assignment is being published for the first time
    const wasUnpublished = !existingAssignment.is_published;
    const isBeingPublished = processedData.is_published === true;

    // Update assignment - only include fields that are defined
    const updateData: any = {};

    if (processedData.title !== undefined) updateData.title = processedData.title;
    if (processedData.description !== undefined) updateData.description = processedData.description;
    if (processedData.assignmentType !== undefined)
      updateData.assignment_type = processedData.assignmentType;
    if (processedData.assignmentSubtype !== undefined)
      updateData.assignment_subtype = processedData.assignmentSubtype;
    if (processedData.difficulty !== undefined) updateData.difficulty = processedData.difficulty;
    if (processedData.points !== undefined) updateData.points = processedData.points;
    if (processedData.dueDate !== undefined)
      updateData.due_date = processedData.dueDate ? new Date(processedData.dueDate) : null;
    if (processedData.is_published !== undefined)
      updateData.is_published = processedData.is_published;
    if (secured_browser !== undefined) updateData.secured_browser = secured_browser;
    if (processedData.starterCode !== undefined)
      updateData.starter_code = processedData.starterCode;

    // Handle questions update separately to avoid foreign key issues
    let assignment;
    if (processedData.questions) {
      // Get all existing question IDs for this assignment
      const existingQuestions = await this.prisma.assignmentQuestion.findMany({
        where: { assignment_id: assignmentId },
        select: { id: true },
      });

      const questionIds = existingQuestions.map((q) => q.id);

      // First, delete all answers related to these questions
      if (questionIds.length > 0) {
        await this.prisma.assignmentAnswer.deleteMany({
          where: { question_id: { in: questionIds } },
        });
      }

      // Then, delete all existing questions
      await this.prisma.assignmentQuestion.deleteMany({
        where: { assignment_id: assignmentId },
      });

      // Finally, update assignment and create new questions
      assignment = await this.prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          ...updateData,
          questions: {
            create: processedData.questions.map((question, index) => ({
              id: uuidv4(),
              question_text: question.question,
              question_type: question.type,
              points: question.points,
              order_index: index + 1,
              correct_answer: question.correct_answer,
              correct_answers: question.correct_answers || [],
              options: question.options || [],
              explanation: question.explanation,
              case_sensitive: question.case_sensitive || false,
              is_true: question.is_true,
            })),
          },
        },
        include: {
          questions: {
            orderBy: { order_index: 'asc' },
          },
          attachments: true,
        },
      });
    } else {
      // Update assignment without touching questions
      assignment = await this.prisma.assignment.update({
        where: { id: assignmentId },
        data: updateData,
        include: {
          questions: {
            orderBy: { order_index: 'asc' },
          },
          attachments: true,
        },
      });
    }

    // Send notifications to enrolled students if assignment is being published for the first time
    if (wasUnpublished && isBeingPublished) {
      await this.notificationsService.notifyStudentsNewAssignment(
        existingAssignment.module.course_id,
        assignment.id,
        assignment.title,
        existingAssignment.module.title,
      );
    }

    return this.formatAssignmentResponse(assignment);
  }

  async deleteAssignment(assignmentId: string, instructorId: string): Promise<void> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    // Check if assignment exists and belongs to instructor
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        module: {
          course: {
            instructor_id: instructorId,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Assignment not found or you do not have permission to delete it',
      );
    }

    // Check if there are any submissions
    const submissionCount = await this.prisma.assignmentSubmission.count({
      where: { assignment_id: assignmentId },
    });

    if (submissionCount > 0) {
      throw new BadRequestException('Cannot delete assignment with existing submissions');
    }

    await this.prisma.assignment.delete({
      where: { id: assignmentId },
    });
  }

  async submitAssignment(
    assignmentId: string,
    submissionDto: AssignmentSubmissionDto,
    studentId: string,
  ): Promise<AssignmentSubmissionResponseDto> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    // Check if assignment exists and is published
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        is_published: true,
      },
      include: {
        module: {
          include: {
            course: {
              include: {
                enrollments: {
                  where: {
                    student_id: studentId,
                    status: 'active',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found or not published');
    }

    if (assignment.module.course.enrollments.length === 0) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    // Check if student already submitted
    const existingSubmission = await this.prisma.assignmentSubmission.findFirst({
      where: {
        assignment_id: assignmentId,
        student_id: studentId,
      },
    });

    if (existingSubmission) {
      throw new BadRequestException('You have already submitted this assignment');
    }

    // Calculate total points
    const totalPoints = await this.prisma.assignmentQuestion.aggregate({
      where: { assignment_id: assignmentId },
      _sum: { points: true },
    });

    const maxScore = totalPoints._sum.points || 0;

    // Create submission
    const submission = await this.prisma.assignmentSubmission.create({
      data: {
        id: uuidv4(),
        assignment_id: assignmentId,
        student_id: studentId,
        max_score: maxScore,
        status: 'submitted',
      },
    });

    // Handle quiz answers
    if (submissionDto.answers && submissionDto.answers.length > 0) {
      // Fetch all questions with correct answers
      const questions = await this.prisma.assignmentQuestion.findMany({
        where: {
          assignment_id: assignmentId,
          id: { in: submissionDto.answers.map((a) => a.question_id) },
        },
      });

      // Create a map for quick lookup
      const questionMap = new Map(questions.map((q) => [q.id, q]));

      const answers = submissionDto.answers.map((answer) => {
        // Validate question ID
        UuidValidator.validate(answer.question_id, 'question ID');

        const question = questionMap.get(answer.question_id);
        if (!question) {
          throw new BadRequestException(
            `Question ${answer.question_id} not found in this assignment`,
          );
        }

        let isCorrect = false;
        let pointsEarned = 0;

        // Check correctness based on question type
        switch (question.question_type) {
          case 'multiple_choice':
            // For multiple choice, check correct_answers array first, then correct_answer
            if (question.correct_answers && question.correct_answers.length > 0) {
              // Split student answer by comma in case of multiple selections
              const studentAnswers =
                answer.answer_text
                  ?.split(',')
                  .map((ans) => ans.trim())
                  .filter((ans) => ans.length > 0) || [];

              // Normalize correct answers
              const correctAnswersNormalized = question.correct_answers.map((ans) =>
                question.case_sensitive ? ans.trim() : ans.trim().toLowerCase(),
              );

              // Normalize student answers
              const studentAnswersNormalized = studentAnswers.map((ans) =>
                question.case_sensitive ? ans : ans.toLowerCase(),
              );

              // Check if student answer matches (either single or multiple)
              if (studentAnswersNormalized.length === 1) {
                // Single answer - check if it's in correct answers
                isCorrect = correctAnswersNormalized.includes(studentAnswersNormalized[0]);
              } else if (studentAnswersNormalized.length > 1) {
                // Multiple answers - check if all student answers are correct and match the expected count
                const allCorrect = studentAnswersNormalized.every((ans) =>
                  correctAnswersNormalized.includes(ans),
                );
                const correctCount =
                  studentAnswersNormalized.length === correctAnswersNormalized.length;
                isCorrect = allCorrect && correctCount;
              }
            } else if (question.correct_answer) {
              // Fallback to single correct_answer
              const studentAnswer = question.case_sensitive
                ? answer.answer_text?.trim()
                : answer.answer_text?.trim().toLowerCase();
              const correctAnswer = question.case_sensitive
                ? question.correct_answer.trim()
                : question.correct_answer.trim().toLowerCase();
              isCorrect = studentAnswer === correctAnswer;
            }
            break;

          case 'true_false':
            // For true/false, compare with is_true
            if (question.is_true !== null && question.is_true !== undefined) {
              const studentAnswer = answer.answer_text?.toLowerCase() === 'true';
              isCorrect = studentAnswer === question.is_true;
            }
            break;

          case 'identification':
            // For identification, check against correct_answer or correct_answers array
            if (question.correct_answers && question.correct_answers.length > 0) {
              // Check if answer is in the array of correct answers
              const studentAnswer = question.case_sensitive
                ? answer.answer_text?.trim()
                : answer.answer_text?.trim().toLowerCase();

              isCorrect = question.correct_answers.some((correctAns) => {
                const compareAns = question.case_sensitive
                  ? correctAns.trim()
                  : correctAns.trim().toLowerCase();
                return studentAnswer === compareAns;
              });
            } else if (question.correct_answer) {
              // Single correct answer
              const studentAnswer = question.case_sensitive
                ? answer.answer_text?.trim()
                : answer.answer_text?.trim().toLowerCase();
              const correctAnswer = question.case_sensitive
                ? question.correct_answer.trim()
                : question.correct_answer.trim().toLowerCase();
              isCorrect = studentAnswer === correctAnswer;
            }
            break;

          case 'enumeration':
            // For enumeration, split by newlines first, then try commas as fallback
            if (question.correct_answers && question.correct_answers.length > 0) {
              // Split student's answer by newlines first, if no newlines found, split by commas
              let studentAnswers =
                answer.answer_text
                  ?.split('\n')
                  .map((ans) => ans.trim())
                  .filter((ans) => ans.length > 0) || [];

              // If no newlines found (only 1 item), try splitting by comma
              if (studentAnswers.length === 1 && studentAnswers[0].includes(',')) {
                studentAnswers =
                  answer.answer_text
                    ?.split(',')
                    .map((ans) => ans.trim())
                    .filter((ans) => ans.length > 0) || [];
              }

              // Normalize correct answers
              const correctAnswersNormalized = question.correct_answers.map((ans) =>
                question.case_sensitive ? ans.trim() : ans.trim().toLowerCase(),
              );

              // Normalize student answers
              const studentAnswersNormalized = studentAnswers.map((ans) =>
                question.case_sensitive ? ans : ans.toLowerCase(),
              );

              // Count how many correct answers the student provided
              let correctCount = 0;
              for (const studentAns of studentAnswersNormalized) {
                if (correctAnswersNormalized.includes(studentAns)) {
                  correctCount++;
                }
              }

              // Calculate score based on percentage of correct answers
              // Full credit if all correct answers are provided
              const totalCorrectAnswers = question.correct_answers.length;
              const percentageCorrect = correctCount / totalCorrectAnswers;

              // Award full points if 100% correct, or partial credit
              if (
                percentageCorrect === 1 &&
                studentAnswersNormalized.length === totalCorrectAnswers
              ) {
                // Full credit: all correct answers provided and no extra wrong answers
                isCorrect = true;
                pointsEarned = question.points;
              } else if (correctCount > 0) {
                // Partial credit based on percentage
                isCorrect = false; // Not fully correct
                pointsEarned = Math.round(question.points * percentageCorrect);
              } else {
                isCorrect = false;
                pointsEarned = 0;
              }
            }
            break;
        }

        // Award points if correct (only for non-enumeration questions)
        // For enumeration, points are already calculated in the switch statement
        if (isCorrect && question.question_type !== 'enumeration') {
          pointsEarned = question.points;
        }

        return {
          id: uuidv4(),
          submission_id: submission.id,
          question_id: answer.question_id,
          answer_text: answer.answer_text,
          is_correct: isCorrect,
          points_earned: pointsEarned,
        };
      });

      await this.prisma.assignmentAnswer.createMany({
        data: answers,
      });

      // Calculate and update the total score
      const totalScore = answers.reduce((sum, answer) => sum + (answer.points_earned || 0), 0);

      await this.prisma.assignmentSubmission.update({
        where: { id: submission.id },
        data: { score: totalScore },
      });
    }

    // Handle file uploads
    if (submissionDto.files && submissionDto.files.length > 0) {
      for (const file of submissionDto.files) {
        try {
          const fileUrl = await this.supabaseService.uploadFile(
            file,
            'assignment-submissions',
            'submission-files',
            assignment.module.course_id,
          );

          await this.prisma.fileStorage.create({
            data: {
              id: uuidv4(),
              filename: file.filename || file.name,
              original_name: file.originalname || file.name,
              file_type: this.getFileTypeFromMime(file.mimetype),
              category: 'assignment',
              mime_type: file.mimetype,
              size: file.size,
              public_url: fileUrl,
              storage_path: `assignment-submissions/${submission.id}/${file.filename || file.name}`,
              course_id: assignment.module.course_id,
              module_id: assignment.module_id,
              assignment_id: assignmentId,
              submission_id: submission.id,
            },
          });
        } catch (error) {
          // If file upload fails, delete the submission
          await this.prisma.assignmentSubmission.delete({ where: { id: submission.id } });
          throw new BadRequestException(`Failed to upload submission file: ${error.message}`);
        }
      }
    }

    // Fetch the updated submission with the correct score
    const updatedSubmission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submission.id },
      include: {
        answers: true,
        files: true,
      },
    });

    return this.formatSubmissionResponse(updatedSubmission);
  }

  async submitAssignmentWithFiles(
    assignmentId: string,
    files: Express.Multer.File[],
    studentId: string,
  ): Promise<AssignmentSubmissionResponseDto> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    // Validate that files are provided
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'At least one file must be uploaded for file_upload assignments',
      );
    }

    // Check if assignment exists and is published
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        is_published: true,
      },
      include: {
        module: {
          include: {
            course: {
              include: {
                enrollments: {
                  where: {
                    student_id: studentId,
                    status: 'active',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found or not published');
    }

    if (assignment.module.course.enrollments.length === 0) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    // Verify assignment is file_upload type
    if (assignment.assignment_subtype !== 'file_upload') {
      throw new BadRequestException(
        'This endpoint is only for file_upload assignments. Use the standard submit endpoint for other types.',
      );
    }

    // Check if student already submitted
    const existingSubmission = await this.prisma.assignmentSubmission.findFirst({
      where: {
        assignment_id: assignmentId,
        student_id: studentId,
      },
    });

    if (existingSubmission) {
      throw new BadRequestException('You have already submitted this assignment');
    }

    // For file upload assignments, max_score is the assignment's points
    const maxScore = assignment.points || 0;

    // Create submission
    const submission = await this.prisma.assignmentSubmission.create({
      data: {
        id: uuidv4(),
        assignment_id: assignmentId,
        student_id: studentId,
        max_score: maxScore,
        score: 0, // Will be graded manually by instructor
        status: 'submitted',
      },
    });

    // Upload files to Supabase and store references
    for (const file of files) {
      try {
        const fileUrl = await this.supabaseService.uploadFile(
          file,
          'assignment-submissions',
          'submission-files',
          assignment.module.course_id,
        );

        await this.prisma.fileStorage.create({
          data: {
            id: uuidv4(),
            filename: file.filename || file.originalname,
            original_name: file.originalname,
            file_type: this.getFileTypeFromMime(file.mimetype),
            category: 'assignment',
            mime_type: file.mimetype,
            size: file.size,
            public_url: fileUrl,
            storage_path: `assignment-submissions/${submission.id}/${file.originalname}`,
            course_id: assignment.module.course_id,
            module_id: assignment.module_id,
            assignment_id: assignmentId,
            submission_id: submission.id,
          },
        });
      } catch (error) {
        // If file upload fails, delete the submission and all previously uploaded files
        await this.prisma.fileStorage.deleteMany({
          where: { submission_id: submission.id },
        });
        await this.prisma.assignmentSubmission.delete({ where: { id: submission.id } });
        throw new BadRequestException(`Failed to upload submission file: ${error.message}`);
      }
    }

    // Fetch the submission with files
    const updatedSubmission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submission.id },
      include: {
        answers: true,
        files: true,
      },
    });

    return this.formatSubmissionResponse(updatedSubmission);
  }

  async submitCodeAssignment(
    assignmentId: string,
    code: string,
    language: string,
    studentId: string,
  ): Promise<AssignmentSubmissionResponseDto> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    // Validate that code is provided
    if (!code || code.trim().length === 0) {
      throw new BadRequestException('Code cannot be empty');
    }

    // Validate that language is provided
    if (!language || language.trim().length === 0) {
      throw new BadRequestException('Programming language must be specified');
    }

    // Check if assignment exists and is published
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        is_published: true,
      },
      include: {
        module: {
          include: {
            course: {
              include: {
                enrollments: {
                  where: {
                    student_id: studentId,
                    status: 'active',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found or not published');
    }

    if (assignment.module.course.enrollments.length === 0) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    // Verify assignment is code_sandbox type
    if (assignment.assignment_subtype !== 'code_sandbox') {
      throw new BadRequestException(
        'This endpoint is only for code_sandbox assignments. Use the appropriate submit endpoint for other types.',
      );
    }

    // Check if student already submitted
    const existingSubmission = await this.prisma.assignmentSubmission.findFirst({
      where: {
        assignment_id: assignmentId,
        student_id: studentId,
      },
    });

    if (existingSubmission) {
      throw new BadRequestException('You have already submitted this assignment');
    }

    // For code sandbox assignments, max_score is the assignment's points
    const maxScore = assignment.points || 0;

    // Create submission with code
    const submission = await this.prisma.assignmentSubmission.create({
      data: {
        id: uuidv4(),
        assignment_id: assignmentId,
        student_id: studentId,
        submitted_code: code,
        code_language: language,
        max_score: maxScore,
        score: 0, // Code submissions require manual grading
        status: 'submitted',
      },
    });

    // Fetch the submission to return
    const createdSubmission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submission.id },
      include: {
        answers: true,
        files: true,
      },
    });

    return this.formatSubmissionResponse(createdSubmission);
  }

  async getStudentSubmissions(
    assignmentId: string,
    studentId: string,
  ): Promise<AssignmentSubmissionResponseDto[]> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: {
        assignment_id: assignmentId,
        student_id: studentId,
      },
      include: {
        answers: true,
        files: true,
      },
      orderBy: { submitted_at: 'desc' },
    });

    return submissions.map((submission) => this.formatSubmissionResponse(submission));
  }

  async getAssignmentStudentScores(
    assignmentId: string,
    instructorId: string,
  ): Promise<StudentScoreDto[]> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    // Check if assignment exists and belongs to instructor
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        module: {
          course: {
            instructor_id: instructorId,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Assignment not found or you do not have permission to view scores',
      );
    }

    // Get all submissions for this assignment
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: {
        assignment_id: assignmentId,
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
          },
        },
      },
      orderBy: { submitted_at: 'desc' },
    });

    return submissions.map((submission) => {
      const percentage =
        submission.max_score > 0 ? Math.round((submission.score / submission.max_score) * 100) : 0;

      return {
        student_id: submission.student_id,
        student_name: `${submission.student.first_name} ${submission.student.last_name}`,
        student_email: submission.student.email,
        student_number: submission.student.student_number,
        score: submission.score,
        max_score: submission.max_score,
        percentage,
        status: submission.status,
        submitted_at: submission.submitted_at,
      };
    });
  }

  async getAssignmentSubmissionsForGrading(
    assignmentId: string,
    instructorId: string,
  ): Promise<AssignmentGradingResponseDto[]> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    // Check if assignment exists and belongs to instructor
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        module: {
          course: {
            instructor_id: instructorId,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Assignment not found or you do not have permission to view submissions',
      );
    }

    // Get all submissions for this assignment
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: {
        assignment_id: assignmentId,
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
            profile_picture: true,
          },
        },
        files: true,
      },
      orderBy: { submitted_at: 'desc' },
    });

    return submissions.map((submission) => ({
      id: submission.id,
      assignment_id: submission.assignment_id,
      student_id: submission.student_id,
      score: submission.score,
      max_score: submission.max_score,
      status: submission.status,
      submitted_at: submission.submitted_at,
      graded_at: new Date(),
      files: submission.files,
      submitted_code: submission.submitted_code,
      code_language: submission.code_language,
      assignment_title: assignment.title,
      assignment_description: assignment.description,
      assignment_difficulty: assignment.difficulty,
      assignment_due_date: assignment.due_date,
      student: {
        id: submission.student.id,
        first_name: submission.student.first_name,
        last_name: submission.student.last_name,
        email: submission.student.email,
        student_number: submission.student.student_number,
        profile_picture: submission.student.profile_picture,
      },
    }));
  }

  async manuallyGradeSubmission(
    gradingDto: ManualGradingDto,
    instructorId: string,
  ): Promise<AssignmentGradingResponseDto> {
    UuidValidator.validate(gradingDto.submission_id, 'submission ID');

    // Check if submission exists and instructor has permission
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: {
        id: gradingDto.submission_id,
        assignment: {
          module: {
            course: {
              instructor_id: instructorId,
            },
          },
        },
      },
      include: {
        assignment: {
          select: {
            title: true,
            description: true,
            difficulty: true,
            due_date: true,
          },
        },
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
          },
        },
        files: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found or you do not have permission to grade it');
    }

    // Update the submission with manual grade
    const updatedSubmission = await this.prisma.assignmentSubmission.update({
      where: { id: gradingDto.submission_id },
      data: {
        score: gradingDto.score,
        status: gradingDto.mark_as_graded ? 'graded' : 'submitted',
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
          },
        },
        files: true,
      },
    });

    return {
      id: updatedSubmission.id,
      assignment_id: updatedSubmission.assignment_id,
      student_id: updatedSubmission.student_id,
      score: updatedSubmission.score,
      max_score: updatedSubmission.max_score,
      status: updatedSubmission.status,
      submitted_at: updatedSubmission.submitted_at,
      graded_at: new Date(),
      files: updatedSubmission.files,
      submitted_code: updatedSubmission.submitted_code,
      code_language: updatedSubmission.code_language,
      assignment_title: submission.assignment.title,
      assignment_description: submission.assignment.description,
      assignment_difficulty: submission.assignment.difficulty,
      assignment_due_date: submission.assignment.due_date,
      student: {
        id: updatedSubmission.student.id,
        first_name: updatedSubmission.student.first_name,
        last_name: updatedSubmission.student.last_name,
        email: updatedSubmission.student.email,
        student_number: updatedSubmission.student.student_number,
      },
    };
  }

  async undoStudentSubmission(
    assignmentId: string,
    studentId: string,
    userId: string,
    isInstructor: boolean,
  ): Promise<{ success: boolean; message: string }> {
    UuidValidator.validateMultiple({
      'assignment ID': assignmentId,
      'student ID': studentId,
      'user ID': userId,
    });

    // Check if assignment exists
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
      },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Check permissions
    if (isInstructor) {
      // Instructor must own the course
      if (assignment.module.course.instructor_id !== userId) {
        throw new ForbiddenException('You do not have permission to manage this assignment');
      }
    } else {
      // Student can only undo their own submission
      if (studentId !== userId) {
        throw new ForbiddenException('You can only undo your own submission');
      }

      // Student can only undo file_upload assignments
      if (assignment.assignment_subtype !== 'file_upload') {
        throw new BadRequestException(
          'Students can only undo file upload submissions. Contact your instructor for other assignment types.',
        );
      }
    }

    // Find the student's submission
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: {
        assignment_id: assignmentId,
        student_id: studentId,
      },
      include: {
        answers: true,
        files: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('No submission found for this student');
    }

    // Students cannot undo graded submissions
    if (!isInstructor && submission.status === 'graded') {
      throw new BadRequestException(
        'Cannot undo a graded submission. Please contact your instructor.',
      );
    }

    // Delete all associated files from storage if any
    if (submission.files && submission.files.length > 0) {
      // Delete file records from database
      await this.prisma.fileStorage.deleteMany({
        where: { submission_id: submission.id },
      });

      // Note: You might want to also delete files from Supabase storage here
      // For now, just deleting the database records
    }

    // Delete all associated answers if any
    if (submission.answers && submission.answers.length > 0) {
      await this.prisma.assignmentAnswer.deleteMany({
        where: { submission_id: submission.id },
      });
    }

    // Delete the submission
    await this.prisma.assignmentSubmission.delete({
      where: { id: submission.id },
    });

    return {
      success: true,
      message: isInstructor
        ? `Submission for student ${studentId} has been successfully reset. The student can now resubmit the assignment.`
        : 'Your submission has been successfully removed. You can now resubmit the assignment.',
    };
  }

  private formatAssignmentResponse(
    assignment: any,
    showAnswers: boolean = true,
  ): AssignmentResponseDto {
    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      assignmentType: assignment.assignment_type,
      assignmentSubtype: assignment.assignment_subtype,
      difficulty: assignment.difficulty,
      points: assignment.points,
      dueDate: assignment.due_date,
      is_published: assignment.is_published,
      secured_browser: assignment.secured_browser,
      module_id: assignment.module_id,
      created_at: assignment.created_at,
      updated_at: assignment.updated_at,
      attachments: assignment.attachments,
      questions: assignment.questions?.map((q) => ({
        id: q.id,
        question: q.question_text,
        type: q.question_type,
        points: q.points,
        // Hide correct answers from students, show to instructors
        correct_answer: showAnswers ? q.correct_answer : null,
        correct_answers: showAnswers ? q.correct_answers : [],
        options: q.options, // Options are always shown (for multiple choice)
        explanation: showAnswers ? q.explanation : null, // Hide explanation from students
        case_sensitive: showAnswers ? q.case_sensitive : null,
        is_true: showAnswers ? q.is_true : null, // Hide correct answer for true/false
      })),
      starterCode: assignment.starter_code,
      already_submitted: false,
    };
  }

  private formatSubmissionResponse(submission: any): AssignmentSubmissionResponseDto {
    return {
      id: submission.id,
      assignment_id: submission.assignment_id,
      student_id: submission.student_id,
      score: submission.score,
      max_score: submission.max_score,
      submitted_at: submission.submitted_at,
      status: submission.status,
      answers: submission.answers,
      files: submission.files,
      submitted_code: submission.submitted_code,
      code_language: submission.code_language,
    };
  }

  private processAssignmentData(assignmentData: any, questions: any[]): any {
    const processedData = { ...assignmentData };

    switch (assignmentData.assignmentSubtype) {
      case AssignmentSubtype.code_sandbox:
        // For code_sandbox: questions can be empty array, starterCode can be provided
        processedData.questions = questions || [];
        processedData.starterCode = assignmentData.starterCode || null;
        break;

      case AssignmentSubtype.quiz_form:
        // For quiz_form: starterCode should be null, questions can be provided
        processedData.questions = questions || [];
        processedData.starterCode = null;
        break;

      case AssignmentSubtype.file_upload:
        // For file_upload: starterCode should be null, questions can be empty
        processedData.questions = questions || [];
        processedData.starterCode = null;
        break;

      default:
        // Default behavior
        processedData.questions = questions || [];
        processedData.starterCode = assignmentData.starterCode || null;
        break;
    }

    return processedData;
  }

  private getFileTypeFromMime(mimeType: string): 'image' | 'video' | 'pdf' | 'document' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'document';
  }
}
