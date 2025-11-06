interface WelcomeEmailProps {
  firstName: string | null
}

export const getWelcomeEmailTemplate = (props: WelcomeEmailProps): string => {
  const { firstName } = props
  const userName = firstName || 'there'

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fc; padding: 20px 0; text-align: center;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
        <div style="background-color: #FF6A1A; padding: 40px 20px;">
        <h1 style="color: #333333; font-size: 28px; font-weight: bold; margin-bottom: 15px;">QuoteKite</h1>
        </div>

        <div style="padding: 30px 40px;">
          <h1 style="color: #333333; font-size: 28px; font-weight: bold; margin-bottom: 15px;">Welcome, ${userName}!</h1>
          <p style="color: #666666; font-size: 16px; line-height: 1.6;">We're thrilled to have you on board. Get ready to generate quotes faster than ever before with QuoteKite.</p>
          
          <p style="color: #444444; font-size: 18px; font-weight: bold; margin-top: 30px; margin-bottom: 15px;">What's next?</p>
          <ul style="list-style-type: none; padding: 0; text-align: left; max-width: 400px; margin: 0 auto;">
            <li style="margin-bottom: 15px; background-color: #fff8e1; padding: 12px; border-left: 4px solid #FFC107; border-radius: 4px;">
              <span style="font-weight: bold; color: #333;">Generate your first quote:</span> Let our GPT-4o assistant handle the details for you.
            </li>
            <li style="margin-bottom: 15px; background-color: #e3f2fd; padding: 12px; border-left: 4px solid #2196F3; border-radius: 4px;">
              <span style="font-weight: bold; color: #333;">Try a voice note quote:</span> Just speak, and we'll write your quote for you.
            </li>
            <li style="margin-bottom: 15px; background-color: #e8f5e9; padding: 12px; border-left: 4px solid #4CAF50; border-radius: 4px;">
              <span style="font-weight: bold; color: #333;">Manage everything:</span> Your dashboard is ready for you to explore and organize your quotes.
            </li>
          </ul>

          <p style="margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard" style="background-color: #FF6A1A; color: white; padding: 16px 30px; text-align: center; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">Go to Your Dashboard</a>
          </p>

          <p style="color: #666666; font-size: 16px; margin-top: 20px;">Happy Quoting!</p>
        </div>

        <div style="background-color: #f0f3f6; padding: 20px 40px; border-top: 1px solid #e0e4e8;">
          <p style="font-size: 12px; color: #777777;">&copy; 2025 QuoteKite. All rights reserved.</p>
        </div>

      </div>
    </div>
  `
}