import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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
  StudentScoreDto,
  ManualGradingDto,
  AssignmentGradingResponseDto,
  AssignmentType,
  AssignmentSubtype,
  DifficultyLevel,
  ExamQuestionType
} from './dto/assignment.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAssignment(createAssignmentDto: CreateAssignmentDto, instructorId: string, moduleId: string): Promise<AssignmentResponseDto> {
    const { questions, attachment, ...assignmentData } = createAssignmentDto;

    // Validate module exists and belongs to instructor
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
      throw new NotFoundException('Module not found or you do not have permission to create assignments in this module');
    }

    // Auto-enable secured browser for quiz and exam types
    const securedBrowser = assignmentData.secured_browser || 
      (assignmentData.assignmentType === AssignmentType.activity || assignmentData.assignmentType === AssignmentType.exam);

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
        is_published: false,
        secured_browser: securedBrowser,
        starter_code: processedData.starterCode,
        questions: processedData.questions ? {
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
            is_true: question.is_true
          }))
        } : undefined
      },
      include: {
        questions: {
          orderBy: { order_index: 'asc' }
        }
      }
    });

    // Handle file upload for file_upload assignments
    if (assignmentData.assignmentSubtype === AssignmentSubtype.file_upload && attachment) {
      try {
        const fileUrl = await this.supabaseService.uploadFile(
          attachment,
          'assignments',
          'assignment-files',
          module.course_id
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
            assignment_id: assignment.id
          }
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

  async createAssignmentWithFile(createAssignmentDto: CreateAssignmentDto, instructorId: string, moduleId: string, attachmentFile: Express.Multer.File): Promise<AssignmentResponseDto> {
    const { questions, ...assignmentData } = createAssignmentDto;

    // Validate module exists and belongs to instructor
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
      throw new NotFoundException('Module not found or you do not have permission to create assignments in this module');
    }

    // Auto-enable secured browser for quiz and exam types
    const securedBrowser = assignmentData.secured_browser || 
      (assignmentData.assignmentType === AssignmentType.activity || assignmentData.assignmentType === AssignmentType.exam);

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
        is_published: false,
        secured_browser: securedBrowser,
        starter_code: processedData.starterCode,
        questions: processedData.questions ? {
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
            is_true: question.is_true
          }))
        } : undefined
      },
      include: {
        questions: {
          orderBy: { order_index: 'asc' }
        }
      }
    });

    // Handle file upload for assignments
    if (attachmentFile) {
      try {
        const fileUrl = await this.supabaseService.uploadFile(
          attachmentFile,
          'assignments',
          'assignment-files',
          module.course_id
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
            assignment_id: assignment.id
          }
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

  async getModuleAssignments(moduleId: string, query: AssignmentQueryDto, userId?: string): Promise<PaginatedAssignmentsResponseDto> {
    UuidValidator.validate(moduleId, 'module ID');

    // Check if user has access to the module
    if (userId) {
      const module = await this.prisma.module.findFirst({
        where: {
          id: moduleId,
          OR: [
            { course: { instructor_id: userId } },
            { course: { enrollments: { some: { student_id: userId, status: 'active' } } } }
          ]
        }
      });

      if (!module) {
        throw new NotFoundException('Module not found or you do not have access to it');
      }
    }

    const { offset = 0, limit = 10, assignment_type, assignment_subtype, difficulty, is_published, secured_browser, search } = query;

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
        mode: 'insensitive'
      };
    }

    const total = await this.prisma.assignment.count({ where });

    const assignments = await this.prisma.assignment.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        questions: {
          orderBy: { order_index: 'asc' }
        },
        attachments: true
      },
      orderBy: { created_at: 'desc' }
    });

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      data: assignments.map(assignment => this.formatAssignmentResponse(assignment)),
      total,
      offset,
      limit,
      totalPages,
      currentPage
    };
  }

  async getAssignmentById(assignmentId: string, userId?: string): Promise<AssignmentResponseDto> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        ...(userId ? {
          OR: [
            { module: { course: { instructor_id: userId } } },
            { module: { course: { enrollments: { some: { student_id: userId, status: 'active' } } } } }
          ]
        } : {})
      },
      include: {
        questions: {
          orderBy: { order_index: 'asc' }
        },
        attachments: true,
        module: {
          include: {
            course: true
          }
        }
      }
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found or you do not have access to it');
    }

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
      ...this.formatAssignmentResponse(assignment),
      already_submitted: alreadySubmitted,
    };
  }

  async updateAssignment(assignmentId: string, updateAssignmentDto: UpdateAssignmentDto, instructorId: string): Promise<AssignmentResponseDto> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    // Check if assignment exists and belongs to instructor
    const existingAssignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        module: {
          course: {
            instructor_id: instructorId
          }
        }
      },
      include: {
        module: {
          include: {
            course: true
          }
        }
      }
    });

    if (!existingAssignment) {
      throw new NotFoundException('Assignment not found or you do not have permission to update it');
    }

    const { questions, ...assignmentData } = updateAssignmentDto;

    // Auto-enable secured browser for quiz and exam types if not explicitly set
    const securedBrowser = assignmentData.secured_browser !== undefined ? 
      assignmentData.secured_browser : 
      (assignmentData.assignmentType === AssignmentType.activity || assignmentData.assignmentType === AssignmentType.exam);

    // Handle assignment subtype-specific logic
    const processedData = this.processAssignmentData(assignmentData, questions);

    // Check if assignment is being published for the first time
    const wasUnpublished = !existingAssignment.is_published;
    const isBeingPublished = processedData.is_published === true;

    // Update assignment
    const assignment = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...processedData,
        due_date: processedData.dueDate ? new Date(processedData.dueDate) : undefined,
        assignment_type: processedData.assignmentType,
        assignment_subtype: processedData.assignmentSubtype,
        difficulty: processedData.difficulty,
        secured_browser: securedBrowser,
        starter_code: processedData.starterCode,
        questions: processedData.questions ? {
          deleteMany: {},
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
            is_true: question.is_true
          }))
        } : undefined
      },
      include: {
        questions: {
          orderBy: { order_index: 'asc' }
        },
        attachments: true
      }
    });

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
            instructor_id: instructorId
          }
        }
      }
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found or you do not have permission to delete it');
    }

    // Check if there are any submissions
    const submissionCount = await this.prisma.assignmentSubmission.count({
      where: { assignment_id: assignmentId }
    });

    if (submissionCount > 0) {
      throw new BadRequestException('Cannot delete assignment with existing submissions');
    }

    await this.prisma.assignment.delete({
      where: { id: assignmentId }
    });
  }

  async submitAssignment(assignmentId: string, submissionDto: AssignmentSubmissionDto, studentId: string): Promise<AssignmentSubmissionResponseDto> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    // Check if assignment exists and is published
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        is_published: true
      },
      include: {
        module: {
          include: {
            course: {
              include: {
                enrollments: {
                  where: {
                    student_id: studentId,
                    status: 'active'
                  }
                }
              }
            }
          }
        }
      }
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
        student_id: studentId
      }
    });

    if (existingSubmission) {
      throw new BadRequestException('You have already submitted this assignment');
    }

    // Calculate total points
    const totalPoints = await this.prisma.assignmentQuestion.aggregate({
      where: { assignment_id: assignmentId },
      _sum: { points: true }
    });

    const maxScore = totalPoints._sum.points || 0;

    // Create submission
    const submission = await this.prisma.assignmentSubmission.create({
      data: {
        id: uuidv4(),
        assignment_id: assignmentId,
        student_id: studentId,
        max_score: maxScore,
        status: 'submitted'
      }
    });

    // Handle quiz answers
    if (submissionDto.answers && submissionDto.answers.length > 0) {
      const answers = submissionDto.answers.map(answer => ({
        id: uuidv4(),
        submission_id: submission.id,
        question_id: answer.question_id,
        answer_text: answer.answer_text,
        is_correct: answer.is_correct || false,
        points_earned: answer.points_earned || 0
      }));

      // Validate that all question_ids are valid UUIDs
      for (const answer of answers) {
        UuidValidator.validate(answer.question_id, 'question ID');
      }

      await this.prisma.assignmentAnswer.createMany({
        data: answers
      });

      // Calculate and update the total score
      const totalScore = answers.reduce((sum, answer) => sum + (answer.points_earned || 0), 0);
      
      await this.prisma.assignmentSubmission.update({
        where: { id: submission.id },
        data: { score: totalScore }
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
            assignment.module.course_id
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
              submission_id: submission.id
            }
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
        files: true
      }
    });

    return this.formatSubmissionResponse(updatedSubmission);
  }

  async getStudentSubmissions(assignmentId: string, studentId: string): Promise<AssignmentSubmissionResponseDto[]> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: {
        assignment_id: assignmentId,
        student_id: studentId
      },
      include: {
        answers: true,
        files: true
      },
      orderBy: { submitted_at: 'desc' }
    });

    return submissions.map(submission => this.formatSubmissionResponse(submission));
  }

  async getAssignmentStudentScores(assignmentId: string, instructorId: string): Promise<StudentScoreDto[]> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    // Check if assignment exists and belongs to instructor
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        module: {
          course: {
            instructor_id: instructorId
          }
        }
      },
      include: {
        questions: true
      }
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found or you do not have permission to view scores');
    }

    // Get all submissions for this assignment
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: {
        assignment_id: assignmentId
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true
          }
        },
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: { submitted_at: 'desc' }
    });

    return submissions.map(submission => {
      const percentage = submission.max_score > 0 ? Math.round((submission.score / submission.max_score) * 100) : 0;
      
      const questionScores = submission.answers.map(answer => ({
        question_id: answer.question_id,
        question_text: answer.question.question_text,
        points_earned: answer.points_earned,
        max_points: answer.question.points,
        is_correct: answer.is_correct
      }));

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
        question_scores: questionScores
      };
    });
  }

  async getAssignmentSubmissionsForGrading(assignmentId: string, instructorId: string): Promise<AssignmentGradingResponseDto[]> {
    UuidValidator.validate(assignmentId, 'assignment ID');

    // Check if assignment exists and belongs to instructor
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        module: {
          course: {
            instructor_id: instructorId
          }
        }
      }
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found or you do not have permission to view submissions');
    }

    // Get all submissions for this assignment
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: {
        assignment_id: assignmentId
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true
          }
        },
        files: true
      },
      orderBy: { submitted_at: 'desc' }
    });

    return submissions.map(submission => ({
      id: submission.id,
      assignment_id: submission.assignment_id,
      student_id: submission.student_id,
      score: submission.score,
      max_score: submission.max_score,
      status: submission.status,
      submitted_at: submission.submitted_at,
      graded_at: new Date(),
      files: submission.files,
      student: {
        id: submission.student.id,
        first_name: submission.student.first_name,
        last_name: submission.student.last_name,
        email: submission.student.email,
        student_number: submission.student.student_number
      }
    }));
  }

  async manuallyGradeSubmission(gradingDto: ManualGradingDto, instructorId: string): Promise<AssignmentGradingResponseDto> {
    UuidValidator.validate(gradingDto.submission_id, 'submission ID');

    // Check if submission exists and instructor has permission
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: {
        id: gradingDto.submission_id,
        assignment: {
          module: {
            course: {
              instructor_id: instructorId
            }
          }
        }
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true
          }
        },
        files: true
      }
    });

    if (!submission) {
      throw new NotFoundException('Submission not found or you do not have permission to grade it');
    }

    // Update the submission with manual grade
    const updatedSubmission = await this.prisma.assignmentSubmission.update({
      where: { id: gradingDto.submission_id },
      data: {
        score: gradingDto.score,
        status: gradingDto.mark_as_graded ? 'graded' : 'submitted'
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true
          }
        },
        files: true
      }
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
      student: {
        id: updatedSubmission.student.id,
        first_name: updatedSubmission.student.first_name,
        last_name: updatedSubmission.student.last_name,
        email: updatedSubmission.student.email,
        student_number: updatedSubmission.student.student_number
      }
    };
  }

  private formatAssignmentResponse(assignment: any): AssignmentResponseDto {
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
      questions: assignment.questions?.map(q => ({
        id: q.id,
        question: q.question_text,
        type: q.question_type,
        points: q.points,
        correct_answer: q.correct_answer,
        correct_answers: q.correct_answers,
        options: q.options,
        explanation: q.explanation,
        case_sensitive: q.case_sensitive,
        is_true: q.is_true
      })),
      starterCode: assignment.starter_code,
      already_submitted: false
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
      files: submission.files
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
