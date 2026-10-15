import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    const host =
      this.config.get<string>('SMTP_HOST') || 'smtp.office365.com';
    const port =
      Number(this.config.get<string>('SMTP_PORT')) || 587;
    const user = this.config.get<string>('SMTP_USER');

    this.logger.log(
      `Initialising SMTP transporter host=${host} port=${port} user=${user}`,
    );

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // Office 365 uses STARTTLS on 587
      auth: {
        user,
        pass: this.config.get<string>('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: true,
      },
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    const from =
      this.config.get<string>('SMTP_FROM') ||
      this.config.get<string>('SMTP_USER');
    this.logger.log(`from ${from}`);
    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #0f172a;">
        <h2 style="font-size: 18px; margin-bottom: 8px;">Reset your AIRCO AIMS password</h2>
        <p style="margin-bottom: 12px;">
          We received a request to reset the password for your AIRCO AIMS account.
        </p>
        <p style="margin-bottom: 12px;">
          Click the button below to choose a new password:
        </p>
        <p style="margin: 16px 0;">
          <a href="${resetUrl}"
             style="display:inline-block;padding:10px 18px;border-radius:9999px;background:#0b2948;color:#ffffff;text-decoration:none;font-weight:600;">
            Reset password
          </a>
        </p>
        <p style="margin-bottom: 12px;">
          Or copy and paste this link into your browser:
          <br />
          <a href="${resetUrl}" style="color:#0ea5e9;">${resetUrl}</a>
        </p>
        <p style="margin-top: 16px; font-size: 12px; color:#64748b;">
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'AIRCO AIMS – Password reset',
        html,
      });

      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err) {
      this.logger.error('Failed to send password reset email', err as any);
      // Do not rethrow; forgot-password endpoint should still respond generically
    }
  }
}
