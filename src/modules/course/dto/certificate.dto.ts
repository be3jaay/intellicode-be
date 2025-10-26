import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class SetPassingGradeDto {
  @ApiProperty({
    description: 'Minimum overall grade required for certificate (0-100)',
    minimum: 0,
    maximum: 100,
    example: 75.0,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  passing_grade: number;
}

export class RevokeCertificateDto {
  @ApiProperty({ description: 'Reason for revoking the certificate' })
  @IsString()
  @IsNotEmpty()
  revocation_reason: string;
}

export class CertificateDto {
  @ApiProperty({ description: 'Certificate ID' })
  id: string;

  @ApiProperty({ description: 'Course ID' })
  course_id: string;

  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Instructor ID who issued the certificate' })
  issued_by: string;

  @ApiProperty({ description: 'Date when certificate was issued' })
  issued_at: Date;

  @ApiProperty({ description: 'Final grade at time of issuance' })
  final_grade: number;

  @ApiProperty({ description: 'Certificate status', enum: ['active', 'revoked'] })
  status: string;

  @ApiPropertyOptional({ description: 'Date when certificate was revoked' })
  revoked_at?: Date;

  @ApiPropertyOptional({ description: 'Instructor ID who revoked the certificate' })
  revoked_by?: string;

  @ApiPropertyOptional({ description: 'Reason for revocation' })
  revocation_reason?: string;

  @ApiProperty({ description: 'Course information' })
  course: {
    id: string;
    title: string;
    instructor: {
      first_name: string;
      last_name: string;
    };
  };

  @ApiProperty({ description: 'Student information' })
  student: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    student_number?: string;
  };

  @ApiPropertyOptional({ description: 'Issuer information' })
  issuer?: {
    first_name: string;
    last_name: string;
  };

  @ApiPropertyOptional({ description: 'Revoker information' })
  revoker?: {
    first_name: string;
    last_name: string;
  };
}

export class CertificateEligibilityDto {
  @ApiProperty({ description: 'Whether the student is eligible for certificate' })
  is_eligible: boolean;

  @ApiProperty({ description: 'Student overall grade' })
  overall_grade: number;

  @ApiProperty({ description: 'Course passing grade requirement' })
  passing_grade: number | null;

  @ApiProperty({ description: 'Course completion percentage' })
  course_progress: number;

  @ApiProperty({ description: 'Whether student has active enrollment' })
  is_enrolled: boolean;

  @ApiProperty({ description: 'Whether passing grade is configured' })
  has_passing_grade: boolean;

  @ApiProperty({ description: 'Whether student meets grade requirement' })
  meets_grade_requirement: boolean;

  @ApiProperty({ description: 'Whether student completed 100% of course' })
  is_course_completed: boolean;

  @ApiPropertyOptional({ description: 'Reasons why student is not eligible (if applicable)' })
  ineligibility_reasons?: string[];

  @ApiPropertyOptional({ description: 'Existing certificate if already issued' })
  existing_certificate?: CertificateDto;
}

export class EligibleStudentDto {
  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Student first name' })
  first_name: string;

  @ApiProperty({ description: 'Student last name' })
  last_name: string;

  @ApiProperty({ description: 'Student email' })
  email: string;

  @ApiPropertyOptional({ description: 'Student number' })
  student_number?: string;

  @ApiProperty({ description: 'Student overall grade' })
  overall_grade: number;

  @ApiProperty({ description: 'Course completion percentage' })
  course_progress: number;

  @ApiProperty({ description: 'Whether student already has a certificate' })
  has_certificate: boolean;

  @ApiPropertyOptional({ description: 'Certificate ID if already issued' })
  certificate_id?: string;

  @ApiPropertyOptional({ description: 'Certificate issue date if already issued' })
  certificate_issued_at?: Date;

  @ApiPropertyOptional({ description: 'Certificate status: active, revoked, or expired' })
  certificate_status?: string;

  @ApiProperty({ description: 'Whether the certificate is revoked' })
  is_certificate_revoked: boolean;

  @ApiPropertyOptional({ description: 'Certificate revocation date if revoked' })
  certificate_revoked_at?: Date;

  @ApiPropertyOptional({ description: 'Reason for certificate revocation' })
  certificate_revocation_reason?: string;
}

export class EligibleStudentsResponseDto {
  @ApiProperty({ description: 'List of eligible students', type: [EligibleStudentDto] })
  eligible_students: EligibleStudentDto[];

  @ApiProperty({ description: 'Total number of eligible students' })
  total_eligible: number;

  @ApiProperty({ description: 'Total number of enrolled students' })
  total_enrolled: number;

  @ApiProperty({ description: 'Course passing grade requirement' })
  passing_grade: number | null;

  @ApiProperty({ description: 'Whether passing grade is configured' })
  has_passing_grade: boolean;
}
