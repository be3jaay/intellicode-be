import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '../auth/interfaces/user.interface';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.admin, UserRole.teacher)
  @ApiOperation({ summary: 'Get all users (Admin & Teacher only)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getAllUsers() {
    return this.usersService.getAllUsers();
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

  @Get(':id')
  @Roles(UserRole.admin, UserRole.teacher, UserRole.student)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User profile data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Put(':id')
  @Roles(UserRole.admin, UserRole.teacher, UserRole.student)
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Students can only update their own profile. Teachers and admins can update any profile.',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.updateProfile(id, updateProfileDto, user.id, user.role);
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
}

