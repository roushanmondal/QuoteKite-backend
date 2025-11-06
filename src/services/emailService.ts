import nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

const mailPort = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 465;

const transporter = nodemailer.createTransport({
host: process.env.MAIL_HOST,
port: Number(process.env.MAIL_PORT) || 465,
secure: process.env.MAIL_PORT === '465', // true for 465, false for other ports
from: `QuoteKite <${process.env.MAIL_USERNAME}>`,
auth: {
user: process.env.MAIL_USERNAME,
pass: process.env.MAIL_PASSWORD,
},
})
 
export const sendEmail = async (options: MailOptions) => {
try {
const mailOptions = {
from: `QuoteKite <${process.env.MAIL_USERNAME}>`, to: options.to,
subject: options.subject,
html: options.html,
}
 
await transporter.sendMail(mailOptions)
console.log(`Email sent successfully to ${options.to}`)
} catch (error) {
console.error(`Error sending email to ${options.to}:`, error)
throw new Error('Failed to send email.')
}
}