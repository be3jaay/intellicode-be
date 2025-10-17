import { ApiProperty } from '@nestjs/swagger';
import { LessonDifficulty } from './lesson.dto';

export class LessonProgressDto {
  @ApiProperty({ description: 'Lesson ID' })
  id: string;

  @ApiProperty({ description: 'Lesson title' })
  title: string;

  @ApiProperty({ description: 'Lesson description' })
  description?: string;

  @ApiProperty({ description: 'Lesson content' })
  content?: string;

  @ApiProperty({ description: 'Order index' })
  order_index: number;

  @ApiProperty({ description: 'Is published' })
  is_published: boolean;

  @ApiProperty({ enum: LessonDifficulty, description: 'Lesson difficulty' })
  difficulty: LessonDifficulty;

  @ApiProperty({ description: 'Estimated duration in minutes' })
  estimated_duration?: number;

  @ApiProperty({ description: 'Lesson tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Is lesson completed by student' })
  is_completed: boolean;

  @ApiProperty({ description: 'Is lesson unlocked for student' })
  is_unlocked: boolean;

  @ApiProperty({ description: 'Completion percentage (0-100)' })
  completion_percentage: number;

  @ApiProperty({ description: 'Last accessed date' })
  last_accessed?: Date;

  @ApiProperty({ description: 'Completed date' })
  completed_at?: Date;
}

export class ModuleProgressDto {
  @ApiProperty({ description: 'Module ID' })
  id: string;

  @ApiProperty({ description: 'Module title' })
  title: string;

  @ApiProperty({ description: 'Module description' })
  description?: string;

  @ApiProperty({ description: 'Order index' })
  order_index: number;

  @ApiProperty({ description: 'Is published' })
  is_published: boolean;

  @ApiProperty({ description: 'Lessons in this module', type: [LessonProgressDto] })
  lessons: LessonProgressDto[];

  @ApiProperty({ description: 'Total lessons in module' })
  total_lessons: number;

  @ApiProperty({ description: 'Completed lessons in module' })
  completed_lessons: number;

  @ApiProperty({ description: 'Module completion percentage (0-100)' })
  completion_percentage: number;

  @ApiProperty({ description: 'Total estimated duration in minutes' })
  total_duration: number;
}

export class AssignmentProgressDto {
  @ApiProperty({ description: 'Assignment ID' })
  id: string;

  @ApiProperty({ description: 'Assignment title' })
  title: string;

  @ApiProperty({ description: 'Assignment description' })
  description?: string;

  @ApiProperty({ description: 'Assignment type' })
  assignment_type: string;

  @ApiProperty({ description: 'Points' })
  points: number;

  @ApiProperty({ description: 'Due date' })
  due_date?: Date;

  @ApiProperty({ description: 'Is published' })
  is_published: boolean;

  @ApiProperty({ description: 'Is assignment submitted by student' })
  is_submitted: boolean;

  @ApiProperty({ description: 'Student score' })
  score?: number;

  @ApiProperty({ description: 'Submission date' })
  submitted_at?: Date;
}

export class CourseViewResponseDto {
  @ApiProperty({ description: 'Course ID' })
  id: string;

  @ApiProperty({ description: 'Course title' })
  title: string;

  @ApiProperty({ description: 'Course description' })
  description: string;

  @ApiProperty({ description: 'Course category' })
  category: string;

  @ApiProperty({ description: 'Course thumbnail' })
  thumbnail: string;

  @ApiProperty({ description: 'Course status' })
  status: string;

  @ApiProperty({ description: 'Instructor information' })
  instructor: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };

  @ApiProperty({ description: 'Modules in course', type: [ModuleProgressDto] })
  modules: ModuleProgressDto[];

  @ApiProperty({ description: 'Assignments in course', type: [AssignmentProgressDto] })
  assignments: AssignmentProgressDto[];

  @ApiProperty({ description: 'Total modules in course' })
  total_modules: number;

  @ApiProperty({ description: 'Completed modules' })
  completed_modules: number;

  @ApiProperty({ description: 'Total lessons in course' })
  total_lessons: number;

  @ApiProperty({ description: 'Completed lessons' })
  completed_lessons: number;

  @ApiProperty({ description: 'Overall course completion percentage (0-100)' })
  course_completion_percentage: number;

  @ApiProperty({ description: 'Total estimated course duration in minutes' })
  total_estimated_duration: number;

  @ApiProperty({ description: 'Student enrollment date' })
  enrolled_at: Date;

  @ApiProperty({ description: 'Last accessed date' })
  last_accessed?: Date;

  @ApiProperty({ description: 'Course created date' })
  created_at: Date;

  @ApiProperty({ description: 'Course updated date' })
  updated_at: Date;
}

export class LessonProgressUpdateDto {
  @ApiProperty({ description: 'Lesson ID' })
  lesson_id: string;

  @ApiProperty({ description: 'Completion percentage (0-100)' })
  completion_percentage: number;

  @ApiProperty({ description: 'Is lesson completed' })
  is_completed: boolean;
}
