import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequestUser } from './interfaces/user.interface';
import { Public } from '@/common/decorators/public.decorator';
import { RequestOtpDto, VerifyOtpDto, ResetPasswordDto, VerifyOtpResponseDto } from './dto/password-reset.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed or user already exists',
  })
  async signup(@Body() signupDto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(signupDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('login/local')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login using Passport Local Strategy' })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated using local strategy',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials',
  })
  async loginLocal(@Request() req) {
    // req.user is populated by LocalStrategy
    return {
      accessToken: req.user.session.access_token,
      refreshToken: req.user.session.refresh_token,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        firstName: req.user.firstName,
        middleName: req.user.middleName,
        lastName: req.user.lastName,
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getMe(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.id);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid refresh token',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async logout(@CurrentUser() user: RequestUser) {
    await this.authService.logout(user.id);
    return { message: 'Logged out successfully' };
  }

  // Password Reset Endpoints

  @Public()
  @Post('forgot-password/request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Request OTP for password reset',
    description: 'Send a 6-digit OTP code to the user\'s email if it exists in the system. Returns the same message regardless of email existence for security.'
  })
  @ApiResponse({
    status: 200,
    description: 'OTP request processed (check email if it exists)',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string',
          example: 'If the email exists in our system, you will receive an OTP code shortly.'
        }
      }
    }
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded (max 3 requests per 15 minutes)',
  })
  async requestOtp(@Body() requestOtpDto: RequestOtpDto) {
    return this.authService.requestPasswordResetOtp(requestOtpDto);
  }

  @Public()
  @Post('forgot-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verify OTP code',
    description: 'Verify the 6-digit OTP code and receive a temporary reset token valid for 15 minutes.'
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully - use reset token to change password',
    type: VerifyOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired OTP code',
  })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Public()
  @Post('forgot-password/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Reset password with reset token',
    description: 'Use the reset token from OTP verification to set a new password. Password must meet complexity requirements.'
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string',
          example: 'Password reset successful. You can now log in with your new password.'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token, or password validation failed',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
