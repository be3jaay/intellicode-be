import { ApiProperty } from '@nestjs/swagger';

export class CertificateBasicDto {
  @ApiProperty({ description: 'Certificate ID' })
  id: string;

  @ApiProperty({ description: 'Course ID' })
  course_id: string;

  @ApiProperty({ description: 'Course title' })
  course_title: string;

  @ApiProperty({ description: 'Instructor name' })
  instructor_name: string;

  @ApiProperty({ description: 'Final grade' })
  final_grade: number;

  @ApiProperty({ description: 'Issue date' })
  issued_at: Date;

  @ApiProperty({ description: 'Certificate status' })
  status: string;
}

export class EnrolledCourseDto {
  @ApiProperty({ description: 'Course ID' })
  id: string;

  @ApiProperty({ description: 'Course title' })
  title: string;

  @ApiProperty({ description: 'Course category' })
  category: string;

  @ApiProperty({ description: 'Course thumbnail URL' })
  thumbnail: string;

  @ApiProperty({ description: 'Instructor name' })
  instructor_name: string;

  @ApiProperty({ description: 'Enrollment date' })
  enrolled_at: Date;

  @ApiProperty({ description: 'Course progress percentage' })
  progress_percentage: number;

  @ApiProperty({ description: 'Overall grade in the course' })
  overall_grade: number | null;
}

export class PendingAssignmentDto {
  @ApiProperty({ description: 'Assignment ID' })
  id: string;

  @ApiProperty({ description: 'Assignment title' })
  title: string;

  @ApiProperty({ description: 'Assignment type' })
  assignment_type: string;

  @ApiProperty({ description: 'Course ID' })
  course_id: string;

  @ApiProperty({ description: 'Course title' })
  course_title: string;

  @ApiProperty({ description: 'Module title' })
  module_title: string;

  @ApiProperty({ description: 'Due date' })
  due_date: Date;

  @ApiProperty({ description: 'Difficulty level' })
  difficulty: string;

  @ApiProperty({ description: 'Maximum score' })
  max_score: number;
}

export class PendingActivityDto {
  @ApiProperty({ description: 'Activity ID' })
  id: string;

  @ApiProperty({ description: 'Activity title' })
  title: string;

  @ApiProperty({ description: 'Activity type' })
  activity_type: string;

  @ApiProperty({ description: 'Course ID' })
  course_id: string;

  @ApiProperty({ description: 'Course title' })
  course_title: string;

  @ApiProperty({ description: 'Module title' })
  module_title: string;

  @ApiProperty({ description: 'Due date' })
  due_date: Date;

  @ApiProperty({ description: 'Maximum score' })
  max_score: number;
}

export class PendingExamDto {
  @ApiProperty({ description: 'Exam ID' })
  id: string;

  @ApiProperty({ description: 'Exam title' })
  title: string;

  @ApiProperty({ description: 'Exam type' })
  exam_type: string;

  @ApiProperty({ description: 'Course ID' })
  course_id: string;

  @ApiProperty({ description: 'Course title' })
  course_title: string;

  @ApiProperty({ description: 'Module title' })
  module_title: string;

  @ApiProperty({ description: 'Scheduled date/time' })
  scheduled_at: Date;

  @ApiProperty({ description: 'Duration in minutes' })
  duration_minutes: number;

  @ApiProperty({ description: 'Maximum score' })
  max_score: number;
}

export class StudentDashboardAnalyticsDto {
  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Total number of enrolled courses' })
  total_enrolled_courses: number;

  @ApiProperty({ description: 'Total number of certificates earned' })
  total_certificates: number;

  @ApiProperty({ description: 'Number of pending assignments' })
  pending_assignments_count: number;

  @ApiProperty({ description: 'Number of pending activities' })
  pending_activities_count: number;

  @ApiProperty({ description: 'Number of pending exams' })
  pending_exams_count: number;

  @ApiProperty({ description: 'Three latest certificates', type: [CertificateBasicDto] })
  latest_certificates: CertificateBasicDto[];

  @ApiProperty({ description: 'Three currently enrolled courses', type: [EnrolledCourseDto] })
  enrolled_courses: EnrolledCourseDto[];
}
