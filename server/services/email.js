const nodemailer = require('nodemailer');
const { logger } = require('../middleware/errorHandler');

let transporter = null;

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function getTransporter() {
  if (transporter) return transporter;

  if (!hasSmtpConfig()) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });

  return transporter;
}

function getPublicAppUrl() {
  return (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
}

function buildPasswordResetUrl(token) {
  return `${getPublicAppUrl()}/#/login?resetMode=true&token=${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail({ to, token, accountType = 'account' }) {
  const resetUrl = buildPasswordResetUrl(token);
  const from = process.env.EMAIL_FROM || 'Bravehearts Basketball Club <noreply@bravehearts.com>';
  const subject = 'Reset your Bravehearts password';
  const text = [
    'We received a request to reset your Bravehearts password.',
    '',
    `Open this secure link to choose a new password: ${resetUrl}`,
    '',
    'This link expires in 1 hour. If you did not request this, you can ignore this email.'
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Reset your Bravehearts password</h2>
      <p>We received a request to reset your ${accountType} password.</p>
      <p><a href="${resetUrl}" style="display: inline-block; background: #d42027; color: #fff; padding: 12px 18px; border-radius: 6px; text-decoration: none; font-weight: 700;">Reset Password</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    </div>
  `;

  const smtpTransporter = getTransporter();

  if (!smtpTransporter) {
    logger.warn(`SMTP is not configured. Password reset email for ${to} was not sent. Reset URL: ${resetUrl}`);
    return { sent: false, resetUrl };
  }

  await smtpTransporter.sendMail({ from, to, subject, text, html });
  return { sent: true };
}

module.exports = {
  sendPasswordResetEmail,
  buildPasswordResetUrl
};
