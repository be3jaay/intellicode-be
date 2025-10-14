import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { 
  FileUploadDto, 
  FileUploadResponseDto, 
  FileQueryDto,
  PaginatedFilesResponseDto,
  BulkFileUploadDto
} from './dto/file-upload.dto';
import { FileType, FileCategory } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { UuidValidator } from '@/common/utils/uuid.validator';

@Injectable()
export class FileStorageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    uploadDto: FileUploadDto
  ): Promise<FileUploadResponseDto> {
    // Validate UUIDs
    UuidValidator.validateMultiple({
      'course ID': uploadDto.course_id,
      'lesson ID': uploadDto.lesson_id || 'dummy'
    });

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: uploadDto.course_id }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify lesson exists if lesson_id is provided
    if (uploadDto.lesson_id) {
      const lesson = await this.prisma.lesson.findFirst({
        where: { 
          id: uploadDto.lesson_id,
          module: {
            course_id: uploadDto.course_id
          }
        }
      });

      if (!lesson) {
        throw new NotFoundException('Lesson not found or does not belong to this course');
      }
    }

    // Upload file to Supabase Storage
    const publicUrl = await this.supabaseService.uploadFile(
      file,
      uploadDto.file_type,
      uploadDto.category,
      uploadDto.course_id,
      uploadDto.lesson_id
    );

    // Generate unique filename for database
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.originalname.split('.').pop();
    const filename = `${timestamp}-${randomString}.${fileExtension}`;

    // Save file metadata to database
    const fileRecord = await this.prisma.fileStorage.create({
      data: {
        id: uuidv4(),
        filename,
        original_name: file.originalname,
        file_type: uploadDto.file_type as FileType,
        category: uploadDto.category as FileCategory,
        mime_type: file.mimetype,
        size: file.size,
        public_url: publicUrl,
        storage_path: publicUrl.split('/').slice(-2).join('/'), // Extract path from URL
        course_id: uploadDto.course_id,
        lesson_id: uploadDto.lesson_id,
        description: uploadDto.description
      }
    });

    return {
      id: fileRecord.id,
      filename: fileRecord.filename,
      file_type: fileRecord.file_type,
      category: fileRecord.category,
      size: fileRecord.size,
      mime_type: fileRecord.mime_type,
      public_url: fileRecord.public_url,
      uploaded_at: fileRecord.uploaded_at,
      course_id: fileRecord.course_id,
      lesson_id: fileRecord.lesson_id,
      description: fileRecord.description
    };
  }

  async getFiles(query: FileQueryDto): Promise<PaginatedFilesResponseDto> {
    // Convert string parameters to numbers
    const offset = parseInt(query.offset?.toString() || '0', 10);
    const limit = parseInt(query.limit?.toString() || '10', 10);

    // Build where clause
    const where: any = {};
    
    if (query.file_type) {
      where.file_type = query.file_type;
    }
    
    if (query.category) {
      where.category = query.category;
    }
    
    if (query.course_id) {
      where.course_id = query.course_id;
    }
    
    if (query.lesson_id) {
      where.lesson_id = query.lesson_id;
    }

    // Get total count
    const total = await this.prisma.fileStorage.count({ where });

    // Get paginated results
    const files = await this.prisma.fileStorage.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        course: {
          select: {
            id: true,
            title: true
          }
        },
        lesson: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        uploaded_at: 'desc'
      }
    });

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      data: files.map(file => ({
        id: file.id,
        filename: file.filename,
        file_type: file.file_type,
        category: file.category,
        size: file.size,
        mime_type: file.mime_type,
        public_url: file.public_url,
        uploaded_at: file.uploaded_at,
        course_id: file.course_id,
        lesson_id: file.lesson_id,
        description: file.description
      })),
      total,
      offset,
      limit,
      totalPages,
      currentPage
    };
  }

  async getFileById(id: string): Promise<FileUploadResponseDto> {
    // Validate UUID
    UuidValidator.validate(id, 'file ID');

    const file = await this.prisma.fileStorage.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true
          }
        },
        lesson: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return {
      id: file.id,
      filename: file.filename,
      file_type: file.file_type,
      category: file.category,
      size: file.size,
      mime_type: file.mime_type,
      public_url: file.public_url,
      uploaded_at: file.uploaded_at,
      course_id: file.course_id,
      lesson_id: file.lesson_id,
      description: file.description
    };
  }

  async deleteFile(id: string): Promise<void> {
    // Validate UUID
    UuidValidator.validate(id, 'file ID');

    const file = await this.prisma.fileStorage.findUnique({
      where: { id }
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Delete from database
    await this.prisma.fileStorage.delete({
      where: { id }
    });

    // TODO: Delete from Supabase Storage (optional)
    // You can implement this if you want to delete the actual file from storage
  }

  async getCourseFiles(courseId: string): Promise<FileUploadResponseDto[]> {
    // Validate UUID
    UuidValidator.validate(courseId, 'course ID');

    const files = await this.prisma.fileStorage.findMany({
      where: { course_id: courseId },
      orderBy: { uploaded_at: 'desc' }
    });

    return files.map(file => ({
      id: file.id,
      filename: file.filename,
      file_type: file.file_type,
      category: file.category,
      size: file.size,
      mime_type: file.mime_type,
      public_url: file.public_url,
      uploaded_at: file.uploaded_at,
      course_id: file.course_id,
      lesson_id: file.lesson_id,
      description: file.description
    }));
  }

  async getLessonFiles(lessonId: string): Promise<FileUploadResponseDto[]> {
    // Validate UUID
    UuidValidator.validate(lessonId, 'lesson ID');

    const files = await this.prisma.fileStorage.findMany({
      where: { lesson_id: lessonId },
      orderBy: { uploaded_at: 'desc' }
    });

    return files.map(file => ({
      id: file.id,
      filename: file.filename,
      file_type: file.file_type,
      category: file.category,
      size: file.size,
      mime_type: file.mime_type,
      public_url: file.public_url,
      uploaded_at: file.uploaded_at,
      course_id: file.course_id,
      lesson_id: file.lesson_id,
      description: file.description
    }));
  }
}
