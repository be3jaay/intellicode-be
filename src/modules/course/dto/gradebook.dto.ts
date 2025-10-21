import { IsString, IsInt, IsOptional, IsEnum, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum GradebookSortBy {
  NAME = 'name',
  STUDENT_NUMBER = 'student_number',
  EMAIL = 'email',
  OVERALL_GRADE = 'overall_grade',
  ASSIGNMENT_GRADE = 'assignment_grade',
  ACTIVITY_GRADE = 'activity_grade',
  EXAM_GRADE = 'exam_grade',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SubmissionStatusFilter {
  ALL = 'all',
  ALL_SUBMITTED = 'all_submitted',
  HAS_MISSING = 'has_missing',
}

export class GradebookQueryDto {
  @ApiPropertyOptional({ description: 'Number of records to skip', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Number of records to return', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: GradebookSortBy, description: 'Sort by field', default: GradebookSortBy.NAME })
  @IsOptional()
  @IsEnum(GradebookSortBy)
  sort_by?: GradebookSortBy = GradebookSortBy.NAME;

  @ApiPropertyOptional({ enum: SortOrder, description: 'Sort order', default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder = SortOrder.ASC;

  @ApiPropertyOptional({ description: 'Minimum score percentage (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  min_score?: number;

  @ApiPropertyOptional({ description: 'Maximum score percentage (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  max_score?: number;

  @ApiPropertyOptional({ enum: SubmissionStatusFilter, description: 'Filter by submission status' })
  @IsOptional()
  @IsEnum(SubmissionStatusFilter)
  submission_status?: SubmissionStatusFilter;

  @ApiPropertyOptional({ description: 'Filter by section' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ description: 'Filter by assignment type (assignment, activity, exam)' })
  @IsOptional()
  @IsString()
  assignment_type?: string;

  @ApiPropertyOptional({ description: 'Filter submissions from this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter submissions until this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Search by student name or email' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class CategoryGradesDto {
  @ApiProperty({ description: 'Average grade for assignments (0-100)' })
  assignment_average: number;

  @ApiProperty({ description: 'Total assignments submitted' })
  assignment_submitted: number;

  @ApiProperty({ description: 'Total assignments available' })
  assignment_total: number;

  @ApiProperty({ description: 'Average grade for activities (0-100)' })
  activity_average: number;

  @ApiProperty({ description: 'Total activities submitted' })
  activity_submitted: number;

  @ApiProperty({ description: 'Total activities available' })
  activity_total: number;

  @ApiProperty({ description: 'Average grade for exams (0-100)' })
  exam_average: number;

  @ApiProperty({ description: 'Total exams submitted' })
  exam_submitted: number;

  @ApiProperty({ description: 'Total exams available' })
  exam_total: number;
}

export class AssignmentGradeDto {
  @ApiProperty({ description: 'Assignment ID' })
  id: string;

  @ApiProperty({ description: 'Assignment title' })
  title: string;

  @ApiProperty({ description: 'Assignment type' })
  type: string;

  @ApiProperty({ description: 'Module title' })
  module_title: string;

  @ApiProperty({ description: 'Points possible' })
  max_score: number;

  @ApiPropertyOptional({ description: 'Points earned' })
  score?: number;

  @ApiPropertyOptional({ description: 'Percentage (0-100)' })
  percentage?: number;

  @ApiPropertyOptional({ description: 'Due date' })
  due_date?: Date;

  @ApiPropertyOptional({ description: 'Submission date' })
  submitted_at?: Date;

  @ApiProperty({ description: 'Submission status' })
  status: string;

  @ApiProperty({ description: 'Is late submission' })
  is_late: boolean;

  @ApiProperty({ description: 'Is published' })
  is_published: boolean;
}

export class GradeSummaryDto {
  @ApiProperty({ description: 'Overall course grade percentage (0-100)' })
  overall_grade: number;

  @ApiProperty({ description: 'Category breakdowns' })
  category_grades: CategoryGradesDto;

  @ApiProperty({ description: 'Course grade weights configuration' })
  grade_weights: {
    assignment_weight: number;
    activity_weight: number;
    exam_weight: number;
  };

  @ApiProperty({ description: 'Letter grade (optional)' })
  letter_grade?: string;
}

export class StudentGradebookDto {
  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Student information' })
  student: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    student_number?: string;
    section?: string;
  };

  @ApiProperty({ description: 'Grade summary' })
  grade_summary: GradeSummaryDto;

  @ApiProperty({ description: 'Individual assignment grades', type: [AssignmentGradeDto] })
  assignments: AssignmentGradeDto[];
}

export class InstructorGradebookRowDto {
  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'First name' })
  first_name: string;

  @ApiProperty({ description: 'Last name' })
  last_name: string;

  @ApiProperty({ description: 'Email' })
  email: string;

  @ApiPropertyOptional({ description: 'Student number' })
  student_number?: string;

  @ApiPropertyOptional({ description: 'Section' })
  section?: string;

  @ApiProperty({ description: 'Overall grade percentage (0-100)' })
  overall_grade: number;

  @ApiProperty({ description: 'Assignment average (0-100)' })
  assignment_average: number;

  @ApiProperty({ description: 'Activity average (0-100)' })
  activity_average: number;

  @ApiProperty({ description: 'Exam average (0-100)' })
  exam_average: number;

  @ApiProperty({ description: 'Total submissions' })
  total_submissions: number;

  @ApiProperty({ description: 'Total assignments available' })
  total_assignments: number;

  @ApiProperty({ description: 'Has missing submissions' })
  has_missing: boolean;

  @ApiPropertyOptional({ description: 'Last submission date' })
  last_submission?: Date;
}

export class InstructorGradebookDto {
  @ApiProperty({ description: 'List of student grades', type: [InstructorGradebookRowDto] })
  data: InstructorGradebookRowDto[];

  @ApiProperty({ description: 'Total number of students' })
  total: number;

  @ApiProperty({ description: 'Offset used' })
  offset: number;

  @ApiProperty({ description: 'Limit used' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;

  @ApiProperty({ description: 'Current page' })
  currentPage: number;

  @ApiProperty({ description: 'Class average' })
  class_average: number;

  @ApiProperty({ description: 'Total assignments in course' })
  total_assignments: number;
}

export class CourseGradeWeightsDto {
  @ApiProperty({ description: 'Weights ID' })
  id?: string;

  @ApiProperty({ description: 'Course ID' })
  course_id?: string;

  @ApiProperty({ description: 'Assignment weight percentage (0-100)', default: 40 })
  @IsInt()
  @Min(0)
  @Max(100)
  assignment_weight: number;

  @ApiProperty({ description: 'Activity weight percentage (0-100)', default: 30 })
  @IsInt()
  @Min(0)
  @Max(100)
  activity_weight: number;

  @ApiProperty({ description: 'Exam weight percentage (0-100)', default: 30 })
  @IsInt()
  @Min(0)
  @Max(100)
  exam_weight: number;

  @ApiPropertyOptional({ description: 'Created at' })
  created_at?: Date;

  @ApiPropertyOptional({ description: 'Updated at' })
  updated_at?: Date;
}

export class UpdateCourseGradeWeightsDto {
  @ApiProperty({ description: 'Assignment weight percentage (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  assignment_weight: number;

  @ApiProperty({ description: 'Activity weight percentage (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  activity_weight: number;

  @ApiProperty({ description: 'Exam weight percentage (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  exam_weight: number;
}


