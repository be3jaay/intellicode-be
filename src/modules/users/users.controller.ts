import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ApproveInstructorDto } from './dto/approve-instructor.dto';
import { UserManagementQueryDto } from './dto/user-management-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '../auth/interfaces/user.interface';
import { UuidValidator } from '@/common/utils/uuid.validator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.admin, UserRole.teacher)
  @ApiOperation({ summary: 'Get all users with filtering and pagination (Admin & Teacher only)' })
  @ApiResponse({ status: 200, description: 'List of users with pagination' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getAllUsers(@Query() query: UserManagementQueryDto) {
    return this.usersService.getAllUsers(query);
  }

  @Get('by-role')
  @Roles(UserRole.admin, UserRole.teacher)
  @ApiOperation({ summary: 'Get users by role (Admin & Teacher only)' })
  @ApiQuery({
    name: 'role',
    enum: UserRole,
    description: 'Filter users by role',
  })
  @ApiResponse({ status: 200, description: 'List of users with specified role' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getUsersByRole(@Query('role') role: UserRole) {
    return this.usersService.getUsersByRole(role);
  }

  @Get('pending-approval')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Get pending instructor approvals (Admin only)',
    description: 'Get list of instructors waiting for approval',
  })
  @ApiResponse({ status: 200, description: 'List of pending instructor approvals' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async getPendingApprovals() {
    return this.usersService.getPendingApprovals();
  }

  @Get('suspended')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Get suspended users (Admin only)',
    description: 'Get list of all suspended users',
  })
  @ApiResponse({ status: 200, description: 'List of suspended users' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async getSuspendedUsers() {
    return this.usersService.getSuspendedUsers();
  }

  @Get('me')
  @Roles(UserRole.admin, UserRole.teacher, UserRole.student)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: RequestUser) {
    return this.usersService.getUserById(user.id);
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.teacher, UserRole.student)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User profile data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    UuidValidator.validate(id, 'User ID');
    return this.usersService.getUserById(id);
  }

  @Put(':id')
  @Roles(UserRole.admin, UserRole.teacher, UserRole.student)
  @UseInterceptors(FileInterceptor('profilePicture'))
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Students can only update their own profile. Teachers and admins can update any profile. Supports profile picture upload.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'John' },
        middleName: { type: 'string', example: 'Michael' },
        lastName: { type: 'string', example: 'Doe' },
        studentNumber: { type: 'string', example: '2021-00001' },
        section: { type: 'string', example: 'BSCS 3A' },
        profilePicture: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture image file (JPEG, PNG, WebP)',
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() profilePicture: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.updateProfile(id, updateProfileDto, user.id, user.role, profilePicture);
  }

  @Put(':id/role')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Update user role (Admin only)',
    description: 'Only admins can change user roles (student, teacher, admin)',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.usersService.updateUserRole(id, updateRoleDto);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Delete user (Admin only)',
    description: 'Permanently delete a user account',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Put(':id/suspend')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Suspend/Unsuspend user (Admin only)',
    description: 'Suspend or unsuspend a user account',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User suspension status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspendUser(@Param('id') id: string, @Body() suspendUserDto: SuspendUserDto) {
    return this.usersService.suspendUser(id, suspendUserDto);
  }

  @Put(':id/approve')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Approve/Reject instructor (Admin only)',
    description: 'Approve or reject an instructor account',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Instructor approval status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async approveInstructor(@Param('id') id: string, @Body() approveInstructorDto: ApproveInstructorDto) {
    return this.usersService.approveInstructor(id, approveInstructorDto);
  }
}

