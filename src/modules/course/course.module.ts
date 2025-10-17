import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { EnrollmentService } from './enrollment.service';
import { LessonService } from './lesson.service';
import { AdminService } from './admin.service';
import { FileStorageService } from './file-storage.service';
import { ModuleService } from './module.service';
import { AssignmentService } from './assignment.service';
import { ProgressService } from './progress.service';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [CourseController],
  providers: [CourseService, EnrollmentService, LessonService, AdminService, FileStorageService, ModuleService, AssignmentService, ProgressService],
  exports: [CourseService, EnrollmentService, LessonService, AdminService, FileStorageService, ModuleService, AssignmentService, ProgressService],
})
export class CourseModule {}
