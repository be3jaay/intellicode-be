import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { EnrollmentService } from './enrollment.service';
import { LessonService } from './lesson.service';
import { AdminService } from './admin.service';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [CourseController],
  providers: [CourseService, EnrollmentService, LessonService, AdminService],
  exports: [CourseService, EnrollmentService, LessonService, AdminService],
})
export class CourseModule {}
