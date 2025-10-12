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
   * Upload image to Supabase Storage
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

      // Upload file to Supabase Storage using service client
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        this.logger.error('Error uploading file to Supabase Storage:', error);
        throw new BadRequestException(`Failed to upload image: ${error.message}`);
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

