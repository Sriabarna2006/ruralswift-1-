'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.smtp.user || !env.smtp.pass || !env.smtp.from) {
    throw new Error('Email OTP is not configured. Set SMTP_USER, SMTP_PASS, and SMTP_FROM.');
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
  await getTransporter().sendMail({
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

module.exports = { sendRegistrationOtp };
