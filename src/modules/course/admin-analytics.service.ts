import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  AdminDashboardAnalyticsDto,
  SystemAnalyticsDto,
  StudentPerformanceDto,
  InstructorPerformanceDto,
  AdminCourseProgressDto,
  GrowthTrendsDto,
  MonthlyGrowthDto,
} from './dto/admin-analytics.dto';
import { GradebookService } from './gradebook.service';
import { ProgressService } from './progress.service';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private prisma: PrismaService,
    private gradebookService: GradebookService,
    private progressService: ProgressService,
  ) {}

  async getAdminDashboardAnalytics(): Promise<AdminDashboardAnalyticsDto> {
    // Fetch all analytics data in parallel
    const [
      systemAnalytics,
      growthTrends,
      studentPerformance,
      instructorPerformance,
      courseProgress,
    ] = await Promise.all([
      this.getSystemAnalytics(),
      this.getGrowthTrends(),
      this.getStudentPerformance(),
      this.getInstructorPerformance(),
      this.getCourseProgress(),
    ]);

    return {
      system_analytics: systemAnalytics,
      growth_trends: growthTrends,
      student_performance: studentPerformance,
      instructor_performance: instructorPerformance,
      course_progress: courseProgress,
    };
  }

  async getSystemAnalyticsOnly(): Promise<SystemAnalyticsDto> {
    return await this.getSystemAnalytics();
  }

  async getStudentPerformanceOnly(): Promise<StudentPerformanceDto[]> {
    return await this.getStudentPerformance();
  }

  async getInstructorPerformanceOnly(): Promise<InstructorPerformanceDto[]> {
    return await this.getInstructorPerformance();
  }

  async getCourseProgressOnly(): Promise<AdminCourseProgressDto[]> {
    return await this.getCourseProgress();
  }

  private async getGrowthTrends(): Promise<GrowthTrendsDto> {
    // Calculate the date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1); // Start from the first day of that month
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Calculate the date 12 months ago (for growth rate comparison)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    // Generate array of last 6 months
    const months: string[] = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push(date.toISOString().slice(0, 7)); // Format: YYYY-MM
    }

    // Fetch data for the last 6 months in parallel
    const [users, courses, enrollments, certificates] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          created_at: { gte: sixMonthsAgo },
        },
        select: {
          created_at: true,
        },
      }),
      this.prisma.course.findMany({
        where: {
          created_at: { gte: sixMonthsAgo },
        },
        select: {
          created_at: true,
        },
      }),
      this.prisma.enrollment.findMany({
        where: {
          enrolled_at: { gte: sixMonthsAgo },
        },
        select: {
          enrolled_at: true,
        },
      }),
      this.prisma.courseCertificate.findMany({
        where: {
          issued_at: { gte: sixMonthsAgo },
        },
        select: {
          issued_at: true,
        },
      }),
    ]);

    // Fetch previous 6 months data for growth rate calculation
    const [prevUsers, prevCourses, prevEnrollments] = await Promise.all([
      this.prisma.user.count({
        where: {
          created_at: { gte: twelveMonthsAgo, lt: sixMonthsAgo },
        },
      }),
      this.prisma.course.count({
        where: {
          created_at: { gte: twelveMonthsAgo, lt: sixMonthsAgo },
        },
      }),
      this.prisma.enrollment.count({
        where: {
          enrolled_at: { gte: twelveMonthsAgo, lt: sixMonthsAgo },
        },
      }),
    ]);

    // Group data by month
    const monthlyData: MonthlyGrowthDto[] = months.map((month) => {
      const monthStart = new Date(month + '-01');
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const newUsers = users.filter(
        (u) => u.created_at >= monthStart && u.created_at < monthEnd,
      ).length;

      const newCourses = courses.filter(
        (c) => c.created_at >= monthStart && c.created_at < monthEnd,
      ).length;

      const newEnrollments = enrollments.filter(
        (e) => e.enrolled_at >= monthStart && e.enrolled_at < monthEnd,
      ).length;

      const certificatesIssued = certificates.filter(
        (cert) => cert.issued_at >= monthStart && cert.issued_at < monthEnd,
      ).length;

      return {
        month,
        new_users: newUsers,
        new_courses: newCourses,
        new_enrollments: newEnrollments,
        certificates_issued: certificatesIssued,
      };
    });

    // Calculate totals for the last 6 months
    const totalNewUsers = users.length;
    const totalNewCourses = courses.length;
    const totalNewEnrollments = enrollments.length;
    const totalCertificatesIssued = certificates.length;

    // Calculate growth rates (comparing last 6 months to previous 6 months)
    const userGrowthRate =
      prevUsers > 0 ? ((totalNewUsers - prevUsers) / prevUsers) * 100 : totalNewUsers > 0 ? 100 : 0;

    const courseGrowthRate =
      prevCourses > 0
        ? ((totalNewCourses - prevCourses) / prevCourses) * 100
        : totalNewCourses > 0
          ? 100
          : 0;

    const enrollmentGrowthRate =
      prevEnrollments > 0
        ? ((totalNewEnrollments - prevEnrollments) / prevEnrollments) * 100
        : totalNewEnrollments > 0
          ? 100
          : 0;

    return {
      monthly_data: monthlyData,
      total_new_users: totalNewUsers,
      total_new_courses: totalNewCourses,
      total_new_enrollments: totalNewEnrollments,
      total_certificates_issued: totalCertificatesIssued,
      user_growth_rate: Number(userGrowthRate.toFixed(2)),
      course_growth_rate: Number(courseGrowthRate.toFixed(2)),
      enrollment_growth_rate: Number(enrollmentGrowthRate.toFixed(2)),
    };
  }

  private async getSystemAnalytics(): Promise<SystemAnalyticsDto> {
    // Batch 1: User counts
    const [userCounts, courseCounts, enrollmentCounts] = await Promise.all([
      // Get all user role counts in one query
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      // Get all course status counts in one query
      this.prisma.course.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Get all enrollment status counts in one query
      this.prisma.enrollment.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    // Batch 2: Other counts
    const [assignmentCounts, totalCertificates, totalSubmissions] = await Promise.all([
      // Get all assignment type counts in one query
      this.prisma.assignment.groupBy({
        by: ['assignment_type'],
        _count: true,
      }),
      this.prisma.courseCertificate.count({ where: { status: 'active' } }),
      this.prisma.assignmentSubmission.count(),
    ]);

    // Process user counts
    const totalUsers = userCounts.reduce((sum, group) => sum + group._count, 0);
    const totalStudents = userCounts.find((g) => g.role === 'student')?._count || 0;
    const totalInstructors = userCounts.find((g) => g.role === 'teacher')?._count || 0;
    const totalAdmins = userCounts.find((g) => g.role === 'admin')?._count || 0;

    // Process course counts
    const totalCourses = courseCounts.reduce((sum, group) => sum + group._count, 0);
    const activeCourses = courseCounts.find((g) => g.status === 'approved')?._count || 0;
    const pendingCourses =
      courseCounts.find((g) => g.status === 'waiting_for_approval')?._count || 0;
    const rejectedCourses = courseCounts.find((g) => g.status === 'rejected')?._count || 0;

    // Process enrollment counts
    const totalEnrollments = enrollmentCounts.reduce((sum, group) => sum + group._count, 0);
    const activeEnrollments = enrollmentCounts.find((g) => g.status === 'active')?._count || 0;

    // Process assignment counts
    const totalAssignments =
      assignmentCounts.find((g) => g.assignment_type === 'assignment')?._count || 0;
    const totalActivities =
      assignmentCounts.find((g) => g.assignment_type === 'activity')?._count || 0;
    const totalExams = assignmentCounts.find((g) => g.assignment_type === 'exam')?._count || 0;

    return {
      total_users: totalUsers,
      total_students: totalStudents,
      total_instructors: totalInstructors,
      total_admins: totalAdmins,
      total_courses: totalCourses,
      active_courses: activeCourses,
      pending_courses: pendingCourses,
      rejected_courses: rejectedCourses,
      total_enrollments: totalEnrollments,
      active_enrollments: activeEnrollments,
      total_certificates: totalCertificates,
      total_assignments: totalAssignments,
      total_activities: totalActivities,
      total_exams: totalExams,
      total_submissions: totalSubmissions,
    };
  }

  private async getStudentPerformance(): Promise<StudentPerformanceDto[]> {
    // Get all students with their enrollments
    const students = await this.prisma.user.findMany({
      where: { role: 'student' },
      select: {
        id: true,
        student_number: true,
        first_name: true,
        last_name: true,
        email: true,
        enrollments: {
          where: { status: 'active' },
          select: {
            course_id: true,
            enrolled_at: true,
            status: true,
          },
        },
        certificates: {
          where: { status: 'active' },
          select: {
            id: true,
          },
        },
        assignment_submissions: {
          select: {
            id: true,
            submitted_at: true,
          },
          orderBy: {
            submitted_at: 'desc',
          },
          take: 1,
        },
      },
      take: 10,
      orderBy: {
        created_at: 'desc',
      },
    });

    // Calculate performance metrics for each student
    const studentPerformancePromises = students.map(async (student) => {
      const totalEnrolled = student.enrollments.length;
      const certificatesEarned = student.certificates.length;
      const totalSubmissions = await this.prisma.assignmentSubmission.count({
        where: { student_id: student.id },
      });

      // Calculate average grade across all enrolled courses
      let averageGrade: number | null = null;
      if (totalEnrolled > 0) {
        const grades = await Promise.all(
          student.enrollments.map(async (enrollment) => {
            try {
              const gradeSummary = await this.gradebookService.calculateStudentOverallGrade(
                enrollment.course_id,
                student.id,
              );
              return gradeSummary.overall_grade;
            } catch {
              return null;
            }
          }),
        );

        const validGrades = grades.filter((g) => g !== null) as number[];
        if (validGrades.length > 0) {
          averageGrade = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
        }
      }

      // Count completed courses (those with certificates)
      const completedCourses = certificatesEarned;

      return {
        student_id: student.id,
        student_number: student.student_number,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        total_enrolled: totalEnrolled,
        completed_courses: completedCourses,
        certificates_earned: certificatesEarned,
        average_grade: averageGrade ? Number(averageGrade.toFixed(2)) : null,
        total_submissions: totalSubmissions,
        last_activity: student.assignment_submissions[0]?.submitted_at || null,
      };
    });

    return await Promise.all(studentPerformancePromises);
  }

  private async getInstructorPerformance(): Promise<InstructorPerformanceDto[]> {
    // Get all instructors with their courses
    const instructors = await this.prisma.user.findMany({
      where: { role: 'teacher' },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        courses: {
          select: {
            id: true,
            status: true,
            created_at: true,
            enrollments: {
              where: { status: 'active' },
              select: { id: true },
            },
            certificates: {
              where: { status: 'active' },
              select: { id: true },
            },
            modules: {
              select: {
                assignments: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    // Collect all course IDs from all instructors
    const allCourseIds = instructors.flatMap((instructor) => instructor.courses.map((c) => c.id));

    // Get pending grades for all courses in ONE query
    const pendingGradesData = await this.prisma.assignmentSubmission.groupBy({
      by: ['assignment_id'],
      where: {
        assignment: {
          module: {
            course_id: { in: allCourseIds },
          },
        },
        status: 'submitted',
      },
      _count: true,
    });

    // Create a map of course_id to pending grades count
    // We need to get the course_id for each assignment
    const assignmentToCourseMap = new Map<string, string>();
    if (pendingGradesData.length > 0) {
      const assignments = await this.prisma.assignment.findMany({
        where: {
          id: { in: pendingGradesData.map((pg) => pg.assignment_id) },
        },
        select: {
          id: true,
          module: {
            select: {
              course_id: true,
            },
          },
        },
      });

      assignments.forEach((assignment) => {
        assignmentToCourseMap.set(assignment.id, assignment.module.course_id);
      });
    }

    // Calculate pending grades per instructor
    const instructorPendingGrades = new Map<string, number>();
    instructors.forEach((instructor) => {
      const courseIds = instructor.courses.map((c) => c.id);
      let pendingCount = 0;

      pendingGradesData.forEach((pg) => {
        const courseId = assignmentToCourseMap.get(pg.assignment_id);
        if (courseId && courseIds.includes(courseId)) {
          pendingCount += pg._count;
        }
      });

      instructorPendingGrades.set(instructor.id, pendingCount);
    });

    // Calculate performance metrics for each instructor
    const instructorPerformanceData = instructors.map((instructor) => {
      const totalCourses = instructor.courses.length;
      const activeCourses = instructor.courses.filter((c) => c.status === 'approved').length;
      const totalStudentsEnrolled = instructor.courses.reduce(
        (sum, course) => sum + course.enrollments.length,
        0,
      );
      const certificatesIssued = instructor.courses.reduce(
        (sum, course) => sum + course.certificates.length,
        0,
      );

      // Count total assignments across all courses
      const totalAssignments = instructor.courses.reduce(
        (sum, course) =>
          sum +
          course.modules.reduce((moduleSum, module) => moduleSum + module.assignments.length, 0),
        0,
      );

      // Get pending grades from the map
      const pendingGrades = instructorPendingGrades.get(instructor.id) || 0;

      // Get last course created date
      const lastCourseCreated =
        instructor.courses.length > 0
          ? instructor.courses.reduce(
              (latest, course) => (course.created_at > latest ? course.created_at : latest),
              instructor.courses[0].created_at,
            )
          : null;

      return {
        instructor_id: instructor.id,
        first_name: instructor.first_name,
        last_name: instructor.last_name,
        email: instructor.email,
        total_courses: totalCourses,
        active_courses: activeCourses,
        total_students_enrolled: totalStudentsEnrolled,
        certificates_issued: certificatesIssued,
        average_course_rating: null, // Rating system not implemented yet
        total_assignments: totalAssignments,
        pending_grades: pendingGrades,
        last_course_created: lastCourseCreated,
      };
    });

    return instructorPerformanceData;
  }

  private async getCourseProgress(): Promise<AdminCourseProgressDto[]> {
    // Get all approved courses with enrollments
    const courses = await this.prisma.course.findMany({
      where: { status: 'approved' },
      select: {
        id: true,
        title: true,
        status: true,
        instructor: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        enrollments: {
          where: { status: 'active' },
          select: {
            student_id: true,
          },
        },
        certificates: {
          where: { status: 'active' },
          select: { id: true },
        },
      },
      take: 20,
      orderBy: {
        created_at: 'desc',
      },
    });

    // Calculate progress metrics for each course
    const courseProgressData = await Promise.all(
      courses.map(async (course) => {
        const totalEnrolled = course.enrollments.length;
        const certificatesIssued = course.certificates.length;

        // Calculate average completion percentage
        let averageCompletion = 0;
        if (totalEnrolled > 0) {
          const completionPromises = course.enrollments.map(async (enrollment) => {
            try {
              const progress = await this.progressService.getStudentCourseProgress(
                enrollment.student_id,
                course.id,
              );
              return progress.course_completion_percentage || 0;
            } catch {
              return 0;
            }
          });

          const completions = await Promise.all(completionPromises);
          averageCompletion =
            completions.reduce((sum, completion) => sum + completion, 0) / completions.length;
        }

        // Calculate average grade
        let averageGrade: number | null = null;
        if (totalEnrolled > 0) {
          const gradePromises = course.enrollments.map(async (enrollment) => {
            try {
              const gradeSummary = await this.gradebookService.calculateStudentOverallGrade(
                course.id,
                enrollment.student_id,
              );
              return gradeSummary.overall_grade;
            } catch {
              return null;
            }
          });

          const grades = await Promise.all(gradePromises);
          const validGrades = grades.filter((g) => g !== null) as number[];
          if (validGrades.length > 0) {
            averageGrade = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
          }
        }

        return {
          course_id: course.id,
          course_title: course.title,
          instructor_name: `${course.instructor.first_name} ${course.instructor.last_name}`,
          total_enrolled: totalEnrolled,
          average_completion: Number(averageCompletion.toFixed(2)),
          average_grade: averageGrade ? Number(averageGrade.toFixed(2)) : null,
          certificates_issued: certificatesIssued,
          course_status: course.status,
        };
      }),
    );

    return courseProgressData;
  }
}
