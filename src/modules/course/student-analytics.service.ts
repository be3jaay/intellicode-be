import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { UuidValidator } from '@/common/utils/uuid.validator';
import {
  StudentDashboardAnalyticsDto,
  CertificateBasicDto,
  EnrolledCourseDto,
} from './dto/student-analytics.dto';
import { GradebookService } from './gradebook.service';
import { ProgressService } from './progress.service';

@Injectable()
export class StudentAnalyticsService {
  constructor(
    private prisma: PrismaService,
    private gradebookService: GradebookService,
    private progressService: ProgressService,
  ) {}

  async getStudentDashboardAnalytics(studentId: string): Promise<StudentDashboardAnalyticsDto> {
    UuidValidator.validate(studentId, 'student ID');

    // Fetch all data in parallel
    const [
      totalEnrolledCourses,
      totalCertificates,
      latestCertificates,
      enrolledCourses,
      pendingAssignmentsCount,
      pendingActivitiesCount,
      pendingExamsCount,
    ] = await Promise.all([
      this.getTotalEnrolledCourses(studentId),
      this.getTotalCertificates(studentId),
      this.getLatestCertificates(studentId),
      this.getEnrolledCourses(studentId),
      this.getPendingAssignmentsCount(studentId),
      this.getPendingActivitiesCount(studentId),
      this.getPendingExamsCount(studentId),
    ]);

    return {
      student_id: studentId,
      total_enrolled_courses: totalEnrolledCourses,
      total_certificates: totalCertificates,
      pending_assignments_count: pendingAssignmentsCount,
      pending_activities_count: pendingActivitiesCount,
      pending_exams_count: pendingExamsCount,
      latest_certificates: latestCertificates,
      enrolled_courses: enrolledCourses,
    };
  }

  private async getTotalEnrolledCourses(studentId: string): Promise<number> {
    return await this.prisma.enrollment.count({
      where: {
        student_id: studentId,
        status: 'active',
      },
    });
  }

  private async getTotalCertificates(studentId: string): Promise<number> {
    return await this.prisma.courseCertificate.count({
      where: {
        student_id: studentId,
        status: 'active',
      },
    });
  }

  private async getLatestCertificates(studentId: string): Promise<CertificateBasicDto[]> {
    const certificates = await this.prisma.courseCertificate.findMany({
      where: {
        student_id: studentId,
        status: 'active',
      },
      include: {
        course: {
          select: {
            title: true,
            instructor: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        issued_at: 'desc',
      },
      take: 3,
    });

    return certificates.map((cert) => ({
      id: cert.id,
      course_id: cert.course_id,
      course_title: cert.course.title,
      instructor_name: `${cert.course.instructor.first_name} ${cert.course.instructor.last_name}`,
      final_grade: cert.final_grade,
      issued_at: cert.issued_at,
      status: cert.status,
    }));
  }

  private async getEnrolledCourses(studentId: string): Promise<EnrolledCourseDto[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        student_id: studentId,
        status: 'active',
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            thumbnail: true,
            instructor: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolled_at: 'desc',
      },
      take: 3,
    });

    // Fetch progress and grades for each course
    const coursesWithDetails = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Fetch progress and grade safely
        let progress = 0;
        let grade = null;

        try {
          const courseProgress = await this.progressService.getStudentCourseProgress(
            studentId,
            enrollment.course_id,
          );
          progress = courseProgress.course_completion_percentage || 0;
        } catch (error) {
          // If progress calculation fails, default to 0
          progress = 0;
        }

        try {
          grade = await this.gradebookService.calculateStudentOverallGrade(
            enrollment.course_id,
            studentId,
          );
        } catch (error) {
          // If grade calculation fails, default to null
          grade = null;
        }

        return {
          id: enrollment.course.id,
          title: enrollment.course.title,
          category: enrollment.course.category,
          thumbnail: enrollment.course.thumbnail,
          instructor_name: `${enrollment.course.instructor.first_name} ${enrollment.course.instructor.last_name}`,
          enrolled_at: enrollment.enrolled_at,
          progress_percentage: progress,
          overall_grade: grade,
        };
      }),
    );

    return coursesWithDetails;
  }

  private async getPendingAssignmentsCount(studentId: string): Promise<number> {
    // Get all enrolled courses
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        student_id: studentId,
        status: 'active',
      },
      select: {
        course_id: true,
      },
    });

    const courseIds = enrollments.map((e) => e.course_id);

    if (courseIds.length === 0) {
      return 0;
    }

    // Count all assignments with assignment_type = 'assignment' that don't have submissions
    const count = await this.prisma.assignment.count({
      where: {
        module: {
          course_id: {
            in: courseIds,
          },
        },
        assignment_type: 'assignment',
        due_date: {
          gte: new Date(), // Only future or today's due dates
        },
        submissions: {
          none: {
            student_id: studentId,
          },
        },
      },
    });

    return count;
  }

  private async getPendingActivitiesCount(studentId: string): Promise<number> {
    // Get all enrolled courses
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        student_id: studentId,
        status: 'active',
      },
      select: {
        course_id: true,
      },
    });

    const courseIds = enrollments.map((e) => e.course_id);

    if (courseIds.length === 0) {
      return 0;
    }

    // Count all assignments with assignment_type = 'activity' that don't have submissions
    const count = await this.prisma.assignment.count({
      where: {
        module: {
          course_id: {
            in: courseIds,
          },
        },
        assignment_type: 'activity',
        due_date: {
          gte: new Date(), // Only future or today's due dates
        },
        submissions: {
          none: {
            student_id: studentId,
          },
        },
      },
    });

    return count;
  }

  private async getPendingExamsCount(studentId: string): Promise<number> {
    // Get all enrolled courses
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        student_id: studentId,
        status: 'active',
      },
      select: {
        course_id: true,
      },
    });

    const courseIds = enrollments.map((e) => e.course_id);

    if (courseIds.length === 0) {
      return 0;
    }

    // Count all assignments with assignment_type = 'exam' that don't have submissions
    const count = await this.prisma.assignment.count({
      where: {
        module: {
          course_id: {
            in: courseIds,
          },
        },
        assignment_type: 'exam',
        due_date: {
          gte: new Date(), // Only future or today's scheduled exams
        },
        submissions: {
          none: {
            student_id: studentId,
          },
        },
      },
    });

    return count;
  }
}
