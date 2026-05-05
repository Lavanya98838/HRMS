import nodemailer from "nodemailer";

// ── Gmail Transporter ────────────────────────────────────────
const createGmailTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const transporter = createGmailTransporter();

// ── Verify connection on startup ─────────────────────────────
export const verifyMailer = async () => {
  try {
    await transporter.verify();
    console.log("📧 Mailer: Gmail SMTP connected successfully");
  } catch (error) {
    console.warn("⚠️  Mailer: Gmail SMTP connection failed:", error.message);
    console.warn("   OTPs will be logged to console as fallback");
  }
};

// ─────────────────────────────────────────────────────────────
//  EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────

const otpEmailTemplate = (name, otp, expiryMinutes) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a4a; }
    .header { background: linear-gradient(135deg, #6c63ff, #f093fb); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px; }
    .body { padding: 36px 32px; }
    .greeting { color: #c9d1d9; font-size: 16px; margin-bottom: 20px; }
    .message { color: #8b949e; font-size: 14px; line-height: 1.7; margin-bottom: 28px; }
    .otp-box { background: #0d1117; border: 2px solid #6c63ff; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0; }
    .otp-label { color: #8b949e; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }
    .otp-code { font-size: 48px; font-weight: 800; letter-spacing: 12px; color: #6c63ff; font-family: 'Courier New', monospace; }
    .expiry { color: #f093fb; font-size: 13px; margin-top: 12px; }
    .warning { background: #1c1c2e; border-left: 3px solid #f093fb; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-top: 24px; }
    .warning p { color: #8b949e; font-size: 13px; margin: 0; line-height: 1.6; }
    .footer { background: #111120; padding: 20px 32px; text-align: center; border-top: 1px solid #2a2a4a; }
    .footer p { color: #484f58; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 HRMS Portal</h1>
      <p>Enterprise Human Resource Management System</p>
    </div>
    <div class="body">
      <p class="greeting">Hello, <strong style="color:#c9d1d9">${name}</strong> 👋</p>
      <p class="message">
        We received a request to reset your HRMS password. Use the OTP below to verify your identity and proceed with the password reset.
      </p>
      <div class="otp-box">
        <div class="otp-label">Your One-Time Password</div>
        <div class="otp-code">${otp}</div>
        <div class="expiry">⏱ Expires in ${expiryMinutes} minutes</div>
      </div>
      <div class="warning">
        <p>⚠️ <strong style="color:#c9d1d9">Security Notice:</strong> If you didn't request this, please ignore this email and your password will remain unchanged. Never share this OTP with anyone.</p>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} HRMS Portal — This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

const welcomeEmailTemplate = (name, role) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a4a; }
    .header { background: linear-gradient(135deg, #6c63ff, #f093fb); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
    .body { padding: 36px 32px; }
    .greeting { color: #c9d1d9; font-size: 18px; margin-bottom: 16px; }
    .message { color: #8b949e; font-size: 14px; line-height: 1.7; }
    .role-badge { display: inline-block; background: linear-gradient(135deg, #6c63ff, #f093fb); color: #fff; padding: 6px 18px; border-radius: 20px; font-size: 13px; font-weight: 600; margin: 16px 0; text-transform: uppercase; letter-spacing: 1px; }
    .footer { background: #111120; padding: 20px 32px; text-align: center; border-top: 1px solid #2a2a4a; }
    .footer p { color: #484f58; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to HRMS!</h1>
    </div>
    <div class="body">
      <p class="greeting">Welcome aboard, <strong>${name}</strong>!</p>
      <p class="message">Your HRMS account has been successfully created. You now have access to the portal with the following role:</p>
      <div class="role-badge">${role}</div>
      <p class="message">You can now log in to the HRMS portal and get started. If you have any issues, please contact your system administrator.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} HRMS Portal — Automated message, do not reply.</p>
    </div>
  </div>
</body>
</html>
`;


const inviteEmailTemplate = (name, setupUrl, inviterName, role, expiryHours) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a4a; }
    .header { background: linear-gradient(135deg, #6c63ff, #f093fb); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px; }
    .body { padding: 36px 32px; }
    .greeting { color: #c9d1d9; font-size: 16px; margin-bottom: 20px; }
    .message { color: #8b949e; font-size: 14px; line-height: 1.7; margin-bottom: 20px; }
    .role-badge { display: inline-block; background: linear-gradient(135deg, #6c63ff, #f093fb); color: #fff; padding: 5px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
    .btn-box { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6c63ff, #f093fb); color: #fff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
    .url-box { background: #0d1117; border: 1px solid #2a2a4a; border-radius: 8px; padding: 12px 16px; margin: 16px 0; word-break: break-all; }
    .url-box p { color: #484f58; font-size: 11px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 1px; }
    .url-box a { color: #6c63ff; font-size: 12px; }
    .expiry { color: #f093fb; font-size: 13px; text-align: center; margin-top: 8px; }
    .warning { background: #1c1c2e; border-left: 3px solid #f093fb; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-top: 24px; }
    .warning p { color: #8b949e; font-size: 13px; margin: 0; line-height: 1.6; }
    .footer { background: #111120; padding: 20px 32px; text-align: center; border-top: 1px solid #2a2a4a; }
    .footer p { color: #484f58; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You're Invited!</h1>
      <p>Enterprise Human Resource Management System</p>
    </div>
    <div class="body">
      <p class="greeting">Hello, <strong style="color:#c9d1d9">${name}</strong> 👋</p>
      <p class="message">
        <strong style="color:#c9d1d9">${inviterName}</strong> has added you to the HRMS Portal. Click the button below to set up your account and get started.
      </p>
      <div>
        <span class="role-badge">${role}</span>
      </div>
      <div class="btn-box">
        <a href="${setupUrl}" class="btn">Set Up My Account →</a>
      </div>
      <p class="expiry">⏱ This link expires in ${expiryHours} hours</p>
      <div class="url-box">
        <p>Or copy this link:</p>
        <a href="${setupUrl}">${setupUrl}</a>
      </div>
      <div class="warning">
        <p>⚠️ <strong style="color:#c9d1d9">Security Notice:</strong> This invite link is unique to you. Do not share it with anyone. If you did not expect this email, please contact your HR department.</p>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} HRMS Portal — This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────
//  SEND FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Send OTP email for password reset
 */
export const sendOTPEmail = async (to, name, otp) => {
  const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 10;

  // Always log to console as backup
  console.log("\n" + "=".repeat(50));
  console.log(`📧 OTP EMAIL`);
  console.log(`   To:   ${to}`);
  console.log(`   Name: ${name}`);
  console.log(`   OTP:  ${otp}`);
  console.log("=".repeat(50) + "\n");

  try {
    const info = await transporter.sendMail({
      from: `"HRMS Portal 🔐" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your HRMS Password Reset OTP",
      html: otpEmailTemplate(name, otp, expiryMinutes),
    });
    console.log(`✅ OTP email sent to ${to} (messageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ OTP email failed for ${to}:`, error.message);
    // Don't throw — OTP is still logged to console as fallback
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email on successful registration
 */
export const sendWelcomeEmail = async (to, name, role) => {
  try {
    const info = await transporter.sendMail({
      from: `"HRMS Portal 🎉" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Welcome to HRMS Portal, ${name}!`,
      html: welcomeEmailTemplate(name, role),
    });
    console.log(`📧 Welcome email sent to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.warn(`⚠️  Welcome email failed for ${to}:`, error.message);
    return { success: false };
  }
};

/**
 * Send account setup invite email
 */
export const sendInviteEmail = async (to, name, setupUrl, inviterName, role) => {
  const expiryHours = 48;

  console.log("\n" + "=".repeat(50));
  console.log(`📧 INVITE EMAIL`);
  console.log(`   To:   ${to}`);
  console.log(`   Name: ${name}`);
  console.log(`   URL:  ${setupUrl}`);
  console.log("=".repeat(50) + "\n");

  try {
    const info = await transporter.sendMail({
      from: `"HRMS Portal 🎉" <${process.env.EMAIL_USER}>`,
      to,
      subject: `You're invited to HRMS Portal — Set up your account`,
      html: inviteEmailTemplate(name, setupUrl, inviterName, role, expiryHours),
    });
    console.log(`✅ Invite email sent to ${to} (messageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Invite email failed for ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};