'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('./logger');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.smtp.user || !env.smtp.pass || !env.smtp.from) {
    return null; // Fallback to mock
  }

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });

  return transporter;
}

async function sendRegistrationOtp(to, otp) {
  const t = getTransporter();
  if (!t) {
    logger.info(`[MAILER MOCK] Registration OTP for ${to} is: ${otp}`);
    return;
  }

  await t.sendMail({
    from: env.smtp.from,
    to,
    subject: 'RuralSwift email verification OTP',
    text: `Your RuralSwift verification OTP is ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>RuralSwift Email Verification</h2>
        <p>Your OTP is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
        <p>This OTP will expire in 10 minutes.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(to, resetLink) {
  const t = getTransporter();
  if (!t) {
    logger.info(`[MAILER MOCK] Password reset link for ${to} is: ${resetLink}`);
    return;
  }

  await t.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Reset your RuralSwift password',
    text: `You requested a password reset. Open this link to set a new password: ${resetLink}\n\nThis link expires in ${env.passwordReset.ttlMinutes} minutes. If you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; line-height: 1.6; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #000029, #10B981); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🔒 Reset Your Password</h1>
        </div>
        <div style="background: #f8fafc; padding: 32px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <p>Hi there,</p>
          <p>We received a request to reset your <strong>RuralSwift</strong> account password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetLink}"
               style="background: #000069; color: #fff; padding: 14px 32px; border-radius: 8px;
                      text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            This link expires in <strong>${env.passwordReset.ttlMinutes} minutes</strong>.
            If you did not request this, you can safely ignore this email — your password will not change.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">
            If the button above doesn't work, copy and paste this URL into your browser:<br/>
            <a href="${resetLink}" style="color: #000069; word-break: break-all;">${resetLink}</a>
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendRegistrationOtp, sendPasswordResetEmail };
