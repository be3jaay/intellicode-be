import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpStatus, HttpCode, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CourseService } from './course.service';
import { 
  CreateCourseDto, 
  CreateCourseWithFileDto,
  CreateCourseResponseDto, 
  CourseQueryDto, 
  PaginatedCoursesResponseDto
} from './dto/create-course.dto';
import { UpdateCourseDto, UpdateCourseResponseDto } from './dto/update-course.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/user.interface';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { LessonService } from './lesson.service';
import { AdminService } from './admin.service';
import { 
  EnrollCourseDto, 
  EnrollmentResponseDto, 
  StudentEnrollmentsQueryDto,
  PaginatedEnrollmentsResponseDto 
} from './dto/enrollment.dto';
import { 
  CreateLessonDto, 
  BulkCreateLessonsDto, 
  LessonResponseDto 
} from './dto/lesson.dto';
import { 
  ApproveCourseDto, 
  PendingCoursesQueryDto 
} from './dto/admin.dto';

@Controller('course')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly enrollmentService: EnrollmentService,
    private readonly lessonService: LessonService,
    private readonly adminService: AdminService
  ) {}

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)  
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Course created successfully', type: CreateCourseResponseDto })
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
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Course created successfully with uploaded thumbnail', type: CreateCourseResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data or file upload failed' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Teacher role required' })
  @UseInterceptors(FileInterceptor('thumbnail'))
  @Post('with-thumbnail')
  async createWithThumbnail(
    @Body() createCourseDto: CreateCourseWithFileDto, 
    @UploadedFile() thumbnailFile: Express.Multer.File,
    @CurrentUser() user: RequestUser
  ) {
    return await this.courseService.createCourse(createCourseDto, user.id, thumbnailFile);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses with pagination' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Courses retrieved successfully', type: PaginatedCoursesResponseDto })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to take' })
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
  @ApiResponse({ status: HttpStatus.OK, description: 'Courses retrieved successfully', type: PaginatedCoursesResponseDto })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to take' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by title' })
  async findAllByInstructor(@Query() query: CourseQueryDto, @CurrentUser() user: RequestUser) {
    return await this.courseService.findAllByInstructor(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course retrieved successfully', type: CreateCourseResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  async findOne(@Param('id') id: string) {
    return await this.courseService.findOne(id);
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course updated successfully', type: UpdateCourseResponseDto })
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
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Successfully enrolled in course', type: EnrollmentResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found or not approved' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Already enrolled or invalid invite code' })
  async enrollInCourse(@Body() enrollDto: EnrollCourseDto, @CurrentUser() user: RequestUser) {
    return await this.enrollmentService.enrollInCourse(enrollDto, user.id);
  }

  @Get('my-enrollments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my course enrollments' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Enrollments retrieved successfully', type: PaginatedEnrollmentsResponseDto })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to take' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by enrollment status' })
  async getMyEnrollments(@Query() query: StudentEnrollmentsQueryDto, @CurrentUser() user: RequestUser) {
    return await this.enrollmentService.getStudentEnrollments(query, user.id);
  }

  @Get('enrolled/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get enrolled course details with lessons' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course details retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found or not enrolled' })
  async getEnrolledCourseDetails(@Param('courseId') courseId: string, @CurrentUser() user: RequestUser) {
    return await this.enrollmentService.getEnrolledCourseDetails(courseId, user.id);
  }

  // Lesson management endpoints (for instructors)
  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Post(':courseId/lessons')
  @ApiOperation({ summary: 'Create a lesson in a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Lesson created successfully', type: LessonResponseDto })
  async createLesson(
    @Param('courseId') courseId: string,
    @Body() createLessonDto: CreateLessonDto,
    @CurrentUser() user: RequestUser
  ) {
    return await this.lessonService.createLesson(createLessonDto, courseId, user.id);
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Post(':courseId/lessons/bulk')
  @ApiOperation({ summary: 'Bulk create lessons in a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Lessons created successfully', type: [LessonResponseDto] })
  async bulkCreateLessons(
    @Param('courseId') courseId: string,
    @Body() bulkCreateDto: BulkCreateLessonsDto,
    @CurrentUser() user: RequestUser
  ) {
    return await this.lessonService.bulkCreateLessons({ ...bulkCreateDto, course_id: courseId }, user.id);
  }

  @Roles('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Get(':courseId/lessons')
  @ApiOperation({ summary: 'Get all lessons for a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lessons retrieved successfully' })
  async getCourseLessons(@Param('courseId') courseId: string, @CurrentUser() user: RequestUser) {
    return await this.lessonService.getCourseLessons(courseId, user.id);
  }

  // Admin endpoints
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('admin/pending')
  @ApiOperation({ summary: 'Get pending courses for approval' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Pending courses retrieved successfully' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to take' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by course status' })
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
    @CurrentUser() user: RequestUser
  ) {
    return await this.adminService.approveCourse(courseId, approveDto, user.id);
  }
}
