import { Module, forwardRef } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { EnrollmentService } from './enrollment.service';
import { LessonService } from './lesson.service';
import { AdminService } from './admin.service';
import { FileStorageService } from './file-storage.service';
import { ModuleService } from './module.service';
import { AssignmentService } from './assignment.service';
import { ProgressService } from './progress.service';
import { GradebookService } from './gradebook.service';
import { CertificateService } from './certificate.service';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SupabaseModule, NotificationsModule],
  controllers: [CourseController],
  providers: [CourseService, EnrollmentService, LessonService, AdminService, FileStorageService, ModuleService, AssignmentService, ProgressService, GradebookService, CertificateService],
  exports: [CourseService, EnrollmentService, LessonService, AdminService, FileStorageService, ModuleService, AssignmentService, ProgressService, GradebookService, CertificateService],
})
export class CourseModule {}
