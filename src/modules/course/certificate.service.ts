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
import type { Browser } from 'puppeteer-core';
import {
  CertificateDto,
  CertificateEligibilityDto,
  RevokeCertificateDto,
  EligibleStudentsResponseDto,
} from './dto/certificate.dto';
import { GenerateCertificateDto } from './dto/generate-certificate.dto';

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
          certificate_status: existingCertificate?.status,
          is_certificate_revoked: existingCertificate?.status === 'revoked',
          certificate_revoked_at: existingCertificate?.revoked_at,
          certificate_revocation_reason: existingCertificate?.revocation_reason,
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
    courseId: string,
    studentId: string,
    instructorId: string,
    revokeCertificateDto: RevokeCertificateDto,
  ): Promise<CertificateDto> {
    UuidValidator.validateMultiple({
      'course ID': courseId,
      'student ID': studentId,
      'instructor ID': instructorId,
    });

    // Find certificate by course and student, and verify instructor owns the course
    const certificate = await this.prisma.courseCertificate.findUnique({
      where: {
        course_id_student_id: {
          course_id: courseId,
          student_id: studentId,
        },
      },
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
      where: { id: certificate.id },
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

  async generatePdf(dto: GenerateCertificateDto): Promise<{ buffer: Uint8Array; fileName: string }> {
    const normalized = this.normalizeCertificateData({
      studentName: dto.studentName,
      courseName: dto.courseName,
      studentNumber: dto.studentNumber,
      issuedDate: dto.issuedAt,
    });
    const html = this.buildCertificateHTML(normalized);
    const pdf = await this.renderWithPuppeteer(html);
    const fileName = `certificate-${normalized.referenceCode}.pdf`;
    return { buffer: pdf, fileName };
  }

  // --- Frontend normalization and formatting logic ---
  private formatIssuedDate(d: Date): string {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private generateReference(issuedDate: Date, studentNumber: string): string {
    const year = issuedDate.getFullYear();
    const alnum = (studentNumber || '').replace(/[^a-zA-Z0-9]/g, '');
    const last5 = alnum.slice(-5).padStart(5, '0');
    return `REF-${year}-${last5}`;
  }

  private normalizeCertificateData(input: {
    studentName: string;
    courseName: string;
    studentNumber: string;
    issuedDate?: string;
  }) {
    const issued = input.issuedDate ? new Date(input.issuedDate) : new Date();
    const issuedDateISO = issued.toISOString();
    return {
      studentName: input.studentName.trim(),
      courseName: input.courseName.trim(),
      studentNumber: input.studentNumber.trim(),
      issuedDateISO,
      issuedDateObj: issued,
      issuedDateLong: this.formatIssuedDate(issued),
      referenceCode: this.generateReference(issued, input.studentNumber),
    };
  }

  private buildCertificateHTML(d: any): string {
    const css = this.getCertificateCSS();
    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Certificate of Completion - ${this.escapeHtml(d.studentName)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>${css}</style>
      </head>
      <body>
        ${this.buildCertificateInnerHTML(d)}
      </body>
    </html>
    `;
  }

  private getCertificateCSS() {
    return `
      @page {
        size: A4 landscape;
        margin: 0;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { height: 100%; background: white; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .cert-page { width: 297mm; height: 210mm; background: #ffffff; position: relative; overflow: hidden; }
      .cert-container { position: relative; width: 100%; height: 100%; padding: 0; display: flex; align-items: center; justify-content: center; }
      .cert-card { width: 100%; height: 100%; background: white; border: none; box-shadow: none; position: relative; }
      .cert-card::before { content: ''; position: absolute; inset: 0 0 55% 0; background: radial-gradient(120% 80% at 100% 0%, #f7ffe9 0%, #ffffff 70%), repeating-linear-gradient(-12deg, rgba(189, 240, 82, 0.10) 0 2px, transparent 2px 10px); -webkit-mask: linear-gradient(to bottom, black 70%, transparent); mask: linear-gradient(to bottom, black 70%, transparent); pointer-events: none; z-index: 0; }
      .cert-card::after { content: ''; position: absolute; inset: 10mm; border: 2px solid #bdf052; border-radius: 0; pointer-events: none; z-index: 1; }
      .cert-inner { position: relative; width: 100%; height: 100%; padding: 20mm 30mm; display: flex; flex-direction: column; z-index: 2; }
      .cert-watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 90pt; letter-spacing: 8px; color: #bdf052; opacity: 0.05; transform: rotate(-8deg); user-select: none; pointer-events: none; z-index: 0; }
      .cert-logo-wrapper { position: absolute; top: 20mm; left: 30mm; }
      .cert-logo-box { display: flex; align-items: center; gap: 8px; }
      .cert-logo-svg { height: 40px; width: auto; display: block; }
      .cert-logo-name { display: flex; flex-direction: row; align-items: baseline; line-height: 1.2; }
      .cert-logo-name-main { font-family: 'Montserrat', sans-serif; font-size:20pt; font-weight: 700; color: #000000; }
      .cert-logo-name-sub { font-family: 'Montserrat', sans-serif; font-size: 20pt; font-weight: 700; color: #BDF052; margin-left: 2px; }
      .cert-content { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding-top: 15mm; }
      .cert-award-text { font-family: 'Montserrat', sans-serif; font-size: 11pt; color: #6b7280; font-weight: 400; margin-bottom: 8mm; letter-spacing: 0.5px; }
      .cert-student-name { font-family: 'Crimson Text', serif; font-size: 48pt; font-weight: 600; color: #111827; margin-bottom: 8mm; line-height: 1.2; }
      .cert-completion-text { font-family: 'Montserrat', sans-serif; font-size: 11pt; color: #6b7280; font-weight: 400; margin-bottom: 6mm; letter-spacing: 0.5px; }
      .cert-course-name { font-family: 'Montserrat', sans-serif; font-size: 26pt; font-weight: 700; color: #111827; margin-bottom: 1mm; line-height: 1.3; letter-spacing: 0.5px; }
      .cert-accent-line { width: 60mm; height: 3px; background: linear-gradient(90deg, #bdf052 0%, #a3d742 100%); border-radius: 2px; margin: 0.5mm auto 0 auto; }
      .cert-course-subtext { font-family: 'Montserrat', sans-serif; font-size: 11pt; color: #6b7280; font-weight: 400; font-style: italic; }
      .cert-footer { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 5mm; }
      .cert-footer-left { text-align: left; }
      .cert-footer-right { text-align: right; }
      .cert-footer-label { font-family: 'Montserrat', sans-serif; font-size: 8pt; color: #9ca3af; font-weight: 400; margin-bottom: 1mm; letter-spacing: 0.5px; }
      .cert-footer-value { font-family: 'Montserrat', sans-serif; font-size: 10pt; color: #374151; font-weight: 600; }
      @media print { .cert-page { box-shadow: none; } }
    `;
  }

  private buildCertificateInnerHTML(d: any): string {
    return `
      <div class="cert-page" role="document" aria-label="Certificate of Completion">
        <div class="cert-container">
          <div class="cert-card">
            <div class="cert-watermark" aria-hidden="true">INTELLICODE</div>
            <div class="cert-inner">
              <div class="cert-logo-wrapper">
                <div class="cert-logo-box" aria-label="IntelliCode logo">
                  <svg class="cert-logo-svg" viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                    <g stroke="#A3E635" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 16 L4 8" />
                      <path d="M12 16 L4 24" />
                      <path d="M28 16 L36 8" />
                      <path d="M28 16 L36 24" />
                    </g>
                  </svg>
                  <div class="cert-logo-name" aria-hidden="true">
                    <span class="cert-logo-name-main">Intelli</span>
                    <span class="cert-logo-name-sub">code</span>
                  </div>
                </div>
              </div>
              <div class="cert-content">
                <p class="cert-award-text">This certificate is awarded to</p>
                <div class="cert-student-name">${this.escapeHtml(d.studentName)}</div>
                <p class="cert-completion-text">for successfully completing</p>
                <div class="cert-course-name">${this.escapeHtml(d.courseName)}</div>
                <div class="cert-accent-line" aria-hidden="true"></div>
                <p class="cert-course-subtext">through the IntelliCode program.</p>
              </div>
              <footer class="cert-footer">
                <div class="cert-footer-left">
                  <div class="cert-footer-value">${d.issuedDateLong}</div>
                  <div class="cert-footer-label">Completion Date</div>
                </div>
                <div class="cert-footer-right">
                  <div class="cert-footer-value">${d.referenceCode}</div>
                  <div class="cert-footer-label">Certificate Reference</div>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private escapeHtml(s: string) {
    return s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }


  private async renderWithPuppeteer(html: string): Promise<Uint8Array> {
    const isProdRailway = process.env.NODE_ENV === 'production' && !!process.env.RAILWAY_SERVICE_NAME;
    if (isProdRailway) {
      const { default: Chromium } = await import('@sparticuz/chromium');
      const puppeteer = await import('puppeteer-core');
      const browser = await puppeteer.launch({
        headless: 'shell',
        args: Chromium.args,
        executablePath: await Chromium.executablePath(),
      });
      try {
        return await this.renderPdf(browser, html);
      } finally {
        await browser.close();
      }
    } else {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      try {
        return await this.renderPdf(browser as unknown as Browser, html);
      } finally {
        await browser.close();
      }
    }
  }

  private async renderPdf(browser: Browser, html: string): Promise<Uint8Array> {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    try { await page.emulateMediaType('print'); } catch {}
    try { await (await page.evaluateHandle('document.fonts && document.fonts.ready')).jsonValue(); } catch {}
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    await page.close();
    return pdf;
  }
}
