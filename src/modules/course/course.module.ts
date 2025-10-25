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
import { StudentAnalyticsService } from './student-analytics.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SupabaseModule, NotificationsModule],
  controllers: [CourseController],
  providers: [
    CourseService,
    EnrollmentService,
    LessonService,
    AdminService,
    FileStorageService,
    ModuleService,
    AssignmentService,
    ProgressService,
    GradebookService,
    CertificateService,
    StudentAnalyticsService,
    AdminAnalyticsService,
  ],
  exports: [
    CourseService,
    EnrollmentService,
    LessonService,
    AdminService,
    FileStorageService,
    ModuleService,
    AssignmentService,
    ProgressService,
    GradebookService,
    CertificateService,
    StudentAnalyticsService,
    AdminAnalyticsService,
  ],
})
export class CourseModule {}
