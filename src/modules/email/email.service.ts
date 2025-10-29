import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    // Check if SMTP is configured
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      this.logger.warn(
        '⚠️  SMTP not configured. Emails will be logged to console only. ' +
        'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env to enable email sending.'
      );
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(`❌ SMTP connection failed: ${error.message}`);
      } else {
        this.logger.log('✅ SMTP connection established successfully');
      }
    });
  }

  async sendOtpEmail(email: string, otpCode: string, firstName: string): Promise<boolean> {
    try {
      const htmlContent = this.generateOtpEmailTemplate(otpCode, firstName);
      const fromEmail = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');

      // For development or when SMTP is not configured
      if (!this.transporter) {
        this.logger.warn(`📧 [DEV MODE] OTP Email would be sent to: ${email}`);
        this.logger.warn(`🔑 [DEV MODE] OTP Code: ${otpCode}`);
        this.logger.debug(`📝 [DEV MODE] Email content:\n${htmlContent.substring(0, 200)}...`);
        return true;
      }

      // Send actual email
      await this.transporter.sendMail({
        from: `"Intellicode" <${fromEmail}>`,
        to: email,
        subject: '🔐 Your Password Reset OTP Code',
        html: htmlContent,
      });

      this.logger.log(`✅ OTP email sent successfully to ${email}`);
      
      // Also log OTP in development for easy testing
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`🔑 [DEV] OTP Code for ${email}: ${otpCode}`);
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error sending OTP email to ${email}: ${error.message}`);
      
      // Fallback: log to console in development
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(`⚠️  [FALLBACK] OTP Code for ${email}: ${otpCode}`);
      }
      
      return false;
    }
  }

  async sendPasswordResetConfirmation(email: string, firstName: string): Promise<boolean> {
    try {
      const htmlContent = this.generatePasswordResetConfirmationTemplate(firstName);
      const fromEmail = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');

      // For development or when SMTP is not configured
      if (!this.transporter) {
        this.logger.warn(`📧 [DEV MODE] Confirmation email would be sent to: ${email}`);
        return true;
      }

      await this.transporter.sendMail({
        from: `"Intellicode" <${fromEmail}>`,
        to: email,
        subject: '✅ Password Reset Successful',
        html: htmlContent,
      });

      this.logger.log(`✅ Password reset confirmation sent to ${email}`);
      
      return true;
    } catch (error) {
      this.logger.error(`❌ Error sending confirmation email: ${error.message}`);
      return false;
    }
  }

  async sendInstructorApprovalEmail(
    email: string,
    firstName: string,
    isApproved: boolean,
    reason?: string,
  ): Promise<boolean> {
    try {
      const htmlContent = this.generateInstructorApprovalTemplate(firstName, isApproved, reason);
      const fromEmail = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');
      const subject = isApproved ? '🎉 Your Instructor Account Has Been Approved!' : '⚠️ Instructor Account Update';

      if (!this.transporter) {
        this.logger.warn(`📧 [DEV MODE] Instructor ${isApproved ? 'approval' : 'rejection'} email would be sent to: ${email}`);
        this.logger.debug(`Status: ${isApproved ? 'APPROVED' : 'REJECTED'}${reason ? `, Reason: ${reason}` : ''}`);
        return true;
      }

      await this.transporter.sendMail({
        from: `"Intellicode" <${fromEmail}>`,
        to: email,
        subject: subject,
        html: htmlContent,
      });

      this.logger.log(`✅ Instructor ${isApproved ? 'approval' : 'rejection'} email sent to ${email}`);
      
      return true;
    } catch (error) {
      this.logger.error(`❌ Error sending instructor approval email: ${error.message}`);
      return false;
    }
  }

  private generateOtpEmailTemplate(otpCode: string, firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #4f46e5;
            margin: 0;
          }
          .otp-box {
            background-color: #4f46e5;
            color: white;
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            letter-spacing: 8px;
            margin: 30px 0;
          }
          .info-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
          }
          .security-notice {
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Intellicode</h1>
            <p>Password Reset Request</p>
          </div>
          
          <p>Hello ${firstName},</p>
          
          <p>We received a request to reset your password. Use the OTP code below to proceed:</p>
          
          <div class="otp-box">
            ${otpCode}
          </div>
          
          <div class="info-box">
            <strong>⏰ Important:</strong> This OTP code will expire in <strong>10 minutes</strong>.
          </div>
          
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          
          <div class="security-notice">
            <strong>🛡️ Security Notice:</strong> Never share this code with anyone. Intellicode will never ask you for your OTP code.
          </div>
          
          <div class="footer">
            <p>© 2024 Intellicode Learning Platform. All rights reserved.</p>
            <p>Need help? Contact us at support@intellicode.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePasswordResetConfirmationTemplate(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Password Reset Successful</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .success-icon {
            text-align: center;
            font-size: 48px;
            margin-bottom: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h2>Password Reset Successful</h2>
          <p>Hello ${firstName},</p>
          <p>Your password has been successfully reset. You can now log in with your new password.</p>
          <p>If you did not make this change, please contact our support team immediately.</p>
          <div class="footer">
            <p>© 2024 Intellicode Learning Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateInstructorApprovalTemplate(firstName: string, isApproved: boolean, reason?: string): string {
    if (isApproved) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Instructor Account Approved</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #4f46e5;
              margin: 0;
            }
            .success-icon {
              text-align: center;
              font-size: 64px;
              margin-bottom: 20px;
            }
            .success-box {
              background-color: #d1fae5;
              border-left: 4px solid #10b981;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .cta-button {
              display: inline-block;
              background-color: #4f46e5;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
              font-weight: bold;
            }
            .next-steps {
              background-color: #fff;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .next-steps h3 {
              color: #4f46e5;
              margin-top: 0;
            }
            .next-steps ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .next-steps li {
              margin: 8px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Intellicode</h1>
              <p>Learning Platform</p>
            </div>
            
            <div class="success-icon">🎉</div>
            
            <div class="success-box">
              <h2 style="margin-top: 0; color: #065f46;">Congratulations, ${firstName}!</h2>
              <p style="margin-bottom: 0;"><strong>Your instructor account has been approved!</strong></p>
            </div>
            
            <p>We're excited to welcome you to the Intellicode teaching community. You can now start creating and publishing courses on our platform.</p>
            
            <div class="next-steps">
              <h3>🚀 Next Steps:</h3>
              <ul>
                <li><strong>Create Your First Course:</strong> Start building engaging course content</li>
                <li><strong>Set Up Your Profile:</strong> Add your profile picture</li>
                <li><strong>Explore Dashboard:</strong> Familiarize yourself with course management tools</li>
                <li><strong>Review Guidelines:</strong> Check our instructor best practices</li>
              </ul>
            </div>
            
            <p>If you have any questions or need assistance getting started, our support team is here to help!</p>
            
            <div class="footer">
              <p><strong>Welcome aboard! 🚀</strong></p>
              <p>© 2025 Intellicode Learning Platform. All rights reserved.</p>
              <p>Need help? Contact us at support@intellicode.com</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Instructor Account Update</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #4f46e5;
              margin: 0;
            }
            .warning-box {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .reason-box {
              background-color: #fff;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Intellicode</h1>
              <p>Learning Platform</p>
            </div>
            
            <div class="warning-box">
              <h2 style="margin-top: 0; color: #854d0e;">Account Update</h2>
              <p style="margin-bottom: 0;">Hello ${firstName},</p>
            </div>
            
            <p>Thank you for your interest in becoming an instructor on Intellicode.</p>
            
            <p>After careful review, we are unable to approve your instructor application at this time.</p>
            
            ${reason ? `
            <div class="reason-box">
              <h3 style="margin-top: 0; color: #6b7280;">Reason:</h3>
              <p style="margin-bottom: 0;">${reason}</p>
            </div>
            ` : ''}
            
            <p>We encourage you to:</p>
            <ul>
              <li>Review our instructor requirements and guidelines</li>
              <li>Continue learning and building your expertise</li>
              <li>Consider reapplying in the future</li>
            </ul>
            
            <p>If you have any questions or would like more information, please don't hesitate to contact our support team.</p>
            
            <div class="footer">
              <p>© 2024 Intellicode Learning Platform. All rights reserved.</p>
              <p>Need help? Contact us at support@intellicode.com</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }
  }
}

