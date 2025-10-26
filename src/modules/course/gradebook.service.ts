import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { UuidValidator } from '@/common/utils/uuid.validator';
import {
  GradebookQueryDto,
  InstructorGradebookDto,
  InstructorGradebookRowDto,
  StudentGradebookDto,
  GradeSummaryDto,
  CategoryGradesDto,
  AssignmentGradeDto,
  CourseGradeWeightsDto,
  UpdateCourseGradeWeightsDto,
  GradebookSortBy,
  SortOrder,
  SubmissionStatusFilter,
} from './dto/gradebook.dto';

@Injectable()
export class GradebookService {
  constructor(private readonly prisma: PrismaService) {}

  async getInstructorGradebook(
    courseId: string,
    instructorId: string,
    query: GradebookQueryDto,
  ): Promise<InstructorGradebookDto> {
    UuidValidator.validate(courseId, 'course ID');
    UuidValidator.validate(instructorId, 'instructor ID');

    // Verify instructor owns the course
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        instructor_id: instructorId,
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Course not found or you do not have permission to view this gradebook',
      );
    }

    const {
      offset = 0,
      limit = 10,
      sort_by,
      sort_order,
      min_score,
      max_score,
      submission_status,
      section,
      search,
    } = query;

    // Get all enrolled students with filters
    const enrollmentWhere: any = {
      course_id: courseId,
      status: 'active',
    };

    if (section) {
      enrollmentWhere.student = { section };
    }

    if (search) {
      enrollmentWhere.student = {
        ...enrollmentWhere.student,
        OR: [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: enrollmentWhere,
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
            section: true,
            profile_picture: true,
          },
        },
      },
    });

    // Get total assignments for the course
    const totalAssignments = await this.prisma.assignment.count({
      where: {
        module: {
          course_id: courseId,
        },
        is_published: true,
      },
    });

    // Calculate grades for each student
    const studentGrades: InstructorGradebookRowDto[] = [];
    let totalGrades = 0;

    for (const enrollment of enrollments) {
      const gradeData = await this.calculateStudentGrades(courseId, enrollment.student_id);

      // Apply score filters
      if (min_score !== undefined && gradeData.overall_grade < min_score) continue;
      if (max_score !== undefined && gradeData.overall_grade > max_score) continue;

      // Apply submission status filter
      if (
        submission_status === SubmissionStatusFilter.ALL_SUBMITTED &&
        gradeData.total_submissions < totalAssignments
      )
        continue;
      if (
        submission_status === SubmissionStatusFilter.HAS_MISSING &&
        gradeData.total_submissions >= totalAssignments
      )
        continue;

      studentGrades.push({
        student_id: enrollment.student.id,
        first_name: enrollment.student.first_name,
        last_name: enrollment.student.last_name,
        email: enrollment.student.email,
        student_number: enrollment.student.student_number,
        profile_picture: enrollment.student.profile_picture,
        section: enrollment.student.section,
        overall_grade: gradeData.overall_grade,
        assignment_average: gradeData.assignment_average,
        activity_average: gradeData.activity_average,
        exam_average: gradeData.exam_average,
        total_submissions: gradeData.total_submissions,
        total_assignments: totalAssignments,
        has_missing: gradeData.total_submissions < totalAssignments,
        last_submission: gradeData.last_submission,
      });

      totalGrades += gradeData.overall_grade;
    }

    // Sort students
    this.sortGradebook(studentGrades, sort_by, sort_order);

    // Paginate
    const total = studentGrades.length;
    const paginatedData = studentGrades.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    const classAverage = total > 0 ? Math.round(totalGrades / total) : 0;

    return {
      data: paginatedData,
      total,
      offset,
      limit,
      totalPages,
      currentPage,
      class_average: classAverage,
      total_assignments: totalAssignments,
    };
  }

  async getStudentGradebook(courseId: string, studentId: string): Promise<StudentGradebookDto> {
    UuidValidator.validate(courseId, 'course ID');
    UuidValidator.validate(studentId, 'student ID');

    // Verify student is enrolled
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        course_id: courseId,
        student_id: studentId,
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
            section: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('You are not enrolled in this course');
    }

    // Get grade summary
    const gradeSummary = await this.calculateStudentOverallGrade(courseId, studentId);

    // Get all assignment grades
    const assignments = await this.getStudentAssignmentGrades(courseId, studentId);

    return {
      student_id: studentId,
      student: enrollment.student,
      grade_summary: gradeSummary,
      assignments,
    };
  }

  async calculateStudentOverallGrade(
    courseId: string,
    studentId: string,
  ): Promise<GradeSummaryDto> {
    const categoryGrades = await this.calculateCategoryGrades(courseId, studentId);
    const weights = await this.getCourseGradeWeights(courseId);

    // Calculate weighted overall grade
    let overallGrade = 0;
    let totalWeight = 0;

    if (categoryGrades.assignment_total > 0) {
      overallGrade += categoryGrades.assignment_average * (weights.assignment_weight / 100);
      totalWeight += weights.assignment_weight;
    }

    if (categoryGrades.activity_total > 0) {
      overallGrade += categoryGrades.activity_average * (weights.activity_weight / 100);
      totalWeight += weights.activity_weight;
    }

    if (categoryGrades.exam_total > 0) {
      overallGrade += categoryGrades.exam_average * (weights.exam_weight / 100);
      totalWeight += weights.exam_weight;
    }

    // Adjust for missing categories
    if (totalWeight > 0 && totalWeight < 100) {
      overallGrade = (overallGrade / totalWeight) * 100;
    }

    return {
      overall_grade: Math.round(overallGrade * 100) / 100,
      category_grades: categoryGrades,
      grade_weights: {
        assignment_weight: weights.assignment_weight,
        activity_weight: weights.activity_weight,
        exam_weight: weights.exam_weight,
      },
      letter_grade: this.calculateLetterGrade(overallGrade),
    };
  }

  async calculateCategoryGrades(courseId: string, studentId: string): Promise<CategoryGradesDto> {
    // Get all modules for the course
    const modules = await this.prisma.module.findMany({
      where: { course_id: courseId },
      select: { id: true },
    });

    const moduleIds = modules.map((m) => m.id);

    // Get all published assignments
    const assignments = await this.prisma.assignment.findMany({
      where: {
        module_id: { in: moduleIds },
        is_published: true,
      },
      select: {
        id: true,
        assignment_type: true,
        points: true,
      },
    });

    // Get student submissions
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: {
        student_id: studentId,
        assignment_id: { in: assignments.map((a) => a.id) },
      },
      select: {
        assignment_id: true,
        score: true,
        max_score: true,
      },
    });

    // Create submission map
    const submissionMap = new Map(submissions.map((s) => [s.assignment_id, s]));

    // Calculate category grades
    const categories = {
      assignment: { total: 0, submitted: 0, scoreSum: 0, maxScoreSum: 0 },
      activity: { total: 0, submitted: 0, scoreSum: 0, maxScoreSum: 0 },
      exam: { total: 0, submitted: 0, scoreSum: 0, maxScoreSum: 0 },
    };

    for (const assignment of assignments) {
      const category = categories[assignment.assignment_type as keyof typeof categories];
      if (!category) continue;

      category.total++;
      const submission = submissionMap.get(assignment.id);

      if (submission) {
        category.submitted++;
        category.scoreSum += submission.score;
        category.maxScoreSum += submission.max_score;
      }
    }

    return {
      assignment_average:
        categories.assignment.maxScoreSum > 0
          ? Math.round(
              (categories.assignment.scoreSum / categories.assignment.maxScoreSum) * 10000,
            ) / 100
          : 0,
      assignment_submitted: categories.assignment.submitted,
      assignment_total: categories.assignment.total,
      activity_average:
        categories.activity.maxScoreSum > 0
          ? Math.round((categories.activity.scoreSum / categories.activity.maxScoreSum) * 10000) /
            100
          : 0,
      activity_submitted: categories.activity.submitted,
      activity_total: categories.activity.total,
      exam_average:
        categories.exam.maxScoreSum > 0
          ? Math.round((categories.exam.scoreSum / categories.exam.maxScoreSum) * 10000) / 100
          : 0,
      exam_submitted: categories.exam.submitted,
      exam_total: categories.exam.total,
    };
  }

  async getStudentAssignmentGrades(
    courseId: string,
    studentId: string,
  ): Promise<AssignmentGradeDto[]> {
    // Get all modules for the course
    const modules = await this.prisma.module.findMany({
      where: { course_id: courseId },
      select: { id: true, title: true },
    });

    const moduleIds = modules.map((m) => m.id);
    const moduleMap = new Map(modules.map((m) => [m.id, m.title]));

    // Get all published assignments
    const assignments = await this.prisma.assignment.findMany({
      where: {
        module_id: { in: moduleIds },
        is_published: true,
      },
      include: {
        submissions: {
          where: { student_id: studentId },
          orderBy: { submitted_at: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ module_id: 'asc' }, { created_at: 'asc' }],
    });

    return assignments.map((assignment) => {
      const submission = assignment.submissions[0];
      const isLate =
        submission && assignment.due_date && submission.submitted_at > assignment.due_date;

      return {
        id: assignment.id,
        title: assignment.title,
        type: assignment.assignment_type,
        module_title: moduleMap.get(assignment.module_id) || 'Unknown',
        max_score: assignment.points,
        score: submission?.score,
        percentage: submission
          ? Math.round((submission.score / submission.max_score) * 10000) / 100
          : undefined,
        due_date: assignment.due_date,
        submitted_at: submission?.submitted_at,
        status: submission ? submission.status : 'not_submitted',
        is_late: isLate || false,
        is_published: assignment.is_published,
      };
    });
  }

  async getCourseGradeWeights(courseId: string): Promise<CourseGradeWeightsDto> {
    UuidValidator.validate(courseId, 'course ID');

    let weights = await this.prisma.courseGradeWeights.findUnique({
      where: { course_id: courseId },
    });

    // Create default weights if they don't exist
    if (!weights) {
      weights = await this.prisma.courseGradeWeights.create({
        data: {
          id: uuidv4(),
          course_id: courseId,
          assignment_weight: 40,
          activity_weight: 30,
          exam_weight: 30,
        },
      });
    }

    return {
      id: weights.id,
      course_id: weights.course_id,
      assignment_weight: weights.assignment_weight,
      activity_weight: weights.activity_weight,
      exam_weight: weights.exam_weight,
      created_at: weights.created_at,
      updated_at: weights.updated_at,
    };
  }

  async updateCourseGradeWeights(
    courseId: string,
    weightsDto: UpdateCourseGradeWeightsDto,
    instructorId: string,
  ): Promise<CourseGradeWeightsDto> {
    UuidValidator.validate(courseId, 'course ID');
    UuidValidator.validate(instructorId, 'instructor ID');

    // Verify instructor owns the course
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        instructor_id: instructorId,
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Course not found or you do not have permission to update grade weights',
      );
    }

    // Validate weights sum to 100
    const totalWeight =
      weightsDto.assignment_weight + weightsDto.activity_weight + weightsDto.exam_weight;
    if (totalWeight !== 100) {
      throw new BadRequestException(`Grade weights must sum to 100. Current sum: ${totalWeight}`);
    }

    // Update or create weights
    const existingWeights = await this.prisma.courseGradeWeights.findUnique({
      where: { course_id: courseId },
    });

    let weights;
    if (existingWeights) {
      weights = await this.prisma.courseGradeWeights.update({
        where: { course_id: courseId },
        data: {
          assignment_weight: weightsDto.assignment_weight,
          activity_weight: weightsDto.activity_weight,
          exam_weight: weightsDto.exam_weight,
        },
      });
    } else {
      weights = await this.prisma.courseGradeWeights.create({
        data: {
          id: uuidv4(),
          course_id: courseId,
          assignment_weight: weightsDto.assignment_weight,
          activity_weight: weightsDto.activity_weight,
          exam_weight: weightsDto.exam_weight,
        },
      });
    }

    return {
      id: weights.id,
      course_id: weights.course_id,
      assignment_weight: weights.assignment_weight,
      activity_weight: weights.activity_weight,
      exam_weight: weights.exam_weight,
      created_at: weights.created_at,
      updated_at: weights.updated_at,
    };
  }

  // Helper method for calculating student grades (used in instructor gradebook)
  private async calculateStudentGrades(courseId: string, studentId: string) {
    const categoryGrades = await this.calculateCategoryGrades(courseId, studentId);
    const weights = await this.getCourseGradeWeights(courseId);

    let overallGrade = 0;
    let totalWeight = 0;

    if (categoryGrades.assignment_total > 0) {
      overallGrade += categoryGrades.assignment_average * (weights.assignment_weight / 100);
      totalWeight += weights.assignment_weight;
    }

    if (categoryGrades.activity_total > 0) {
      overallGrade += categoryGrades.activity_average * (weights.activity_weight / 100);
      totalWeight += weights.activity_weight;
    }

    if (categoryGrades.exam_total > 0) {
      overallGrade += categoryGrades.exam_average * (weights.exam_weight / 100);
      totalWeight += weights.exam_weight;
    }

    if (totalWeight > 0 && totalWeight < 100) {
      overallGrade = (overallGrade / totalWeight) * 100;
    }

    const totalSubmissions =
      categoryGrades.assignment_submitted +
      categoryGrades.activity_submitted +
      categoryGrades.exam_submitted;

    // Get last submission date
    const modules = await this.prisma.module.findMany({
      where: { course_id: courseId },
      select: { id: true },
    });

    const lastSubmission = await this.prisma.assignmentSubmission.findFirst({
      where: {
        student_id: studentId,
        assignment: {
          module_id: { in: modules.map((m) => m.id) },
        },
      },
      orderBy: { submitted_at: 'desc' },
      select: { submitted_at: true },
    });

    return {
      overall_grade: Math.round(overallGrade * 100) / 100,
      assignment_average: categoryGrades.assignment_average,
      activity_average: categoryGrades.activity_average,
      exam_average: categoryGrades.exam_average,
      total_submissions: totalSubmissions,
      last_submission: lastSubmission?.submitted_at,
    };
  }

  private sortGradebook(
    students: InstructorGradebookRowDto[],
    sortBy?: GradebookSortBy,
    sortOrder?: SortOrder,
  ) {
    const order = sortOrder === SortOrder.DESC ? -1 : 1;

    students.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case GradebookSortBy.NAME:
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case GradebookSortBy.STUDENT_NUMBER:
          aValue = a.student_number || '';
          bValue = b.student_number || '';
          break;
        case GradebookSortBy.EMAIL:
          aValue = a.email;
          bValue = b.email;
          break;
        case GradebookSortBy.OVERALL_GRADE:
          aValue = a.overall_grade;
          bValue = b.overall_grade;
          break;
        case GradebookSortBy.ASSIGNMENT_GRADE:
          aValue = a.assignment_average;
          bValue = b.assignment_average;
          break;
        case GradebookSortBy.ACTIVITY_GRADE:
          aValue = a.activity_average;
          bValue = b.activity_average;
          break;
        case GradebookSortBy.EXAM_GRADE:
          aValue = a.exam_average;
          bValue = b.exam_average;
          break;
        default:
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
      }

      if (aValue < bValue) return -1 * order;
      if (aValue > bValue) return 1 * order;
      return 0;
    });
  }

  private calculateLetterGrade(percentage: number): string {
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  }
}
