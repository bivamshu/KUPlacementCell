import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.OTP_EMAIL_ENABLED) {
    return null;
  }

  if (!env.SMTP_HOST || !env.SMTP_FROM) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS
            }
          : undefined
    });
  }

  return transporter;
}

export async function sendStudentOtpEmail(email: string, otp: string): Promise<void> {
  const mailer = getTransporter();

  if (!mailer) {
    if (env.NODE_ENV === 'production') {
      throw new Error('OTP email delivery is enabled but SMTP is not configured');
    }

    console.log(`Student OTP for ${email}: ${otp}`);
    return;
  }

  await mailer.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: 'KUPC — verify your student account',
    text: `Your KUPC verification code is ${otp}. It expires in ${env.OTP_EXPIRES_IN}.`,
    html: `<p>Your KUPC verification code is <strong>${otp}</strong>.</p><p>It expires in ${env.OTP_EXPIRES_IN}.</p>`
  });
}
