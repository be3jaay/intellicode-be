import { ApiProperty } from '@nestjs/swagger';

export class MonthlyGrowthDto {
  @ApiProperty({ description: 'Month and year (e.g., "2024-05")' })
  month: string;

  @ApiProperty({ description: 'Number of new users registered in this month' })
  new_users: number;

  @ApiProperty({ description: 'Number of new courses created in this month' })
  new_courses: number;

  @ApiProperty({ description: 'Number of new enrollments in this month' })
  new_enrollments: number;

  @ApiProperty({ description: 'Number of certificates issued in this month' })
  certificates_issued: number;
}

export class GrowthTrendsDto {
  @ApiProperty({
    description: 'Monthly growth data for the last 6 months',
    type: [MonthlyGrowthDto],
  })
  monthly_data: MonthlyGrowthDto[];

  @ApiProperty({ description: 'Total new users in the last 6 months' })
  total_new_users: number;

  @ApiProperty({ description: 'Total new courses in the last 6 months' })
  total_new_courses: number;

  @ApiProperty({ description: 'Total new enrollments in the last 6 months' })
  total_new_enrollments: number;

  @ApiProperty({ description: 'Total certificates issued in the last 6 months' })
  total_certificates_issued: number;

  @ApiProperty({ description: 'User growth rate percentage' })
  user_growth_rate: number;

  @ApiProperty({ description: 'Course growth rate percentage' })
  course_growth_rate: number;

  @ApiProperty({ description: 'Enrollment growth rate percentage' })
  enrollment_growth_rate: number;
}

export class SystemAnalyticsDto {
  @ApiProperty({ description: 'Total number of users in the system' })
  total_users: number;

  @ApiProperty({ description: 'Total number of students' })
  total_students: number;

  @ApiProperty({ description: 'Total number of instructors' })
  total_instructors: number;

  @ApiProperty({ description: 'Total number of admins' })
  total_admins: number;

  @ApiProperty({ description: 'Total number of courses' })
  total_courses: number;

  @ApiProperty({ description: 'Total number of active courses' })
  active_courses: number;

  @ApiProperty({ description: 'Total number of pending courses' })
  pending_courses: number;

  @ApiProperty({ description: 'Total number of rejected courses' })
  rejected_courses: number;

  @ApiProperty({ description: 'Total number of enrollments' })
  total_enrollments: number;

  @ApiProperty({ description: 'Total number of active enrollments' })
  active_enrollments: number;

  @ApiProperty({ description: 'Total number of certificates issued' })
  total_certificates: number;

  @ApiProperty({ description: 'Total number of assignments' })
  total_assignments: number;

  @ApiProperty({ description: 'Total number of activities' })
  total_activities: number;

  @ApiProperty({ description: 'Total number of exams' })
  total_exams: number;

  @ApiProperty({ description: 'Total submissions across all coursework' })
  total_submissions: number;
}

export class StudentPerformanceDto {
  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Student number' })
  student_number: string;

  @ApiProperty({ description: 'Student first name' })
  first_name: string;

  @ApiProperty({ description: 'Student last name' })
  last_name: string;

  @ApiProperty({ description: 'Student email' })
  email: string;

  @ApiProperty({ description: 'Total number of courses enrolled' })
  total_enrolled: number;

  @ApiProperty({ description: 'Total number of completed courses' })
  completed_courses: number;

  @ApiProperty({ description: 'Total number of certificates earned' })
  certificates_earned: number;

  @ApiProperty({ description: 'Average grade across all courses' })
  average_grade: number | null;

  @ApiProperty({ description: 'Total assignments submitted' })
  total_submissions: number;

  @ApiProperty({ description: 'Last activity date' })
  last_activity: Date | null;
}

export class InstructorPerformanceDto {
  @ApiProperty({ description: 'Instructor ID' })
  instructor_id: string;

  @ApiProperty({ description: 'Instructor first name' })
  first_name: string;

  @ApiProperty({ description: 'Instructor last name' })
  last_name: string;

  @ApiProperty({ description: 'Instructor email' })
  email: string;

  @ApiProperty({ description: 'Total number of courses created' })
  total_courses: number;

  @ApiProperty({ description: 'Total number of active courses' })
  active_courses: number;

  @ApiProperty({ description: 'Total number of students enrolled across all courses' })
  total_students_enrolled: number;

  @ApiProperty({ description: 'Total number of certificates issued' })
  certificates_issued: number;

  @ApiProperty({ description: 'Average course rating' })
  average_course_rating: number | null;

  @ApiProperty({ description: 'Total number of assignments created' })
  total_assignments: number;

  @ApiProperty({ description: 'Number of pending grades' })
  pending_grades: number;

  @ApiProperty({ description: 'Last course created date' })
  last_course_created: Date | null;
}

export class AdminCourseProgressDto {
  @ApiProperty({ description: 'Course ID' })
  course_id: string;

  @ApiProperty({ description: 'Course title' })
  course_title: string;

  @ApiProperty({ description: 'Instructor name' })
  instructor_name: string;

  @ApiProperty({ description: 'Total enrolled students' })
  total_enrolled: number;

  @ApiProperty({ description: 'Average course completion percentage' })
  average_completion: number;

  @ApiProperty({ description: 'Average grade' })
  average_grade: number | null;

  @ApiProperty({ description: 'Certificates issued' })
  certificates_issued: number;

  @ApiProperty({ description: 'Course status' })
  course_status: string;
}

export class AdminDashboardAnalyticsDto {
  @ApiProperty({ description: 'System-wide analytics', type: SystemAnalyticsDto })
  system_analytics: SystemAnalyticsDto;

  @ApiProperty({ description: 'Growth trends over the last 6 months', type: GrowthTrendsDto })
  growth_trends: GrowthTrendsDto;

  @ApiProperty({ description: 'Top 10 student performances', type: [StudentPerformanceDto] })
  student_performance: StudentPerformanceDto[];

  @ApiProperty({
    description: 'Instructor performance analytics',
    type: [InstructorPerformanceDto],
  })
  instructor_performance: InstructorPerformanceDto[];

  @ApiProperty({ description: 'Course progress analytics', type: [AdminCourseProgressDto] })
  course_progress: AdminCourseProgressDto[];
}
