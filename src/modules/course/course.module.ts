import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { EnrollmentService } from './enrollment.service';
import { LessonService } from './lesson.service';
import { AdminService } from './admin.service';
import { FileStorageService } from './file-storage.service';
import { ModuleService } from './module.service';
import { AssignmentService } from './assignment.service';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [CourseController],
  providers: [CourseService, EnrollmentService, LessonService, AdminService, FileStorageService, ModuleService, AssignmentService],
  exports: [CourseService, EnrollmentService, LessonService, AdminService, FileStorageService, ModuleService, AssignmentService],
})
export class CourseModule {}
