interface PasswordResetEmailProps {
  token: string;
}

export const getPasswordResetEmailTemplate = (props: PasswordResetEmailProps): { subject: string; html: string } => {
  const { token } = props;
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

  const subject = 'Your QuoteKite Password Reset Request';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fc; padding: 20px 0; text-align: center;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
        <div style="background-color: #FF6A1A; padding: 30px 20px;">
          <h1 style="color: #FFFFFF; font-size: 28px; font-weight: bold; margin: 0;">QuoteKite</h1>
        </div>

        <div style="padding: 30px 40px;">
          <h1 style="color: #333333; font-size: 28px; font-weight: bold; margin-bottom: 15px;">Reset Your Password</h1>
          <p style="color: #666666; font-size: 16px; line-height: 1.6;">A password reset was requested for your account. If this was you, please click the button below to set a new password.</p>
          
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #FF6A1A; color: white; padding: 16px 30px; text-align: center; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold; font-size: 16px;">Reset Your Password</a>
          </p>
          
          <p style="color: #999999; font-size: 14px; margin-top: 20px;">This link will expire in 10 minutes for your security.</p>
        </div>

        <div style="background-color: #f0f3f6; padding: 20px 40px; border-top: 1px solid #e0e4e8;">
          <p style="font-size: 12px; color: #777777; line-height: 1.5; margin-bottom: 10px;">If you did not request a password reset, you can safely ignore this email. Your password will not be changed.</p>
          <p style="font-size: 12px; color: #777777; line-height: 1.5; word-break: break-all;">Having trouble? Copy and paste this link into your browser:<br><a href="${resetUrl}" style="color: #FF6A1A; text-decoration: none;">${resetUrl}</a></p>
        </div>
      </div>
      
      <div style="margin-top: 20px; font-size: 12px; color: #a0a0a0;">
        &copy; 2025 QuoteKite. All rights reserved.
      </div>
    </div>
  `;

  return { subject, html };
};