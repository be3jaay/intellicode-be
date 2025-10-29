import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { EmailService } from '@/modules/email/email.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ApproveInstructorDto } from './dto/approve-instructor.dto';
import { UserManagementQueryDto } from './dto/user-management-query.dto';
import { UserProfile, UserRole } from '../auth/interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
  ) {}

  async getAllUsers(
    query: UserManagementQueryDto,
  ): Promise<{ users: UserProfile[]; total: number; page: number; limit: number }> {
    const { role, search, isSuspended, page = 1, limit = 10 } = query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (isSuspended !== undefined) {
      where.is_suspended = isSuspended;
    }

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { student_number: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async getUserById(userId: string): Promise<UserProfile> {
    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    requestingUserId: string,
    requestingUserRole: UserRole,
    profilePicture?: Express.Multer.File,
  ): Promise<UserProfile> {
    // Students can only update their own profile
    if (requestingUserRole === UserRole.student && userId !== requestingUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Get current user profile to check for existing profile picture
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};

    // Update name fields
    if (updateProfileDto.firstName !== undefined) {
      updateData.first_name = updateProfileDto.firstName;
    }
    if (updateProfileDto.middleName !== undefined) {
      updateData.middle_name = updateProfileDto.middleName;
    }
    if (updateProfileDto.lastName !== undefined) {
      updateData.last_name = updateProfileDto.lastName;
    }
    if (updateProfileDto.studentNumber !== undefined) {
      updateData.student_number = updateProfileDto.studentNumber;
    }
    if (updateProfileDto.section !== undefined) {
      updateData.section = updateProfileDto.section;
    }

    // Handle profile picture upload
    if (profilePicture) {
      try {
        // Delete old profile picture if exists
        if (currentUser.profile_picture) {
          await this.supabaseService.deleteProfilePicture(currentUser.profile_picture);
        }

        // Upload new profile picture
        const profilePictureUrl = await this.supabaseService.uploadProfilePicture(
          profilePicture,
          userId,
        );
        updateData.profile_picture = profilePictureUrl;
      } catch (error) {
        throw new Error(`Failed to upload profile picture: ${error.message}`);
      }
    }

    try {
      const profile = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      return profile;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  async updateUserRole(userId: string, updateRoleDto: UpdateRoleDto): Promise<UserProfile> {
    // Update role in profiles table using Prisma
    try {
      const profile = await this.prisma.user.update({
        where: { id: userId },
        data: { role: updateRoleDto.role },
      });

      // Also update user metadata in Supabase Auth
      const { error: authError } = await this.supabaseService.client.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            role: updateRoleDto.role,
          },
        },
      );

      if (authError) {
        // Log the error but don't fail the request since profile was updated
        console.error('Failed to update auth metadata:', authError.message);
      }

      return profile;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw new Error(`Failed to update user role: ${error.message}`);
    }
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    try {
      // Delete from profiles table using Prisma
      await this.prisma.user.delete({
        where: { id: userId },
      });

      // Also delete from Supabase Auth
      const { error: authError } = await this.supabaseService.client.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Failed to delete auth user:', authError.message);
      }

      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    const profiles = await this.prisma.user.findMany({
      where: { role },
      orderBy: { created_at: 'desc' },
    });

    return profiles;
  }

  async suspendUser(userId: string, suspendUserDto: SuspendUserDto): Promise<UserProfile> {
    const { isSuspended, reason } = suspendUserDto;

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          is_suspended: isSuspended,
          suspension_reason: reason || null,
        },
      });

      return user;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw new Error(`Failed to update user suspension status: ${error.message}`);
    }
  }

  async approveInstructor(
    userId: string,
    approveInstructorDto: ApproveInstructorDto,
  ): Promise<UserProfile> {
    const { isApproved, reason } = approveInstructorDto;

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          is_approved: isApproved,
          approval_reason: reason || null,
        },
      });

      // Send email notification to the instructor
      await this.emailService.sendInstructorApprovalEmail(
        user.email,
        user.first_name,
        isApproved,
        reason,
      );

      return user;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw new Error(`Failed to update instructor approval status: ${error.message}`);
    }
  }

  async getPendingApprovals(): Promise<UserProfile[]> {
    const profiles = await this.prisma.user.findMany({
      where: {
        role: UserRole.teacher,
        is_approved: false,
      },
      orderBy: { created_at: 'desc' },
    });

    return profiles;
  }

  async getSuspendedUsers(): Promise<UserProfile[]> {
    const profiles = await this.prisma.user.findMany({
      where: {
        is_suspended: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return profiles;
  }
}
