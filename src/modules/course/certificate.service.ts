import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { GradebookService } from './gradebook.service';
import { ProgressService } from './progress.service';
import { UuidValidator } from '@/common/utils/uuid.validator';
import { v4 as uuidv4 } from 'uuid';
import {
  CertificateDto,
  CertificateEligibilityDto,
  RevokeCertificateDto,
  EligibleStudentsResponseDto,
} from './dto/certificate.dto';

@Injectable()
export class CertificateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gradebookService: GradebookService,
    private readonly progressService: ProgressService,
  ) {}

  async checkEligibility(
    courseId: string,
    studentId: string,
    instructorId: string,
  ): Promise<CertificateEligibilityDto> {
    UuidValidator.validateMultiple({
      'course ID': courseId,
      'student ID': studentId,
      'instructor ID': instructorId,
    });

    // Verify instructor owns the course
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        instructor_id: instructorId,
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Course not found or you do not have permission to view this course',
      );
    }

    // Check if student is enrolled
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        student_id: studentId,
        course_id: courseId,
        status: 'active',
      },
    });

    const isEnrolled = !!enrollment;
    const hasPassingGrade = course.passing_grade !== null && course.passing_grade !== undefined;

    // Initialize eligibility data
    let overallGrade = 0;
    let courseProgress = 0;
    let meetsGradeRequirement = false;
    let isCourseCompleted = false;
    const ineligibilityReasons: string[] = [];

    // Calculate grades if enrolled
    if (isEnrolled) {
      try {
        const gradeSummary = await this.gradebookService.calculateStudentOverallGrade(
          courseId,
          studentId,
        );
        overallGrade = gradeSummary.overall_grade;

        // Check grade requirement
        if (hasPassingGrade && course.passing_grade !== null) {
          meetsGradeRequirement = overallGrade >= course.passing_grade;
          if (!meetsGradeRequirement) {
            ineligibilityReasons.push(
              `Grade ${overallGrade.toFixed(2)}% is below passing grade of ${course.passing_grade}%`,
            );
          }
        }
      } catch (error) {
        // If grade calculation fails, student might have no submissions
        ineligibilityReasons.push('No grades available');
      }

      // Calculate course progress
      try {
        const progressData = await this.progressService.getStudentCourseProgress(
          studentId,
          courseId,
        );

        // Calculate overall completion percentage
        const totalLessons = progressData.total_lessons || 0;
        const completedLessons = progressData.completed_lessons || 0;

        // Assignments are at the top level of progressData
        const totalAssignments = progressData.assignments?.length || 0;
        const completedAssignments =
          progressData.assignments?.filter((assignment) => assignment.is_submitted).length || 0;

        const totalItems = totalLessons + totalAssignments;
        const completedItems = completedLessons + completedAssignments;

        if (totalItems > 0) {
          courseProgress = Math.round((completedItems / totalItems) * 100);
          isCourseCompleted = courseProgress === 100;

          if (!isCourseCompleted) {
            ineligibilityReasons.push(`Course completion is ${courseProgress}%, must be 100%`);
          }
        } else {
          ineligibilityReasons.push('No course content available');
        }
      } catch (error) {
        ineligibilityReasons.push('Unable to calculate course progress');
      }
    } else {
      ineligibilityReasons.push('Student is not enrolled in the course');
    }

    if (!hasPassingGrade) {
      ineligibilityReasons.push('Course does not have a passing grade configured');
    }

    // Check if certificate already exists
    const existingCertificate = await this.prisma.courseCertificate.findUnique({
      where: {
        course_id_student_id: {
          course_id: courseId,
          student_id: studentId,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructor: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
          },
        },
        issuer: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        revoker: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    const isEligible = isEnrolled && hasPassingGrade && meetsGradeRequirement && isCourseCompleted;

    return {
      is_eligible: isEligible && !existingCertificate,
      overall_grade: overallGrade,
      passing_grade: course.passing_grade,
      course_progress: courseProgress,
      is_enrolled: isEnrolled,
      has_passing_grade: hasPassingGrade,
      meets_grade_requirement: meetsGradeRequirement,
      is_course_completed: isCourseCompleted,
      ineligibility_reasons: ineligibilityReasons.length > 0 ? ineligibilityReasons : undefined,
      existing_certificate: existingCertificate
        ? this.mapToCertificateDto(existingCertificate)
        : undefined,
    };
  }

  async getAllEligibleStudents(
    courseId: string,
    instructorId: string,
  ): Promise<EligibleStudentsResponseDto> {
    UuidValidator.validateMultiple({
      'course ID': courseId,
      'instructor ID': instructorId,
    });

    // Verify instructor owns the course
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        instructor_id: instructorId,
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Course not found or you do not have permission to view this course',
      );
    }

    const hasPassingGrade = course.passing_grade !== null && course.passing_grade !== undefined;

    // Get all active enrolled students
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        course_id: courseId,
        status: 'active',
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
          },
        },
      },
    });

    const eligibleStudents = [];

    // Check eligibility for each student
    for (const enrollment of enrollments) {
      const studentId = enrollment.student_id;

      let overallGrade = 0;
      let courseProgress = 0;
      let meetsGradeRequirement = false;
      let isCourseCompleted = false;

      // Calculate grades
      try {
        const gradeSummary = await this.gradebookService.calculateStudentOverallGrade(
          courseId,
          studentId,
        );
        overallGrade = gradeSummary.overall_grade;

        // Check grade requirement
        if (hasPassingGrade && course.passing_grade !== null) {
          meetsGradeRequirement = overallGrade >= course.passing_grade;
        }
      } catch (error) {
        // Skip students with no grades
        continue;
      }

      // Calculate course progress
      try {
        const progressData = await this.progressService.getStudentCourseProgress(
          studentId,
          courseId,
        );

        const totalLessons = progressData.total_lessons || 0;
        const completedLessons = progressData.completed_lessons || 0;
        const totalAssignments = progressData.assignments?.length || 0;
        const completedAssignments =
          progressData.assignments?.filter((assignment) => assignment.is_submitted).length || 0;

        const totalItems = totalLessons + totalAssignments;
        const completedItems = completedLessons + completedAssignments;

        if (totalItems > 0) {
          courseProgress = Math.round((completedItems / totalItems) * 100);
          isCourseCompleted = courseProgress === 100;
        }
      } catch (error) {
        // Skip students with no progress
        continue;
      }

      // Check if certificate already exists
      const existingCertificate = await this.prisma.courseCertificate.findUnique({
        where: {
          course_id_student_id: {
            course_id: courseId,
            student_id: studentId,
          },
        },
      });

      // Only include if student meets all requirements
      if (hasPassingGrade && meetsGradeRequirement && isCourseCompleted) {
        eligibleStudents.push({
          student_id: enrollment.student.id,
          first_name: enrollment.student.first_name,
          last_name: enrollment.student.last_name,
          email: enrollment.student.email,
          student_number: enrollment.student.student_number,
          overall_grade: overallGrade,
          course_progress: courseProgress,
          has_certificate: !!existingCertificate,
          certificate_id: existingCertificate?.id,
          certificate_issued_at: existingCertificate?.issued_at,
        });
      }
    }

    return {
      eligible_students: eligibleStudents,
      total_eligible: eligibleStudents.length,
      total_enrolled: enrollments.length,
      passing_grade: course.passing_grade,
      has_passing_grade: hasPassingGrade,
    };
  }

  async issueCertificate(
    courseId: string,
    studentId: string,
    instructorId: string,
  ): Promise<CertificateDto> {
    // Check eligibility first
    const eligibility = await this.checkEligibility(courseId, studentId, instructorId);

    if (eligibility.existing_certificate) {
      throw new ConflictException(
        `Certificate already exists for this student (Status: ${eligibility.existing_certificate.status})`,
      );
    }

    if (!eligibility.is_eligible) {
      throw new BadRequestException(
        `Student is not eligible for certificate: ${eligibility.ineligibility_reasons?.join(', ')}`,
      );
    }

    // Create certificate
    const certificate = await this.prisma.courseCertificate.create({
      data: {
        id: uuidv4(),
        course_id: courseId,
        student_id: studentId,
        issued_by: instructorId,
        final_grade: eligibility.overall_grade,
        status: 'active',
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructor: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
          },
        },
        issuer: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        revoker: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    return this.mapToCertificateDto(certificate);
  }

  async revokeCertificate(
    certificateId: string,
    instructorId: string,
    revokeCertificateDto: RevokeCertificateDto,
  ): Promise<CertificateDto> {
    UuidValidator.validateMultiple({
      'certificate ID': certificateId,
      'instructor ID': instructorId,
    });

    // Find certificate and verify instructor owns the course
    const certificate = await this.prisma.courseCertificate.findUnique({
      where: { id: certificateId },
      include: {
        course: true,
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    if (certificate.course.instructor_id !== instructorId) {
      throw new BadRequestException('You do not have permission to revoke this certificate');
    }

    if (certificate.status === 'revoked') {
      throw new BadRequestException('Certificate is already revoked');
    }

    // Revoke certificate
    const updatedCertificate = await this.prisma.courseCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'revoked',
        revoked_at: new Date(),
        revoked_by: instructorId,
        revocation_reason: revokeCertificateDto.revocation_reason,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructor: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
          },
        },
        issuer: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        revoker: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    return this.mapToCertificateDto(updatedCertificate);
  }

  async getAllStudentCertificates(studentId: string): Promise<CertificateDto[]> {
    UuidValidator.validate(studentId, 'student ID');

    const certificates = await this.prisma.courseCertificate.findMany({
      where: {
        student_id: studentId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructor: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
          },
        },
        issuer: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        revoker: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: {
        issued_at: 'desc',
      },
    });

    return certificates.map((cert) => this.mapToCertificateDto(cert));
  }

  async getStudentCertificate(
    courseId: string,
    studentId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<CertificateDto | null> {
    UuidValidator.validateMultiple({
      'course ID': courseId,
      'student ID': studentId,
    });

    // Check permissions
    if (requesterRole === 'student' && requesterId !== studentId) {
      throw new BadRequestException('You can only view your own certificate');
    }

    if (requesterRole === 'teacher') {
      const course = await this.prisma.course.findFirst({
        where: {
          id: courseId,
          instructor_id: requesterId,
        },
      });

      if (!course) {
        throw new NotFoundException(
          'Course not found or you do not have permission to view this course',
        );
      }
    }

    const certificate = await this.prisma.courseCertificate.findUnique({
      where: {
        course_id_student_id: {
          course_id: courseId,
          student_id: studentId,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructor: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
          },
        },
        issuer: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        revoker: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    return certificate ? this.mapToCertificateDto(certificate) : null;
  }

  async getCertificateById(certificateId: string): Promise<CertificateDto> {
    UuidValidator.validate(certificateId, 'certificate ID');

    const certificate = await this.prisma.courseCertificate.findUnique({
      where: { id: certificateId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructor: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            student_number: true,
          },
        },
        issuer: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        revoker: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return this.mapToCertificateDto(certificate);
  }

  private mapToCertificateDto(certificate: any): CertificateDto {
    return {
      id: certificate.id,
      course_id: certificate.course_id,
      student_id: certificate.student_id,
      issued_by: certificate.issued_by,
      issued_at: certificate.issued_at,
      final_grade: certificate.final_grade,
      status: certificate.status,
      revoked_at: certificate.revoked_at,
      revoked_by: certificate.revoked_by,
      revocation_reason: certificate.revocation_reason,
      course: certificate.course,
      student: certificate.student,
      issuer: certificate.issuer,
      revoker: certificate.revoker,
    };
  }
}
