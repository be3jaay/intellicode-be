import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateCertificateDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  studentName!: string;

  @ApiProperty({ example: 'STU123' })
  @IsString()
  @IsNotEmpty()
  studentNumber!: string;

  @ApiProperty({ example: 'Introduction to Programming' })
  @IsString()
  @IsNotEmpty()
  courseName!: string;

  @ApiPropertyOptional({ example: 'CERT-2025-001' })
  @IsString()
  @IsOptional()
  referenceCode?: string;

  @ApiPropertyOptional({ example: '275f9d58-02c1-4957-984a-2979a0824ea5', description: 'Optional certificate ID to include in the verification URL (preferred)' })
  @IsString()
  @IsOptional()
  certificateId?: string;

  // Accept `id` when frontend sends a generic id field (some clients send `id` instead of `certificateId`)
  @ApiPropertyOptional({ example: '275f9d58-02c1-4957-984a-2979a0824ea5', description: 'Alternate certificate id field (id) accepted for compatibility' })
  @IsString()
  @IsOptional()
  id?: string;

  // Accept `certificate_id` as another common variant
  @ApiPropertyOptional({ example: '275f9d58-02c1-4957-984a-2979a0824ea5', description: 'Alternate certificate id field (certificate_id) accepted for compatibility' })
  @IsString()
  @IsOptional()
  certificate_id?: string;

  @ApiPropertyOptional({ example: '2025-10-28' })
  @IsString()
  @IsOptional()
  issuedAt?: string;
}
