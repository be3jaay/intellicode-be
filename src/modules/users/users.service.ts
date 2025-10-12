import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserProfile, UserRole } from '../auth/interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async getAllUsers(): Promise<UserProfile[]> {
    const profiles = await this.prisma.user.findMany({
      orderBy: { created_at: 'desc' },
    });

    return profiles;
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
  ): Promise<UserProfile> {
    // Students can only update their own profile
    if (requestingUserRole === UserRole.student && userId !== requestingUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const updateData: any = {};

    if (updateProfileDto.fullName !== undefined) {
      updateData.full_name = updateProfileDto.fullName;
    }
    if (updateProfileDto.studentNumber !== undefined) {
      updateData.student_number = updateProfileDto.studentNumber;
    }
    if (updateProfileDto.section !== undefined) {
      updateData.section = updateProfileDto.section;
    }
    if (updateProfileDto.profilePicture !== undefined) {
      updateData.profile_picture = updateProfileDto.profilePicture;
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

  async updateUserRole(
    userId: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<UserProfile> {
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
}

