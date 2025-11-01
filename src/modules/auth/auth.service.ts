import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserRole, UserProfile } from './interfaces/user.interface';
import {
  RequestOtpDto,
  VerifyOtpDto,
  ResetPasswordDto,
  VerifyOtpResponseDto,
} from './dto/password-reset.dto';
import { EmailService } from '../email/email.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    const { email, password, firstName, middleName, lastName, studentNumber, section, userType } =
      signupDto;

    // Check if user already exists in database
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User already registered');
    }

    const { data: authData, error: authError } = await this.supabaseService.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: userType,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
        },
      },
    });

    if (authError) {
      throw new BadRequestException(authError.message);
    }

    if (!authData.user) {
      throw new BadRequestException('Failed to create user');
    }

    // Create profile in profiles table using Prisma
    try {
      const isApproved = userType === UserRole.student; // Students are auto-approved, teachers need approval
      await this.prisma.user.create({
        data: {
          id: authData.user.id,
          email: authData.user.email || email,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          role: userType,
          student_number: studentNumber,
          section: section,
          is_approved: isApproved,
          approval_reason: isApproved ? 'Auto-approved for student registration' : null,
        },
      });
    } catch (error) {
      // If profile creation fails, clean up the auth user
      throw new BadRequestException(`Profile creation failed: ${error.message}`);
    }

    // For teachers, don't return tokens - they need approval
    if (userType === UserRole.teacher) {
      return {
        accessToken: '',
        refreshToken: '',
        user: {
          id: authData.user.id,
          email: authData.user.email || '',
          role: userType,
          firstName: firstName,
          middleName: middleName,
          lastName: lastName,
        },
        message: 'Registration successful. Please wait for admin approval before you can log in.',
        requiresApproval: true,
      };
    }

    return {
      accessToken: authData.session?.access_token || '',
      refreshToken: authData.session?.refresh_token || '',
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        role: userType,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Sign in with Supabase Auth
    const { data: authData, error: authError } =
      await this.supabaseService.client.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!authData.user || !authData.session) {
      throw new UnauthorizedException('Authentication failed');
    }

    const profile = await this.prisma.user.findUnique({
      where: { id: authData.user.id },
    });

    if (!profile) {
      throw new UnauthorizedException('User profile not found');
    }

    // Check if user is suspended
    if (profile.is_suspended) {
      throw new UnauthorizedException('Account is suspended. Please contact administrator.');
    }

    // Check if teacher is approved
    if (profile.role === UserRole.teacher && !profile.is_approved) {
      throw new UnauthorizedException('Account pending approval. Please wait for admin approval.');
    }

    return {
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        role: profile.role,
        firstName: profile.first_name,
        middleName: profile.middle_name || null,
        lastName: profile.last_name,
      },
    };
  }

  async getMe(userId: string): Promise<UserProfile> {
    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      throw new UnauthorizedException('User not found');
    }

    return profile;
  }

  async validateUser(token: string): Promise<{ id: string; email: string; role: UserRole }> {
    // Verify JWT token with Supabase
    const {
      data: { user },
      error,
    } = await this.supabaseService.client.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    // Fetch user profile to get role using Prisma
    const profile = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, first_name: true, last_name: true },
    });

    if (!profile) {
      throw new UnauthorizedException('User profile not found');
    }

    return {
      id: user.id,
      email: user.email || '',
      role: profile.role,
    };
  }

  async validateUserCredentials(email: string, password: string) {
    const { data: authData, error: authError } =
      await this.supabaseService.client.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      return null;
    }

    const profile = await this.prisma.user.findUnique({
      where: { id: authData.user.id },
    });

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      firstName: profile.first_name,
      middleName: profile.middle_name,
      lastName: profile.last_name,
      session: authData.session,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthResponseDto> {
    const { data, error } = await this.supabaseService.client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException('Failed to refresh token');
    }

    const profile = await this.prisma.user.findUnique({
      where: { id: data.user.id },
    });

    if (!profile) {
      throw new UnauthorizedException('User profile not found');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        role: profile.role,
        firstName: profile.first_name,
        middleName: profile.middle_name || null,
        lastName: profile.last_name,
      },
    };
  }

  async logout(userId: string): Promise<void> {
    // Sign out from Supabase
    await this.supabaseService.client.auth.signOut();
  }

  // Password Reset Methods

  async requestPasswordResetOtp(requestOtpDto: RequestOtpDto): Promise<{ message: string }> {
    const { email } = requestOtpDto;

    // Find user by email (don't reveal if email exists or not)
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always return the same message to prevent email enumeration
    const genericMessage =
      'If the email exists in our system, you will receive an OTP code shortly.';

    if (!user) {
      // Return success message even if user doesn't exist (security best practice)
      return { message: genericMessage };
    }

    // Check rate limiting - max 3 OTP requests per 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentOtps = await this.prisma.passwordResetOtp.count({
      where: {
        email: email,
        created_at: {
          gte: fifteenMinutesAgo,
        },
      },
    });

    if (recentOtps >= 3) {
      throw new BadRequestException('Too many OTP requests. Please try again later.');
    }

    // Invalidate all previous OTPs for this user
    await this.prisma.passwordResetOtp.updateMany({
      where: {
        user_id: user.id,
        is_used: false,
      },
      data: {
        is_used: true,
      },
    });

    // Generate 6-digit OTP code
    const otpCode = crypto.randomInt(100000, 999999).toString();

    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP to database
    await this.prisma.passwordResetOtp.create({
      data: {
        id: uuidv4(),
        user_id: user.id,
        email: email,
        otp_code: otpCode,
        expires_at: expiresAt,
        is_used: false,
      },
    });

    // Send OTP email
    await this.emailService.sendOtpEmail(email, otpCode, user.first_name);

    return { message: genericMessage };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    const { email, otp_code } = verifyOtpDto;

    // Find valid OTP (not expired, not used)
    const otpRecord = await this.prisma.passwordResetOtp.findFirst({
      where: {
        email: email,
        otp_code: otp_code,
        is_used: false,
        expires_at: {
          gt: new Date(), // Not expired
        },
      },
      include: {
        user: true,
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    // Mark OTP as used
    await this.prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: { is_used: true },
    });

    // Generate temporary reset token (valid for 15 minutes)
    const resetToken = this.generateResetToken(otpRecord.user_id);

    return {
      reset_token: resetToken,
      expires_in: 900, // 15 minutes in seconds
      message: 'OTP verified successfully. Use the reset token to change your password.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { reset_token, new_password } = resetPasswordDto;

    // Verify reset token
    let userId: string;
    try {
      userId = this.verifyResetToken(reset_token);
    } catch (error) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Get user details
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Update password in Supabase Auth
    const { error } = await this.supabaseService.client.auth.admin.updateUserById(userId, {
      password: new_password,
    });

    if (error) {
      throw new BadRequestException(`Failed to update password: ${error.message}`);
    }

    // Invalidate all OTPs for this user
    await this.prisma.passwordResetOtp.updateMany({
      where: {
        user_id: userId,
        is_used: false,
      },
      data: {
        is_used: true,
      },
    });

    // Send confirmation email
    await this.emailService.sendPasswordResetConfirmation(user.email, user.first_name);

    return { message: 'Password reset successful. You can now log in with your new password.' };
  }

  // Helper methods

  private generateResetToken(userId: string): string {
    // Create a simple JWT-like token (in production, use proper JWT library)
    const payload = {
      user_id: userId,
      timestamp: Date.now(),
      expires_at: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    return token;
  }

  private verifyResetToken(token: string): string {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));

      // Check if token is expired
      if (Date.now() > payload.expires_at) {
        throw new Error('Token expired');
      }

      return payload.user_id;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
