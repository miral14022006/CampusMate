const nodemailer = require('nodemailer');

function getMailer() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'noreply@campusmate.pdeu.ac.in';

  if (!host || !user || !pass) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return { transporter, from };
}

async function sendInviteEmail({ to, name, inviteUrl }) {
  const mailer = getMailer();
  if (!mailer) {
    // Skip silently if SMTP is not configured
    return false;
  }

  try {
    await mailer.transporter.sendMail({
      from: mailer.from,
      to,
      subject: 'You have been invited to CampusMate Admin Team',
      text: `Hello ${name},\n\nYou have been invited to join CampusMate as an administrator.\nPlease accept your invitation by visiting:\n${inviteUrl}\n\nThis link expires in 48 hours.`,
      html: `<p>Hello <strong>${name}</strong>,</p><p>You have been invited to join CampusMate as an administrator.</p><p><a href="${inviteUrl}">Click here to accept your invitation</a></p><p>Or copy this link: ${inviteUrl}</p><p>This link expires in 48 hours.</p>`
    });
    return true;
  } catch (err) {
    console.error('Failed to send invite email:', err.message);
    return false;
  }
}

module.exports = {
  sendInviteEmail
};
