import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FileType, FileCategory } from '@prisma/client';

export class FileUploadDto {
  @ApiProperty({ enum: FileType, description: 'File type' })
  @IsEnum(FileType)
  @IsNotEmpty()
  file_type: FileType;

  @ApiProperty({ enum: FileCategory, description: 'File category' })
  @IsEnum(FileCategory)
  @IsNotEmpty()
  category: FileCategory;

  @ApiProperty({ description: 'Course ID' })
  @IsString()
  @IsNotEmpty()
  course_id: string;

  @ApiProperty({ description: 'Lesson ID (optional)' })
  @IsString()
  @IsOptional()
  lesson_id?: string;

  @ApiProperty({ description: 'File description (optional)' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class FileUploadResponseDto {
  @ApiProperty({ description: 'File ID' })
  id: string;

  @ApiProperty({ description: 'File name' })
  filename: string;

  @ApiProperty({ description: 'File type' })
  file_type: FileType;

  @ApiProperty({ description: 'File category' })
  category: FileCategory;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'MIME type' })
  mime_type: string;

  @ApiProperty({ description: 'Public URL' })
  public_url: string;

  @ApiProperty({ description: 'Upload date' })
  uploaded_at: Date;

  @ApiProperty({ description: 'Course ID' })
  course_id: string;

  @ApiProperty({ description: 'Lesson ID' })
  lesson_id?: string;

  @ApiProperty({ description: 'Description' })
  description?: string;
}

export class BulkFileUploadDto {
  @ApiProperty({ description: 'Course ID' })
  @IsString()
  @IsNotEmpty()
  course_id: string;

  @ApiProperty({ description: 'Lesson ID (optional)' })
  @IsString()
  @IsOptional()
  lesson_id?: string;

  @ApiProperty({ 
    type: [FileUploadDto], 
    description: 'Array of file uploads' 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileUploadDto)
  files: FileUploadDto[];
}

export class FileQueryDto {
  @ApiProperty({ required: false, enum: FileType, description: 'Filter by file type' })
  @IsOptional()
  @IsEnum(FileType)
  file_type?: FileType;

  @ApiProperty({ required: false, enum: FileCategory, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiProperty({ required: false, description: 'Filter by course ID' })
  @IsString()
  @IsOptional()
  course_id?: string;

  @ApiProperty({ required: false, description: 'Filter by lesson ID' })
  @IsString()
  @IsOptional()
  lesson_id?: string;

  @ApiProperty({ required: false, description: 'Number of records to skip' })
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @ApiProperty({ required: false, description: 'Number of records to take' })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}

export class PaginatedFilesResponseDto {
  @ApiProperty({ description: 'List of files' })
  data: FileUploadResponseDto[];

  @ApiProperty({ description: 'Total number of files' })
  total: number;

  @ApiProperty({ description: 'Number of records skipped' })
  offset: number;

  @ApiProperty({ description: 'Number of records taken' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Current page number' })
  currentPage: number;
}
