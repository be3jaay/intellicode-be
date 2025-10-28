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

  @ApiPropertyOptional({ example: '2025-10-28' })
  @IsString()
  @IsOptional()
  issuedAt?: string;
}
