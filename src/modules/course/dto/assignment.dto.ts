import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, IsEnum, IsArray, IsDateString, IsUUID, Min, Max, ValidateNested, IsObject, Allow } from 'class-validator';
import { Type } from 'class-transformer';

export enum AssignmentType {
  QUIZ_FORM = 'quiz_form',
  FILE_UPLOAD = 'file_upload'
}

export enum ExamQuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  ENUMERATION = 'enumeration',
  IDENTIFICATION = 'identification',
  TRUE_FALSE = 'true_false'
}

export class CreateAssignmentQuestionDto {
  @ApiProperty({ description: 'Question text' })
  @IsString()
  question: string;

  @ApiProperty({ enum: ExamQuestionType, description: 'Type of question' })
  @IsEnum(ExamQuestionType)
  type: ExamQuestionType;

  @ApiProperty({ description: 'Points for this question', minimum: 1 })
  @IsInt()
  @Min(1)
  points: number;

  @ApiPropertyOptional({ description: 'Correct answer for single answer questions' })
  @IsOptional()
  @IsString()
  correct_answer?: string;

  @ApiPropertyOptional({ description: 'Correct answers for multiple answer questions', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  correct_answers?: string[];

  @ApiPropertyOptional({ description: 'Answer options for multiple choice questions', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ description: 'Explanation for the answer' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Whether the answer is case sensitive', default: false })
  @IsOptional()
  @IsBoolean()
  case_sensitive?: boolean;

  @ApiPropertyOptional({ description: 'True/false value for true/false questions' })
  @IsOptional()
  @IsBoolean()
  is_true?: boolean;
}

export class CreateAssignmentDto {
  @ApiProperty({ description: 'Assignment title' })
  @IsString()
  title: string;

  @Allow()
  moduleId?: string; // This field is allowed but ignored - moduleId comes from URL parameter

  @ApiPropertyOptional({ description: 'Assignment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AssignmentType, description: 'Type of assignment' })
  @IsEnum(AssignmentType)
  assignmentType: AssignmentType;

  @ApiProperty({ description: 'Total points for the assignment', minimum: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  points: number;

  @ApiPropertyOptional({ description: 'Due date for the assignment' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Questions for quiz form assignments', type: [CreateAssignmentQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAssignmentQuestionDto)
  questions?: CreateAssignmentQuestionDto[];

  @ApiPropertyOptional({ description: 'Starter code for coding assignments' })
  @IsOptional()
  @IsString()
  starterCode?: string;

  @ApiPropertyOptional({ description: 'Test cases for coding assignments' })
  @IsOptional()
  @IsString()
  testCases?: string;

  @ApiPropertyOptional({ description: 'Attachment file for file upload assignments' })
  @IsOptional()
  @IsObject()
  attachment?: any;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional({ description: 'Assignment title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Assignment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: AssignmentType, description: 'Type of assignment' })
  @IsOptional()
  @IsEnum(AssignmentType)
  assignmentType?: AssignmentType;

  @ApiPropertyOptional({ description: 'Total points for the assignment', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({ description: 'Due date for the assignment' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Whether the assignment is published' })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @ApiPropertyOptional({ description: 'Questions for quiz form assignments', type: [CreateAssignmentQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAssignmentQuestionDto)
  questions?: CreateAssignmentQuestionDto[];

  @ApiPropertyOptional({ description: 'Starter code for coding assignments' })
  @IsOptional()
  @IsString()
  starterCode?: string;

  @ApiPropertyOptional({ description: 'Test cases for coding assignments' })
  @IsOptional()
  @IsString()
  testCases?: string;
}

export class AssignmentResponseDto {
  @ApiProperty({ description: 'Assignment ID' })
  id: string;

  @ApiProperty({ description: 'Assignment title' })
  title: string;

  @ApiPropertyOptional({ description: 'Assignment description' })
  description?: string;

  @ApiProperty({ enum: AssignmentType, description: 'Type of assignment' })
  assignmentType: AssignmentType;

  @ApiProperty({ description: 'Total points for the assignment' })
  points: number;

  @ApiPropertyOptional({ description: 'Due date for the assignment' })
  dueDate?: Date;

  @ApiProperty({ description: 'Whether the assignment is published' })
  is_published: boolean;

  @ApiProperty({ description: 'Module ID where assignment belongs' })
  module_id: string;

  @ApiProperty({ description: 'Creation date' })
  created_at: Date;

  @ApiProperty({ description: 'Last update date' })
  updated_at: Date;

  @ApiPropertyOptional({ description: 'Assignment questions', type: [Object] })
  questions?: any[];

  @ApiPropertyOptional({ description: 'Starter code for coding assignments' })
  starterCode?: string;

  @ApiPropertyOptional({ description: 'Test cases for coding assignments' })
  testCases?: string;
}

export class AssignmentQueryDto {
  @ApiPropertyOptional({ description: 'Number of records to skip', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Number of records to take', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: AssignmentType, description: 'Filter by assignment type' })
  @IsOptional()
  @IsEnum(AssignmentType)
  assignment_type?: AssignmentType;

  @ApiPropertyOptional({ description: 'Filter by published status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_published?: boolean;

  @ApiPropertyOptional({ description: 'Search by title' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PaginatedAssignmentsResponseDto {
  @ApiProperty({ description: 'Array of assignments', type: [AssignmentResponseDto] })
  data: AssignmentResponseDto[];

  @ApiProperty({ description: 'Total number of assignments' })
  total: number;

  @ApiProperty({ description: 'Number of records skipped' })
  offset: number;

  @ApiProperty({ description: 'Number of records taken' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Current page number' })
  currentPage: number;
}

export class AssignmentAnswerDto {
  @ApiProperty({ description: 'Question ID' })
  @IsUUID()
  question_id: string;

  @ApiPropertyOptional({ description: 'Answer text' })
  @IsOptional()
  @IsString()
  answer_text?: string;

  @ApiPropertyOptional({ description: 'Whether the answer is correct' })
  @IsOptional()
  @IsBoolean()
  is_correct?: boolean;

  @ApiPropertyOptional({ description: 'Points earned for this answer' })
  @IsOptional()
  @IsInt()
  @Min(0)
  points_earned?: number;
}

export class AssignmentSubmissionDto {
  @ApiPropertyOptional({ description: 'Answers for quiz questions', type: [AssignmentAnswerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentAnswerDto)
  answers?: AssignmentAnswerDto[];

  @ApiPropertyOptional({ description: 'Files for file upload assignments', type: [Object] })
  @IsOptional()
  @IsArray()
  files?: any[];
}

export class AssignmentSubmissionResponseDto {
  @ApiProperty({ description: 'Submission ID' })
  id: string;

  @ApiProperty({ description: 'Assignment ID' })
  assignment_id: string;

  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Score earned' })
  score: number;

  @ApiProperty({ description: 'Maximum possible score' })
  max_score: number;

  @ApiProperty({ description: 'Submission date' })
  submitted_at: Date;

  @ApiProperty({ description: 'Submission status' })
  status: string;

  @ApiPropertyOptional({ description: 'Submitted answers', type: [Object] })
  answers?: any[];

  @ApiPropertyOptional({ description: 'Submitted files', type: [Object] })
  files?: any[];

  @ApiPropertyOptional({ description: 'Student information' })
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    student_number?: string;
  };
}

export class StudentScoreDto {
  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Student name' })
  student_name: string;

  @ApiProperty({ description: 'Student email' })
  student_email: string;

  @ApiPropertyOptional({ description: 'Student number' })
  student_number?: string;

  @ApiProperty({ description: 'Score earned' })
  score: number;

  @ApiProperty({ description: 'Maximum possible score' })
  max_score: number;

  @ApiProperty({ description: 'Percentage score' })
  percentage: number;

  @ApiProperty({ description: 'Submission status' })
  status: string;

  @ApiProperty({ description: 'Submission date' })
  submitted_at: Date;

  @ApiPropertyOptional({ description: 'Individual question scores' })
  question_scores?: Array<{
    question_id: string;
    question_text: string;
    points_earned: number;
    max_points: number;
    is_correct: boolean;
  }>;
}

export class ManualGradingDto {
  @ApiProperty({ description: 'Submission ID' })
  @IsUUID()
  submission_id: string;

  @ApiProperty({ description: 'Manual score to assign', minimum: 0 })
  @IsInt()
  @Min(0)
  score: number;

  @ApiPropertyOptional({ description: 'Instructor feedback' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({ description: 'Whether to mark as graded' })
  @IsOptional()
  @IsBoolean()
  mark_as_graded?: boolean;
}

export class AssignmentGradingResponseDto {
  @ApiProperty({ description: 'Submission ID' })
  id: string;

  @ApiProperty({ description: 'Assignment ID' })
  assignment_id: string;

  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Score earned' })
  score: number;

  @ApiProperty({ description: 'Maximum possible score' })
  max_score: number;

  @ApiProperty({ description: 'Submission status' })
  status: string;

  @ApiProperty({ description: 'Submission date' })
  submitted_at: Date;

  @ApiProperty({ description: 'Graded date' })
  graded_at: Date;

  @ApiPropertyOptional({ description: 'Instructor feedback' })
  feedback?: string;

  @ApiPropertyOptional({ description: 'Submitted files', type: [Object] })
  files?: any[];

  @ApiProperty({ description: 'Student information' })
  student: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    student_number?: string;
  };
}
