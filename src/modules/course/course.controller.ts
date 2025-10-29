import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  HttpCode,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CourseService } from './course.service';
import {
  CreateCourseDto,
  CreateCourseWithFileDto,
  CreateCourseResponseDto,
  CourseQueryDto,
  PaginatedCoursesResponseDto,
} from './dto/create-course.dto';
import { CourseViewResponseDto, LessonProgressUpdateDto } from './dto/course-view.dto';
import { UpdateCourseDto, UpdateCourseResponseDto } from './dto/update-course.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/user.interface';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { LessonService } from './lesson.service';
import { AdminService } from './admin.service';
import {
  EnrollCourseDto,
  EnrollmentResponseDto,
  StudentEnrollmentsQueryDto,
  PaginatedEnrollmentsResponseDto,
} from './dto/enrollment.dto';
import {
  StudentDto,
  CourseStudentsQueryDto,
  PaginatedStudentsResponseDto,
  UpdateEnrollmentStatusDto,
  EnrollmentStatusResponseDto,
  CourseProgressDto,
} from './dto/student.dto';
import {
  CreateLessonDto,
  UpdateLessonDto,
  BulkCreateLessonsDto,
  BulkCreateLessonsFromObjectDto,
  LessonResponseDto,
} from './dto/lesson.dto';
import {
  ApproveCourseDto,
  PendingCoursesQueryDto,
  ResubmitCourseResponseDto,
} from './dto/admin.dto';
import {
  FileUploadDto,
  FileUploadResponseDto,
  FileQueryDto,
  PaginatedFilesResponseDto,
} from './dto/file-upload.dto';
import { FileStorageService } from './file-storage.service';
import { ModuleService } from './module.service';
import {
  CreateModuleDto,
  UpdateModuleDto,
  ModuleResponseDto,
  ModuleQueryDto,
  PaginatedModulesResponseDto,
  BulkCreateModulesDto,
  BulkCreateModuleItemDto,
  ModuleListItemDto,
  ModuleListQueryDto,
  PaginatedModuleListResponseDto,
} from './dto/module.dto';
import { AssignmentService } from './assignment.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentResponseDto,
  AssignmentQueryDto,
  PaginatedAssignmentsResponseDto,
  AssignmentSubmissionDto,
  AssignmentSubmissionResponseDto,
  CodeSubmissionDto,
  StudentScoreDto,
  ManualGradingDto,
  AssignmentGradingResponseDto,
} from './dto/assignment.dto';
import { ProgressService } from './progress.service';
import { InstructorAnalyticsDto } from './dto/instructor-analytics.dto';
import { GradebookService } from './gradebook.service';
import {
  GradebookQueryDto,
  InstructorGradebookDto,
  StudentGradebookDto,
  GradeSummaryDto,
  CourseGradeWeightsDto,
  UpdateCourseGradeWeightsDto,
} from './dto/gradebook.dto';
import { CertificateService } from './certificate.service';
import {
  CertificateDto,
  CertificateEligibilityDto,
  RevokeCertificateDto,
  SetPassingGradeDto,
  EligibleStudentsResponseDto,
} from './dto/certificate.dto';
import { GenerateCertificateDto } from './dto/generate-certificate.dto';
import { StudentAnalyticsService } from './student-analytics.service';
import { StudentDashboardAnalyticsDto } from './dto/student-analytics.dto';
import { AdminAnalyticsService } from './admin-analytics.service';
import {
  AdminDashboardAnalyticsDto,
  SystemAnalyticsDto,
  StudentPerformanceDto,
  InstructorPerformanceDto,
  AdminCourseProgressDto,
} from './dto/admin-analytics.dto';

@Controller('course')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly enrollmentService: EnrollmentService,
    private readonly lessonService: LessonService,
    private readonly adminService: AdminService,
    private readonly fileStorageService: FileStorageService,
    private readonly moduleService: ModuleService,
    private readonly assignmentService: AssignmentService,
    private readonly progressService: ProgressService,
    private readonly gradebookService: GradebookService,
    private readonly certificateService: CertificateService,
    private readonly studentAnalyticsService: StudentAnalyticsService,
    private readonly adminAnalyticsService: AdminAnalyticsService,
  ) {}

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Course created successfully',
    type: CreateCourseResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Teacher role required' })
  @Post()
  async create(@Body() createCourseDto: CreateCourseDto, @CurrentUser() user: RequestUser) {
    return await this.courseService.createCourse(createCourseDto, user.id);
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course with thumbnail upload' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Course created successfully with uploaded thumbnail',
    type: CreateCourseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or file upload failed',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Teacher role required' })
  @UseInterceptors(FileInterceptor('thumbnail'))
  @Post('with-thumbnail')
  async createWithThumbnail(
    @Body() createCourseDto: CreateCourseWithFileDto,
    @UploadedFile() thumbnailFile: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.courseService.createCourse(createCourseDto, user.id, thumbnailFile);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Courses retrieved successfully',
    type: PaginatedCoursesResponseDto,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to take',
  })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by title' })
  async findAll(@Query() query: CourseQueryDto) {
    return await this.courseService.findAll(query);
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('my-courses')
  @ApiOperation({ summary: 'Get all my courses with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Courses retrieved successfully',
    type: PaginatedCoursesResponseDto,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to take',
  })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by title' })
  async findAllByInstructor(@Query() query: CourseQueryDto, @CurrentUser() user: RequestUser) {
    return await this.courseService.findAllByInstructor(query, user.id);
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('instructor-analytics')
  @ApiOperation({ summary: 'Get instructor analytics dashboard data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics data retrieved successfully',
    type: InstructorAnalyticsDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Teacher role required' })
  async getInstructorAnalytics(@CurrentUser() user: RequestUser) {
    return await this.courseService.getInstructorAnalytics(user.id);
  }

  @Get('my-enrollments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my course enrollments' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollments retrieved successfully',
    type: PaginatedEnrollmentsResponseDto,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to take',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by enrollment status',
  })
  async getMyEnrollments(
    @Query() query: StudentEnrollmentsQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.enrollmentService.getStudentEnrollments(query, user.id);
  }

  @Get('latest-enrollments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my three latest enrollments' })
  async getMyThreeLatestEnrollments(@CurrentUser() user: RequestUser) {
    return await this.enrollmentService.getMyThreeLatestEnrollments(user.id);
  }

  @Get('enrolled/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get enrolled course details with lessons' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course details retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found or not enrolled' })
  async getEnrolledCourseDetails(
    @Param('courseId') courseId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.enrollmentService.getEnrolledCourseDetails(courseId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course retrieved successfully',
    type: CreateCourseResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  async findOne(@Param('id') id: string) {
    return await this.courseService.findOne(id);
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course updated successfully',
    type: UpdateCourseResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Teacher role required' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return await this.courseService.update(id, updateCourseDto);
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Resubmit a rejected course for approval' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course resubmitted successfully',
    type: ResubmitCourseResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Only rejected courses can be resubmitted',
  })
  @Patch(':id/resubmit')
  async resubmitCourse(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return await this.courseService.resubmitCourse(id, user.id);
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Teacher role required' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.courseService.remove(id);
  }

  // Enrollment endpoints
  @Post('enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Enroll in a course using invite code' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Successfully enrolled in course',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found or not approved' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Already enrolled or invalid invite code',
  })
  async enrollInCourse(@Body() enrollDto: EnrollCourseDto, @CurrentUser() user: RequestUser) {
    return await this.enrollmentService.enrollInCourse(enrollDto, user.id);
  }

  // Lesson management endpoints (for instructors)
  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Post(':courseId/modules/:moduleId/lessons')
  @ApiOperation({ summary: 'Create a lesson in a module' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lesson created successfully',
    type: LessonResponseDto,
  })
  async createLesson(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() createLessonDto: CreateLessonDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.lessonService.createLesson(createLessonDto, moduleId, user.id);
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Post(':courseId/modules/:moduleId/lessons/bulk')
  @ApiOperation({ summary: 'Bulk create lessons in a module' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lessons created successfully',
    type: [LessonResponseDto],
  })
  async bulkCreateLessons(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() bulkCreateDto: Omit<BulkCreateLessonsDto, 'module_id'>,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.lessonService.bulkCreateLessons(
      { ...bulkCreateDto, module_id: moduleId },
      user.id,
    );
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Post(':courseId/modules/:moduleId/lessons/bulk-object')
  @ApiOperation({ summary: 'Bulk create lessons from object format in a module' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lessons created successfully',
    type: [LessonResponseDto],
  })
  async bulkCreateLessonsFromObject(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() bulkCreateDto: Omit<BulkCreateLessonsFromObjectDto, 'module_id' | 'course_id'>,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.lessonService.bulkCreateLessonsFromObject(
      { ...bulkCreateDto, course_id: courseId, module_id: moduleId },
      user.id,
    );
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('modules/:moduleId/lessons')
  @ApiOperation({ summary: 'Get all lessons for a module' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lessons retrieved successfully' })
  async getModuleLessons(@Param('moduleId') moduleId: string, @CurrentUser() user: RequestUser) {
    return await this.lessonService.getModuleLessons(moduleId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('lessons/:lessonId')
  @ApiOperation({ 
    summary: 'Get lesson details by ID',
    description: 'Retrieve complete lesson information including activities, files, module and course details'
  })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson details retrieved successfully',
    type: LessonResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lesson not found',
  })
  async getLessonById(@Param('lessonId') lessonId: string) {
    return await this.lessonService.getLessonById(lessonId);
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch('lessons/:lessonId')
  @ApiOperation({ summary: 'Update a lesson by ID' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson updated successfully',
    type: LessonResponseDto,
  })
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.lessonService.updateLesson(lessonId, updateLessonDto, user.id);
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete('lessons/:lessonId')
  @ApiOperation({ summary: 'Delete a lesson by ID' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson deleted successfully',
  })
  async deleteLesson(@Param('lessonId') lessonId: string, @CurrentUser() user: RequestUser) {
    await this.lessonService.deleteLesson(lessonId, user.id);
    return {
      success: true,
      message: 'Lesson deleted successfully',
    };
  }

  // Admin endpoints
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('admin/pending')
  @ApiOperation({ 
    summary: 'Get all courses with optional status filter',
    description: 'Fetch all courses or filter by status (waiting_for_approval, approved, rejected). Defaults to all courses if no status is provided.'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Courses retrieved successfully' })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip (default: 0)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to take (default: 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['waiting_for_approval', 'approved', 'rejected'],
    description: 'Filter by course status (optional - returns all courses if not provided)',
  })
  async getPendingCourses(@Query() query: PendingCoursesQueryDto) {
    return await this.adminService.getPendingCourses(query);
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch('admin/:courseId/approve')
  @ApiOperation({ summary: 'Approve or reject a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course status updated successfully' })
  async approveCourse(
    @Param('courseId') courseId: string,
    @Body() approveDto: ApproveCourseDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.adminService.approveCourse(courseId, approveDto, user.id);
  }

  // File Storage Endpoints
  @Post('files/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload file to course' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'File uploaded successfully',
    type: FileUploadResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: FileUploadDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.fileStorageService.uploadFile(file, uploadDto);
  }

  @Get('files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get files with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Files retrieved successfully',
    type: PaginatedFilesResponseDto,
  })
  @ApiQuery({
    name: 'file_type',
    required: false,
    enum: ['image', 'video', 'pdf', 'document'],
    description: 'Filter by file type',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['thumbnail', 'lesson_content', 'assignment', 'resource'],
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'course_id',
    required: false,
    type: String,
    description: 'Filter by course ID',
  })
  @ApiQuery({
    name: 'lesson_id',
    required: false,
    type: String,
    description: 'Filter by lesson ID',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to take',
  })
  async getFiles(@Query() query: FileQueryDto) {
    return await this.fileStorageService.getFiles(query);
  }

  @Get('files/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File retrieved successfully',
    type: FileUploadResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'File not found' })
  async getFileById(@Param('id') id: string) {
    return await this.fileStorageService.getFileById(id);
  }

  @Delete('files/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'File deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'File not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Param('id') id: string) {
    await this.fileStorageService.deleteFile(id);
  }

  @Get(':courseId/files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all files for a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course files retrieved successfully',
    type: [FileUploadResponseDto],
  })
  async getCourseFiles(@Param('courseId') courseId: string) {
    return await this.fileStorageService.getCourseFiles(courseId);
  }

  @Get('lessons/:lessonId/files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all files for a lesson' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson files retrieved successfully',
    type: [FileUploadResponseDto],
  })
  async getLessonFiles(@Param('lessonId') lessonId: string) {
    return await this.fileStorageService.getLessonFiles(lessonId);
  }

  // Module endpoints
  @Post(':courseId/modules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new module' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Module created successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid course ID or module data' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  @HttpCode(HttpStatus.CREATED)
  async createModule(
    @Param('courseId') courseId: string,
    @Body() createModuleDto: Omit<CreateModuleDto, 'course_id'>,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.moduleService.createModule(
      { ...createModuleDto, course_id: courseId },
      user.id,
    );
  }

  @Get(':courseId/modules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all modules for a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Modules retrieved successfully',
    type: [ModuleResponseDto],
  })
  async getAllModulesByCourseId(@Param('courseId') courseId: string) {
    return await this.moduleService.getAllModulesByCourseId(courseId);
  }

  @Get(':courseId/modules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all modules for a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to take',
  })
  @ApiQuery({
    name: 'is_published',
    required: false,
    type: Boolean,
    description: 'Filter by published status',
  })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by title' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Modules retrieved successfully',
    type: PaginatedModulesResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  async getCourseModules(
    @Param('courseId') courseId: string,
    @Query() query: ModuleQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.moduleService.getCourseModules(courseId, query);
  }

  @Get('modules/:moduleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get module by ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module retrieved successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Module not found' })
  async getModuleById(@Param('moduleId') moduleId: string, @CurrentUser() user: RequestUser) {
    return await this.moduleService.getModuleById(
      moduleId,
      user.role === 'teacher' ? user.id : undefined,
    );
  }

  @Patch('modules/:moduleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update module' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module updated successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Module not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to update this module',
  })
  async updateModule(
    @Param('moduleId') moduleId: string,
    @Body() updateModuleDto: UpdateModuleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.moduleService.updateModule(moduleId, updateModuleDto, user.id);
  }

  @Delete('modules/:moduleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete module' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Module deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Module not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete module with lessons or files',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteModule(@Param('moduleId') moduleId: string, @CurrentUser() user: RequestUser) {
    await this.moduleService.deleteModule(moduleId, user.id);
  }

  @Post(':courseId/modules/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create multiple modules at once' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Modules created successfully',
    type: [ModuleResponseDto],
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid course ID or module data' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  @HttpCode(HttpStatus.CREATED)
  async bulkCreateModules(
    @Param('courseId') courseId: string,
    @Body() modules: BulkCreateModuleItemDto[],
    @CurrentUser() user: RequestUser,
  ) {
    return await this.moduleService.bulkCreateModules({ course_id: courseId, modules }, user.id);
  }

  @Get(':courseId/modules/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get modules list with counts for a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to take',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by title or description',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Modules list retrieved successfully',
    type: PaginatedModuleListResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  async getCourseModulesList(
    @Param('courseId') courseId: string,
    @Query() query: ModuleListQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.moduleService.getCourseModulesList(courseId, query, user.id);
  }

  // Assignment endpoints
  @Post('modules/:moduleId/assignments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new assignment in a module' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Assignment created successfully',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid module ID or assignment data',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Module not found' })
  @HttpCode(HttpStatus.CREATED)
  async createAssignment(
    @Param('moduleId') moduleId: string,
    @Body() createAssignmentDto: CreateAssignmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.assignmentService.createAssignment(createAssignmentDto, user.id, moduleId);
  }

  @Post('modules/:moduleId/assignments/with-file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new assignment with file upload' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Assignment created successfully with file',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid module ID or assignment data',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Module not found' })
  @UseInterceptors(FileInterceptor('attachment'))
  @HttpCode(HttpStatus.CREATED)
  async createAssignmentWithFile(
    @Param('moduleId') moduleId: string,
    @Body() createAssignmentDto: CreateAssignmentDto,
    @UploadedFile() attachmentFile: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.assignmentService.createAssignmentWithFile(
      createAssignmentDto,
      user.id,
      moduleId,
      attachmentFile,
    );
  }

  @Get('modules/:moduleId/assignments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all assignments for a module' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to take',
  })
  @ApiQuery({
    name: 'assignment_type',
    required: false,
    enum: ['quiz_form', 'file_upload'],
    description: 'Filter by assignment type',
  })
  @ApiQuery({
    name: 'is_published',
    required: false,
    type: Boolean,
    description: 'Filter by published status',
  })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by title' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assignments retrieved successfully',
    type: PaginatedAssignmentsResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Module not found' })
  async getModuleAssignments(
    @Param('moduleId') moduleId: string,
    @Query() query: AssignmentQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.assignmentService.getModuleAssignments(moduleId, query, user.id);
  }

  @Get('assignments/:assignmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get assignment by ID' })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assignment retrieved successfully',
    type: AssignmentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assignment not found' })
  async getAssignmentById(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.assignmentService.getAssignmentById(assignmentId, user.id);
  }

  @Patch('assignments/:assignmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update assignment' })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assignment updated successfully',
    type: AssignmentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assignment not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to update this assignment',
  })
  async updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.assignmentService.updateAssignment(
      assignmentId,
      updateAssignmentDto,
      user.id,
    );
  }

  @Delete('assignments/:assignmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete assignment' })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Assignment deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assignment not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete assignment with submissions',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAssignment(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.assignmentService.deleteAssignment(assignmentId, user.id);
  }

  @Post('assignments/:assignmentId/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Submit assignment (JSON-based for quiz/code submissions)' })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Assignment submitted successfully',
    type: AssignmentSubmissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assignment not found or not published',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Already submitted or invalid submission data',
  })
  @HttpCode(HttpStatus.CREATED)
  async submitAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() submissionDto: AssignmentSubmissionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.assignmentService.submitAssignment(assignmentId, submissionDto, user.id);
  }

  @Post('assignments/:assignmentId/submit-with-files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Submit assignment with file uploads (for file_upload assignments only)',
    description:
      'Upload files directly for file_upload type assignments. Supports up to 10 files per submission.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload (max 10 files)',
        },
      },
    },
  })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Assignment with files submitted successfully',
    type: AssignmentSubmissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assignment not found or not published',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Already submitted, no files provided, or file upload failed',
  })
  @UseInterceptors(FilesInterceptor('files', 10)) // Allow up to 10 files
  @HttpCode(HttpStatus.CREATED)
  async submitAssignmentWithFiles(
    @Param('assignmentId') assignmentId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: RequestUser,
  ) {
    return await this.assignmentService.submitAssignmentWithFiles(assignmentId, files, user.id);
  }

  @Post('assignments/:assignmentId/submit-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Submit code for code_sandbox assignments',
    description:
      'Submit code directly for code_sandbox type assignments. The code will be stored and require manual grading by the instructor.',
  })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Code assignment submitted successfully',
    type: AssignmentSubmissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assignment not found or not published',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Already submitted, code is empty, or wrong assignment type',
  })
  @HttpCode(HttpStatus.CREATED)
  async submitCodeAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() codeSubmissionDto: CodeSubmissionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.assignmentService.submitCodeAssignment(
      assignmentId,
      codeSubmissionDto.code,
      codeSubmissionDto.language,
      user.id,
    );
  }

  @Get('assignments/:assignmentId/submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get student submissions for an assignment' })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Submissions retrieved successfully',
    type: [AssignmentSubmissionResponseDto],
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assignment not found' })
  async getStudentSubmissions(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.assignmentService.getStudentSubmissions(assignmentId, user.id);
  }

  // Instructor grading endpoints
  @Get('assignments/:assignmentId/scores')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get student scores for an assignment (for instructors)' })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student scores retrieved successfully',
    type: [StudentScoreDto],
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assignment not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view scores',
  })
  async getAssignmentStudentScores(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.assignmentService.getAssignmentStudentScores(assignmentId, user.id);
  }

  @Get('assignments/:assignmentId/submissions-for-grading')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all submissions for grading (for instructors)' })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Submissions retrieved successfully',
    type: [AssignmentGradingResponseDto],
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assignment not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view submissions',
  })
  async getAssignmentSubmissionsForGrading(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.assignmentService.getAssignmentSubmissionsForGrading(assignmentId, user.id);
  }

  @Patch('assignments/submissions/grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Manually grade a student submission' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Submission graded successfully',
    type: AssignmentGradingResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Submission not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to grade this submission',
  })
  async manuallyGradeSubmission(
    @Body() gradingDto: ManualGradingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.assignmentService.manuallyGradeSubmission(gradingDto, user.id);
  }

  @Delete('assignments/:assignmentId/submissions/:studentId/undo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Undo/reset a submission - Students can undo file_upload submissions, Instructors can undo any',
  })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  @ApiParam({
    name: 'studentId',
    description: 'Student ID (use your own ID if you are a student)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Submission reset successfully - can now resubmit',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assignment or submission not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to undo this submission',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot undo graded submissions or non-file-upload types (for students)',
  })
  async undoStudentSubmission(
    @Param('assignmentId') assignmentId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const isInstructor = user.role === 'teacher';
    return await this.assignmentService.undoStudentSubmission(
      assignmentId,
      studentId,
      user.id,
      isInstructor,
    );
  }

  // Student management endpoints
  @Get(':courseId/students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all students enrolled in a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to take',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'completed', 'dropped', 'suspended'],
    description: 'Filter by enrollment status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by student name or email',
  })
  @ApiQuery({ name: 'section', required: false, type: String, description: 'Filter by section' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Students retrieved successfully',
    type: PaginatedStudentsResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view students',
  })
  async getCourseStudents(
    @Param('courseId') courseId: string,
    @Query() query: CourseStudentsQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.enrollmentService.getCourseStudents(courseId, query, user.id);
  }

  @Patch(':courseId/students/:studentId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update student enrollment status' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment status updated successfully',
    type: EnrollmentStatusResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course or student not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to manage enrollments',
  })
  async updateEnrollmentStatus(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
    @Body() updateDto: UpdateEnrollmentStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.enrollmentService.updateEnrollmentStatus(
      courseId,
      studentId,
      updateDto,
      user.id,
    );
  }

  @Get(':courseId/progress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get course progress statistics' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course progress retrieved successfully',
    type: CourseProgressDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view progress',
  })
  async getCourseProgress(@Param('courseId') courseId: string, @CurrentUser() user: RequestUser) {
    return await this.enrollmentService.getCourseProgress(courseId, user.id);
  }

  // Student course view endpoints
  @Get(':courseId/student-view')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get complete course view for student with progress tracking',
    description: 'Students view their own progress. Admins can view course structure without enrollment.'
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course view retrieved successfully',
    type: CourseViewResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found or not enrolled' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view this course',
  })
  async getStudentCourseView(
    @Param('courseId') courseId: string,
    @CurrentUser() user: RequestUser,
  ) {
    // Admins can view course without enrollment check
    if (user.role === 'admin') {
      return await this.progressService.getAdminCourseView(courseId);
    }
    
    // Students view their own progress (requires enrollment)
    return await this.progressService.getStudentCourseProgress(user.id, courseId);
  }

  @Post(':courseId/lessons/:lessonId/progress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update lesson progress for student' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lesson progress updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Lesson not found or not enrolled' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to update progress',
  })
  async updateLessonProgress(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() progressDto: LessonProgressUpdateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.progressService.updateLessonProgress(
      user.id,
      lessonId,
      progressDto.completion_percentage,
      progressDto.is_completed,
    );
  }

  @Post(':courseId/lessons/:lessonId/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Mark lesson as completed and unlock next lesson',
    description:
      'Marks the current lesson as 100% complete, automatically updates course progress, and unlocks the next lesson in sequence.',
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson marked as completed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Lesson completed successfully' },
        lesson_id: { type: 'string', example: '9bc8e116-26a0-46a5-aadb-9fef8337aa74' },
        is_completed: { type: 'boolean', example: true },
        completion_percentage: { type: 'number', example: 100 },
        next_lesson_id: {
          type: 'string',
          example: '0842fb41-676b-41ea-8dcc-e79940370d3b',
          nullable: true,
        },
        next_lesson_unlocked: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Lesson not found or not enrolled' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Previous lesson must be completed first',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to complete this lesson',
  })
  async completeLesson(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.progressService.completeLesson(user.id, lessonId);
  }

  // Gradebook endpoints
  @Get(':courseId/gradebook')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get instructor gradebook for course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Gradebook retrieved successfully',
    type: InstructorGradebookDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view this gradebook',
  })
  async getInstructorGradebook(
    @Param('courseId') courseId: string,
    @Query() query: GradebookQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.gradebookService.getInstructorGradebook(courseId, user.id, query);
  }

  @Get(':courseId/gradebook/student/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get detailed grades for a specific student' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student grades retrieved successfully',
    type: StudentGradebookDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course or student not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to view this gradebook',
  })
  async getStudentDetailedGrades(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    // Verify instructor owns the course
    const course = await this.courseService.findOne(courseId);
    if (course.instructor_id !== user.id) {
      throw new ForbiddenException('You do not have permission to view this gradebook');
    }
    return await this.gradebookService.getStudentGradebook(courseId, studentId);
  }

  @Get(':courseId/grade-weights')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get course grade weights configuration' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grade weights retrieved successfully',
    type: CourseGradeWeightsDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  async getCourseGradeWeights(
    @Param('courseId') courseId: string,
    @CurrentUser() user: RequestUser,
  ) {
    // Verify instructor owns the course
    const course = await this.courseService.findOne(courseId);
    if (course.instructor_id !== user.id) {
      throw new ForbiddenException('You do not have permission to view grade weights');
    }
    return await this.gradebookService.getCourseGradeWeights(courseId);
  }

  @Patch(':courseId/grade-weights')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update course grade weights configuration' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grade weights updated successfully',
    type: CourseGradeWeightsDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid weights (must sum to 100)' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to update grade weights',
  })
  async updateCourseGradeWeights(
    @Param('courseId') courseId: string,
    @Body() weightsDto: UpdateCourseGradeWeightsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.gradebookService.updateCourseGradeWeights(courseId, weightsDto, user.id);
  }

  @Get(':courseId/my-gradebook')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my gradebook for a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Gradebook retrieved successfully',
    type: StudentGradebookDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found or not enrolled' })
  async getMyGradebook(@Param('courseId') courseId: string, @CurrentUser() user: RequestUser) {
    return await this.gradebookService.getStudentGradebook(courseId, user.id);
  }

  @Get(':courseId/my-grade-summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my grade summary for a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grade summary retrieved successfully',
    type: GradeSummaryDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found or not enrolled' })
  async getMyGradeSummary(@Param('courseId') courseId: string, @CurrentUser() user: RequestUser) {
    return await this.gradebookService.calculateStudentOverallGrade(courseId, user.id);
  }

  // Certificate Management Endpoints

  @Patch(':courseId/passing-grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Set or update passing grade for course certificate eligibility' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passing grade updated successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to update this course',
  })
  async setPassingGrade(
    @Param('courseId') courseId: string,
    @Body() setPassingGradeDto: SetPassingGradeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.courseService.setPassingGrade(courseId, user.id, setPassingGradeDto);
  }

  @Get(':courseId/certificates/eligible-students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all students eligible for course certificate' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Eligible students retrieved successfully',
    type: EligibleStudentsResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to view this course' })
  async getEligibleStudents(@Param('courseId') courseId: string, @CurrentUser() user: RequestUser) {
    return await this.certificateService.getAllEligibleStudents(courseId, user.id);
  }

  @Post(':courseId/certificates/issue/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Issue a course completion certificate to a student' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Certificate issued successfully',
    type: CertificateDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Student not eligible or certificate already exists',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  async issueCertificate(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.certificateService.issueCertificate(courseId, studentId, user.id);
  }

  @Post(':courseId/certificates/:studentId/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke a previously issued certificate' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certificate revoked successfully',
    type: CertificateDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Certificate already revoked or invalid request',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Certificate not found' })
  async revokeCertificate(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
    @Body() revokeCertificateDto: RevokeCertificateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.certificateService.revokeCertificate(
      courseId,
      studentId,
      user.id,
      revokeCertificateDto,
    );
  }

  @Get(':courseId/certificates/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get certificate for a specific student in a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certificate retrieved successfully',
    type: CertificateDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Certificate not found' })
  async getStudentCertificate(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return await this.certificateService.getStudentCertificate(
      courseId,
      studentId,
      user.id,
      user.role,
    );
  }

  @Get(':courseId/my-certificate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my certificate for a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certificate retrieved successfully',
    type: CertificateDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Certificate not found' })
  async getMyCertificate(@Param('courseId') courseId: string, @CurrentUser() user: RequestUser) {
    return await this.certificateService.getStudentCertificate(
      courseId,
      user.id,
      user.id,
      user.role,
    );
  }

  @Get('certificates/my-certificates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all my certificates across all courses' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All certificates retrieved successfully',
    type: [CertificateDto],
  })
  async getAllMyCertificates(@CurrentUser() user: RequestUser) {
    return await this.certificateService.getAllStudentCertificates(user.id);
  }

  @Post('certificates/pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate certificate PDF' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certificate PDF generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  async generatePdf(@Body() dto: GenerateCertificateDto, @Res() res: Response) {
    const { buffer, fileName } = await this.certificateService.generatePdf(dto);
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('content-disposition', `attachment; filename="${fileName}"`);
    res.setHeader('cache-control', 'no-store');
    return res.status(200).send(Buffer.from(buffer));
  }

  @Get('analytics/student-dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get student dashboard analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student dashboard analytics retrieved successfully',
    type: StudentDashboardAnalyticsDto,
  })
  async getStudentDashboardAnalytics(@CurrentUser() user: RequestUser) {
    return await this.studentAnalyticsService.getStudentDashboardAnalytics(user.id);
  }

  @Get('analytics/admin-dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get admin dashboard analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin dashboard analytics retrieved successfully',
    type: AdminDashboardAnalyticsDto,
  })
  async getAdminDashboardAnalytics() {
    return await this.adminAnalyticsService.getAdminDashboardAnalytics();
  }

  @Get('analytics/admin/system')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get system analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System analytics retrieved successfully',
    type: SystemAnalyticsDto,
  })
  async getSystemAnalytics() {
    return await this.adminAnalyticsService.getSystemAnalyticsOnly();
  }

  @Get('analytics/admin/student-performance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get student performance analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student performance analytics retrieved successfully',
    type: [StudentPerformanceDto],
  })
  async getStudentPerformanceAnalytics() {
    return await this.adminAnalyticsService.getStudentPerformanceOnly();
  }

  @Get('analytics/admin/instructor-performance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get instructor performance analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Instructor performance analytics retrieved successfully',
    type: [InstructorPerformanceDto],
  })
  async getInstructorPerformanceAnalytics() {
    return await this.adminAnalyticsService.getInstructorPerformanceOnly();
  }

  @Get('analytics/admin/course-progress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get course progress analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course progress analytics retrieved successfully',
    type: [AdminCourseProgressDto],
  })
  async getCourseProgressAnalytics() {
    return await this.adminAnalyticsService.getCourseProgressOnly();
  }
}
