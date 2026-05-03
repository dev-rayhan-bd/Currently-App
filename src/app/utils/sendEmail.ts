// utils/sendEmail.ts
import nodemailer, { SendMailOptions, SentMessageInfo } from 'nodemailer';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import config from '../config';

// Updated MailOptions interface with html support
interface MailOptions {
  from?: string;
  to: string;
  subject: string;
  text?: string;   // Made optional
  html?: string;   // Added html support
}

const sendEmail = async ({ from, to, subject, text, html }: MailOptions): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });

    const mailOptions: SendMailOptions = {
      from,
      to,
      subject,
      text,
      html,  // Added html
    };

    const info: SentMessageInfo = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error: any) {
    console.error('Error sending mail: ', error);
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to send email');
  }
};

export default sendEmail;