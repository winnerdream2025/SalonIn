import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private resend: Resend | null = null

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('RESEND_API_KEY')
    if (key && key !== 're_placeholder') {
      this.resend = new Resend(key)
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only')
    }
  }

  async sendPasswordReset(
    toEmail: string,
    resetUrl: string,
    userName: string,
  ): Promise<void> {
    const subject = 'Reset your My Salon In password'
    const html = this.buildResetEmail(resetUrl, userName)

    if (!this.resend) {
      this.logger.log(`[DEV] Password reset for ${toEmail}: ${resetUrl}`)
      return
    }

    try {
      await this.resend.emails.send({
        from: 'My Salon In <noreply@mysalonin.com>',
        to: toEmail,
        subject,
        html,
      })
      this.logger.log(`Password reset email sent to ${toEmail}`)
    } catch (err) {
      this.logger.error(`Failed to send email to ${toEmail}:`, err)
    }
  }

  private buildResetEmail(resetUrl: string, userName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F8F6F3;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border-radius:16px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08)">
          <tr>
            <td style="background:#D85A30;padding:32px;text-align:center">
              <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);
                          border-radius:14px;display:inline-flex;
                          align-items:center;justify-content:center;
                          font-size:28px;font-weight:900;color:#FFFFFF;
                          margin-bottom:12px">S</div>
              <div style="font-size:22px;font-weight:800;color:#FFFFFF;
                          letter-spacing:-0.5px">My Salon In</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;
                         color:#1A1A1A;letter-spacing:-0.3px">
                Reset your password
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6B6B6B;
                        line-height:22px">
                Hi ${userName}, we received a request to reset your
                My Salon In password. Click the button below to choose
                a new password.
              </p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#D85A30;
                        color:#FFFFFF;text-decoration:none;
                        padding:14px 32px;border-radius:22px;
                        font-size:15px;font-weight:700;
                        letter-spacing:-0.2px">
                Reset password
              </a>
              <p style="margin:24px 0 0;font-size:13px;color:#AAAAAA;
                        line-height:20px">
                This link expires in 1 hour. If you didn&apos;t request
                a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #F0EDE8">
              <p style="margin:0;font-size:12px;color:#AAAAAA;
                        text-align:center">
                My Salon In &middot; Beauty Workforce Marketplace<br>
                <a href="https://mysalonin.com/privacy"
                   style="color:#D85A30;text-decoration:none">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  }
}
