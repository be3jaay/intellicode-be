import { ApiProperty } from '@nestjs/swagger';

export class PopularCourseDto {
  @ApiProperty({ description: 'Course ID' })
  id: string;

  @ApiProperty({ description: 'Course title' })
  title: string;

  @ApiProperty({ description: 'Course description' })
  description: string;

  @ApiProperty({ description: 'Course category' })
  category: string;

  @ApiProperty({ description: 'Course thumbnail URL' })
  thumbnail: string;

  @ApiProperty({ description: 'Number of students enrolled' })
  students_count: number;

  @ApiProperty({ description: 'Course status' })
  status: string;

  @ApiProperty({ description: 'Course creation date' })
  created_at: Date;
}

export class CourseBasicDto {
  @ApiProperty({ description: 'Course ID' })
  id: string;

  @ApiProperty({ description: 'Course title' })
  title: string;

  @ApiProperty({ description: 'Course category' })
  category: string;

  @ApiProperty({ description: 'Course thumbnail URL' })
  thumbnail: string;

  @ApiProperty({ description: 'Course status' })
  status: string;

  @ApiProperty({ description: 'Number of students enrolled' })
  students_count: number;

  @ApiProperty({ description: 'Number of modules' })
  modules_count: number;
}

export class InstructorAnalyticsDto {
  @ApiProperty({ description: 'Instructor ID' })
  instructor_id: string;

  @ApiProperty({ description: 'Total number of courses created by instructor' })
  total_courses: number;

  @ApiProperty({ description: 'Total number of students enrolled across all courses' })
  total_students_enrolled: number;

  @ApiProperty({ description: 'Number of pending grades for submission' })
  pending_grades_count: number;

  @ApiProperty({ description: 'List of all courses created by instructor', type: [CourseBasicDto] })
  courses: CourseBasicDto[];

  @ApiProperty({
    description: 'Top 3 most popular courses based on student enrollment',
    type: [PopularCourseDto],
  })
  top_popular_courses: PopularCourseDto[];
}
