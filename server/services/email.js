const nodemailer = require('nodemailer');
const { logger } = require('../middleware/errorHandler');

let transporter = null;

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASSWORD || process.env.SMTP_PASS));
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
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS
    }
  });

  return transporter;
}

function getPublicAppUrl() {
  return (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
}

function buildPasswordResetUrl(token) {
  return `${getPublicAppUrl()}/?resetMode=true&token=${encodeURIComponent(token)}#/login`;
}

function buildEmailVerificationUrl(token) {
  return `${getPublicAppUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml({ title, intro, buttonText, buttonUrl, sections = [], footer = '' }) {
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const sectionHtml = sections.map(section => `
    <tr>
      <td style="padding: 12px 0; border-top: 1px solid #e5e7eb;">
        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #00843d; font-weight: 800;">${escapeHtml(section.label)}</div>
        <div style="font-size: 16px; color: #111827; font-weight: 700; margin-top: 3px;">${escapeHtml(section.value)}</div>
      </td>
    </tr>
  `).join('');
  const buttonHtml = buttonText && buttonUrl ? `
    <p style="margin: 28px 0;">
      <a href="${escapeHtml(buttonUrl)}" style="display: inline-block; background: #d42027; color: #ffffff; padding: 13px 20px; border-radius: 999px; text-decoration: none; font-weight: 800;">${escapeHtml(buttonText)}</a>
    </p>
  ` : '';
  const linkHtml = buttonUrl ? `
    <p style="font-size: 13px; color: #6b7280; margin-top: 16px;">If the button does not work, copy and paste this link into your browser:</p>
    <p style="font-size: 13px; word-break: break-all;"><a href="${escapeHtml(buttonUrl)}" style="color: #d42027;">${escapeHtml(buttonUrl)}</a></p>
  ` : '';

  return `
    <div style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 18px 50px rgba(17,24,39,.12);">
              <tr>
                <td style="background:linear-gradient(135deg,#00843d,#001f14);padding:28px;color:#ffffff;text-align:center;">
                  <div style="font-size:13px;text-transform:uppercase;letter-spacing:.16em;font-weight:900;color:#facc15;">Bravehearts Basketball Club</div>
                  <h1 style="margin:10px 0 0;font-size:28px;line-height:1.15;">${safeTitle}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;">
                  <p style="font-size:16px;line-height:1.7;margin:0;color:#374151;">${safeIntro}</p>
                  ${buttonHtml}
                  ${sectionHtml ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;">${sectionHtml}</table>` : ''}
                  ${linkHtml}
                  ${footer ? `<p style="font-size:14px;line-height:1.6;color:#6b7280;margin-top:22px;">${escapeHtml(footer)}</p>` : ''}
                </td>
              </tr>
              <tr>
                <td style="background:#111827;color:#d1d5db;padding:18px 28px;text-align:center;font-size:12px;line-height:1.5;">
                  Changing lives through basketball. Lilongwe, Malawi.<br>
                  This is an automated message from Bravehearts Basketball Club.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function htmlToText(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function sendEmail({ to, subject, text, html }) {
  const from = process.env.EMAIL_FROM || `Bravehearts Basketball Club <${process.env.SMTP_USER || 'noreply@bravehearts.com'}>`;
  const smtpTransporter = getTransporter();

  if (!smtpTransporter) {
    logger.warn(`SMTP is not configured. Email to ${to} with subject "${subject}" was not sent.`);
    return { sent: false };
  }

  await smtpTransporter.sendMail({ from, to, subject, text: text || htmlToText(html), html });
  return { sent: true };
}

async function verifyEmailTransport() {
  const smtpTransporter = getTransporter();
  if (!smtpTransporter) return { configured: false, verified: false };
  await smtpTransporter.verify();
  return { configured: true, verified: true };
}

async function sendPasswordResetEmail({ to, token, accountType = 'account' }) {
  const resetUrl = buildPasswordResetUrl(token);
  const subject = 'Reset your Bravehearts password';
  const html = buildEmailHtml({
    title: 'Reset your password',
    intro: `We received a request to reset your Bravehearts ${accountType} password. Use the secure button below to choose a new password.`,
    buttonText: 'Reset Password',
    buttonUrl: resetUrl,
    footer: 'This link expires in 1 hour. If you did not request this, you can ignore this email.'
  });

  const result = await sendEmail({ to, subject, html });
  return { ...result, resetUrl: result.sent ? undefined : resetUrl };
}

async function sendEmailVerificationEmail({ to, name, token }) {
  const verifyUrl = buildEmailVerificationUrl(token);
  const result = await sendEmail({
    to,
    subject: 'Verify your Bravehearts account',
    html: buildEmailHtml({
      title: 'Verify your email',
      intro: `Hi ${name || 'there'}, please verify your Gmail address to activate your Bravehearts account.`,
      buttonText: 'Verify Email',
      buttonUrl: verifyUrl,
      footer: 'This verification link expires in 24 hours. If you did not create a Bravehearts account, you can ignore this email.'
    })
  });
  return { ...result, verifyUrl: result.sent ? undefined : verifyUrl };
}

async function sendWelcomeEmail({ to, name }) {
  return sendEmail({

    to,
    subject: 'Welcome to Bravehearts Basketball Club',
    html: buildEmailHtml({
      title: `Welcome, ${name || 'Bravehearts member'}!`,
      intro: 'Your Bravehearts account has been created successfully. You can now follow club updates, manage your account, vote in polls, receive notifications, and support the team through Fan Zone.',
      buttonText: 'Open My Account',
      buttonUrl: `${getPublicAppUrl()}/#/login`,
      footer: 'Thank you for joining the Bravehearts family.'
    })
  });
}

async function sendOrderCreatedEmail({ to, name, reference, totalMwk, paymentMethod }) {
  return sendEmail({
    to,
    subject: `Bravehearts order ${reference} created`,
    html: buildEmailHtml({
      title: 'Order created',
      intro: `Hi ${name || 'there'}, your order has been created. Please complete the mobile money payment and confirm it in your cart.`,
      buttonText: 'Open Fan Zone',
      buttonUrl: `${getPublicAppUrl()}/#/fanzone`,
      sections: [
        { label: 'Reference', value: reference },
        { label: 'Total', value: `MWK ${Number(totalMwk || 0).toLocaleString()}` },
        { label: 'Payment method', value: paymentMethod || 'Mobile money' }
      ],
      footer: 'Keep your payment reference safe for order follow-up.'
    })
  });
}

async function sendPaymentConfirmedEmail({ to, name, reference, totalMwk }) {
  return sendEmail({
    to,
    subject: `Payment confirmed for ${reference}`,
    html: buildEmailHtml({
      title: 'Payment confirmed',
      intro: `Hi ${name || 'there'}, your Bravehearts payment has been confirmed. Thank you for supporting the club.`,
      buttonText: 'View My Account',
      buttonUrl: `${getPublicAppUrl()}/#/login`,
      sections: [
        { label: 'Reference', value: reference },
        { label: 'Amount', value: `MWK ${Number(totalMwk || 0).toLocaleString()}` }
      ]
    })
  });
}

module.exports = {
  sendEmail,
  verifyEmailTransport,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendWelcomeEmail,
  sendOrderCreatedEmail,
  sendPaymentConfirmedEmail,
  buildPasswordResetUrl,
  buildEmailVerificationUrl
};
