import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserRole, UserProfile } from './interfaces/user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    const { email, password, firstName, middleName, lastName, studentNumber, section } = signupDto;

    // Check if user already exists in database
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new BadRequestException('User already registered');
    }

    const { data: authData, error: authError } = await this.supabaseService.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: UserRole.student,
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
      await this.prisma.user.create({
        data: {
          id: authData.user.id,
          email: authData.user.email || email,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          role: UserRole.student,
          student_number: studentNumber,
          section: section,
        },
      });
    } catch (error) {
      // If profile creation fails, clean up the auth user
      throw new BadRequestException(`Profile creation failed: ${error.message}`);
    }

    return {
      accessToken: authData.session?.access_token || '',
      refreshToken: authData.session?.refresh_token || '',
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        role: UserRole.student,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await this.supabaseService.client.auth.signInWithPassword({
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
    const { data: { user }, error } = await this.supabaseService.client.auth.getUser(token);

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
}

