import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private clientInstance: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL and Service Role Key must be provided');
    }

    this.clientInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('Supabase client initialized successfully');
  }

  get client(): SupabaseClient {
    return this.clientInstance;
  }

  getClientWithAuth(accessToken: string): SupabaseClient {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
      },
    });
  }

  /**
   * Create a storage bucket if it doesn't exist
   * @param bucketName - The name of the bucket to create
   */
  async createBucketIfNotExists(bucketName: string): Promise<void> {
    try {
      const { data: buckets } = await this.client.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        this.logger.log(`Creating bucket: ${bucketName}`);
        const { error } = await this.client.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        });
        
        if (error) {
          this.logger.error(`Error creating bucket ${bucketName}:`, error);
        } else {
          this.logger.log(`Bucket ${bucketName} created successfully`);
        }
      }
    } catch (error) {
      this.logger.error('Error checking/creating bucket:', error);
    }
  }

  /**
   * Get bucket name based on file type
   * @param fileType - The type of file
   * @returns The appropriate bucket name
   */
  private getBucketName(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case 'image':
        return 'course-images';
      case 'video':
        return 'course-videos';
      case 'pdf':
      case 'document':
        return 'course-documents';
      case 'assignments':
      case 'assignment-files':
        return 'assignment-files';
      case 'assignment-submissions':
      case 'submission-files':
        return 'assignment-submissions';
      default:
        return 'course-files';
    }
  }

  /**
   * Get allowed MIME types for file type
   * @param fileType - The type of file
   * @returns Array of allowed MIME types
   */
  private getAllowedMimeTypes(fileType: string): string[] {
    switch (fileType.toLowerCase()) {
      case 'image':
        return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      case 'video':
        return ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
      case 'pdf':
        return ['application/pdf'];
      case 'document':
        return ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      case 'assignments':
      case 'assignment-files':
        return [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'application/zip',
          'application/x-zip-compressed',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/gif',
          'video/mp4',
          'video/webm',
          'video/ogg',
          'video/avi',
          'video/mov'
        ];
      case 'assignment-submissions':
      case 'submission-files':
        return [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'application/zip',
          'application/x-zip-compressed',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/gif',
          'video/mp4',
          'video/webm',
          'video/ogg',
          'video/avi',
          'video/mov',
          'text/javascript',
          'text/css',
          'text/html',
          'application/json',
          'application/xml'
        ];
      default:
        return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'];
    }
  }

  /**
   * Get file size limit based on file type
   * @param fileType - The type of file
   * @returns Maximum file size in bytes
   */
  private getFileSizeLimit(fileType: string): number {
    switch (fileType.toLowerCase()) {
      case 'image':
        return 5 * 1024 * 1024; // 5MB
      case 'video':
        return 100 * 1024 * 1024; // 100MB
      case 'pdf':
      case 'document':
        return 50 * 1024 * 1024; // 50MB
      case 'assignments':
      case 'assignment-files':
        return 100 * 1024 * 1024; // 100MB for assignment files
      case 'assignment-submissions':
      case 'submission-files':
        return 200 * 1024 * 1024; // 200MB for student submissions
      default:
        return 10 * 1024 * 1024; // 10MB
    }
  }

  /**
   * Upload any file type to Supabase Storage
   * @param file - The file to upload
   * @param fileType - The type of file (image, video, pdf, document)
   * @param category - The category of file (thumbnail, lesson_content, etc.)
   * @param courseId - The course ID
   * @param lessonId - The lesson ID (optional)
   * @returns Promise with the public URL of the uploaded file
   */
  async uploadFile(
    file: Express.Multer.File,
    fileType: string,
    category: string,
    courseId: string,
    lessonId?: string
  ): Promise<string> {
    try {
      const bucket = this.getBucketName(fileType);
      const allowedMimeTypes = this.getAllowedMimeTypes(fileType);
      const maxSize = this.getFileSizeLimit(fileType);

      // Ensure bucket exists
      await this.createBucketIfNotExists(bucket);

      // Validate file type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(`Invalid file type. Allowed types for ${fileType}: ${allowedMimeTypes.join(', ')}`);
      }

      // Validate file size
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        throw new BadRequestException(`File size too large. Maximum size for ${fileType} is ${maxSizeMB}MB.`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${timestamp}-${randomString}.${fileExtension}`;
      const folder = lessonId ? `lessons/${lessonId}` : `courses/${courseId}`;
      const filePath = `${folder}/${fileName}`;

      // Try to upload with service role client first
      let uploadResult = await this.client.storage
        .from(bucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      // If service role fails, try with anon key (bypass RLS)
      if (uploadResult.error) {
        this.logger.warn('Service role upload failed, trying with anon key:', uploadResult.error);
        
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
        
        const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        uploadResult = await anonClient.storage
          .from(bucket)
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });
      }

      if (uploadResult.error) {
        this.logger.error('Error uploading file to Supabase Storage:', uploadResult.error);
        throw new BadRequestException(`Failed to upload file: ${uploadResult.error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = this.client.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new BadRequestException('Failed to get public URL for uploaded file');
      }

      this.logger.log(`File uploaded successfully: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;

    } catch (error) {
      this.logger.error('Error in uploadFile:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload file');
    }
  }

  /**
   * Upload image to Supabase Storage (legacy method for backward compatibility)
   * @param file - The file to upload
   * @param bucket - The storage bucket name
   * @param folder - The folder path within the bucket
   * @returns Promise with the public URL of the uploaded file
   */
  async uploadImage(
    file: Express.Multer.File,
    bucket: string = 'course-thumbnails',
    folder: string = 'thumbnails'
  ): Promise<string> {
    try {
      // Ensure bucket exists
      await this.createBucketIfNotExists(bucket);

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new BadRequestException('File size too large. Maximum size is 5MB.');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${timestamp}-${randomString}.${fileExtension}`;
      const filePath = `${folder}/${fileName}`;

      // Try to upload with service role client first
      let uploadResult = await this.client.storage
        .from(bucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      // If service role fails, try with anon key (bypass RLS)
      if (uploadResult.error) {
        this.logger.warn('Service role upload failed, trying with anon key:', uploadResult.error);
        
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
        
        const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        uploadResult = await anonClient.storage
          .from(bucket)
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });
      }

      if (uploadResult.error) {
        this.logger.error('Error uploading file to Supabase Storage:', uploadResult.error);
        throw new BadRequestException(`Failed to upload image: ${uploadResult.error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = this.client.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new BadRequestException('Failed to get public URL for uploaded image');
      }

      this.logger.log(`Image uploaded successfully: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;

    } catch (error) {
      this.logger.error('Error in uploadImage:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * Alternative upload method that bypasses RLS by using direct API calls
   * @param file - The file to upload
   * @param bucket - The storage bucket name
   * @param folder - The folder path within the bucket
   * @returns Promise with the public URL of the uploaded file
   */
  async uploadImageDirect(
    file: Express.Multer.File,
    bucket: string = 'course-thumbnails',
    folder: string = 'thumbnails'
  ): Promise<string> {
    try {
      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new BadRequestException('File size too large. Maximum size is 5MB.');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${timestamp}-${randomString}.${fileExtension}`;
      const filePath = `${folder}/${fileName}`;

      // Use direct API call to bypass RLS
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
      
      const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': file.mimetype,
        },
        body: file.buffer as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new BadRequestException(`Failed to upload image: ${errorText}`);
      }

      // Get public URL
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
      
      this.logger.log(`Image uploaded successfully: ${publicUrl}`);
      return publicUrl;

    } catch (error) {
      this.logger.error('Error in uploadImageDirect:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * Delete image from Supabase Storage
   * @param imageUrl - The public URL of the image to delete
   * @param bucket - The storage bucket name
   */
  async deleteImage(imageUrl: string, bucket: string = 'course-thumbnails'): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const folder = urlParts[urlParts.length - 2];
      const filePath = `${folder}/${fileName}`;

      const { error } = await this.client.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        this.logger.error('Error deleting file from Supabase Storage:', error);
        // Don't throw error for delete operations to avoid breaking the flow
      } else {
        this.logger.log(`Image deleted successfully: ${filePath}`);
      }
    } catch (error) {
      this.logger.error('Error in deleteImage:', error);
      // Don't throw error for delete operations
    }
  }

  /**
   * Get signed URL for private file access
   * @param filePath - The path to the file in storage
   * @param bucket - The storage bucket name
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   */
  async getSignedUrl(
    filePath: string,
    bucket: string = 'course-thumbnails',
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw new BadRequestException(`Failed to create signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      this.logger.error('Error in getSignedUrl:', error);
      throw new BadRequestException('Failed to create signed URL');
    }
  }
}

