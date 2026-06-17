const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || process.env.GMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.GMAIL_PASS
  }
});

const getSenderEmail = () =>
  process.env.FROM_EMAIL || process.env.SMTP_USER || process.env.GMAIL_USER || 'no-reply@rideshare.com';

const isSmtpConfigured = () => {
  const activeUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  return activeUser && activeUser !== 'example@gmail.com';
};

const emailLayout = (title, bodyHtml) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h2 style="color: #3f51b5; text-align: center;">${title}</h2>
    ${bodyHtml}
    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
    <p style="font-size: 12px; color: #999; text-align: center;">Ride Share &copy; 2026</p>
  </div>
`;

const otpBlock = (otp) => `
  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
    <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #333;">${otp}</span>
  </div>
  <p style="color: #666; font-size: 14px;">This code is valid for 10 minutes. If you did not make this request, please ignore this email.</p>
`;

const sendMail = async ({ to, subject, html, logLabel }) => {
  const mailOptions = {
    from: `"Ride Share" <${getSenderEmail()}>`,
    to,
    subject,
    html
  };

  try {
    if (!isSmtpConfigured()) {
      console.warn('SMTP credentials not configured. Email logged to console:');
      console.log(`[MOCK EMAIL to ${to}] ${logLabel}`);
      return { success: true, mock: true };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Email error (${logLabel}) to ${to}:`, error.message);
    console.log(`[EMAIL FALLBACK to ${to}] ${logLabel}`);
    return { success: false, mock: true, error: error.message };
  }
};

/**
 * Signup: verify account email address
 */
const sendAccountVerificationEmail = async (to, otp, name) => {
  const html = emailLayout(
    'Verify Your Email',
    `
      <p>Hello ${name || 'there'},</p>
      <p>Thanks for signing up for Ride Share. Enter the code below to verify your email and activate your account.</p>
      ${otpBlock(otp)}
    `
  );
  return sendMail({
    to,
    subject: 'Verify your Ride Share account',
    html,
    logLabel: `Account verification code: ${otp}`
  });
};

/**
 * After successful email verification
 */
const sendSignupConfirmationEmail = async (to, name) => {
  const html = emailLayout(
    'Welcome to Ride Share',
    `
      <p>Hello ${name || 'there'},</p>
      <p>Your email has been verified and your account is ready.</p>
      <p>You can now sign in, link your university or corporate domain for trusted carpools, and start finding or offering rides.</p>
      <p style="color: #666; font-size: 14px;">If you did not create this account, contact support immediately.</p>
    `
  );
  return sendMail({
    to,
    subject: 'Welcome to Ride Share — account confirmed',
    html,
    logLabel: `Signup confirmation for ${name}`
  });
};

/**
 * Forgot password reset code
 */
const sendPasswordResetEmail = async (to, otp, name) => {
  const html = emailLayout(
    'Reset Your Password',
    `
      <p>Hello ${name || 'there'},</p>
      <p>We received a request to reset your Ride Share password. Use the code below to set a new password.</p>
      ${otpBlock(otp)}
    `
  );
  return sendMail({
    to,
    subject: 'Ride Share password reset code',
    html,
    logLabel: `Password reset code: ${otp}`
  });
};

/**
 * Community / domain trust verification (existing flow)
 */
const sendVerificationEmail = async (to, otp, orgName) => {
  const html = emailLayout(
    'Verify Your Affiliation',
    `
      <p>Hello,</p>
      <p>Thank you for linking your official email to join the <strong>${orgName}</strong> community on Ride Share.</p>
      ${otpBlock(otp)}
    `
  );
  return sendMail({
    to,
    subject: `Verify your domain — ${orgName}`,
    html,
    logLabel: `Domain verification code: ${otp} for ${orgName}`
  });
};

/**
 * Admin decision on user identity / driver documents
 */
const sendVerificationDecisionEmail = async (to, name, decision, reason) => {
  const approved = decision === 'APPROVED';
  const resubmit = decision === 'RESUBMIT';
  const title = approved
    ? 'Verification approved'
    : resubmit
      ? 'Documents need resubmission'
      : 'Verification not approved';
  const html = emailLayout(
    title,
    `
      <p>Hello ${name || 'there'},</p>
      <p>Your Ride Share verification review is complete.</p>
      <p><strong>Decision:</strong> ${decision}</p>
      ${reason ? `<p><strong>Message from our team:</strong></p><p style="background:#f5f5f5;padding:12px;border-radius:6px;">${reason}</p>` : ''}
      <p style="color:#666;font-size:14px;">This status is reflected on your profile. Sign in to view details or upload new documents if requested.</p>
    `
  );
  return sendMail({
    to,
    subject: `Ride Share verification — ${decision}`,
    html,
    logLabel: `Verification ${decision} for ${name}`
  });
};

module.exports = {
  sendAccountVerificationEmail,
  sendSignupConfirmationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendVerificationDecisionEmail
};
