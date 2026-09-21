const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'Wise Gourmet <onboarding@resend.dev>';
const BRAND_ORANGE = '#fa6d01';
const BRAND_ORANGE_DARK = '#c25601';

// Shared shell so every transactional email looks like it came from the same
// place — a plain, email-client-safe table layout (no flexbox/grid, inline
// styles only) rather than the app's own CSS, which most mail clients strip.
// The logo needs an absolute URL (email clients can't resolve relative
// paths) — built from FRONTEND_URL so it's correct in both dev and prod.
const wrapEmail = (title, bodyHtml) => {
  const logoUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo.png`;
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#fdf7f1;font-family:Georgia,'Times New Roman',serif;color:#1a1613;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf7f1;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border-top:4px solid ${BRAND_ORANGE};">
          <tr>
            <td align="center" style="padding:24px 28px 12px 28px;">
              <img src="${logoUrl}" alt="Wise Gourmet" width="72" height="72" style="display:block;border-radius:50%;" />
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px 28px;">
              <h1 style="margin:0 0 16px 0;font-size:19px;color:${BRAND_ORANGE_DARK};text-align:center;">${title}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #ece4d8;">
              <span style="font-size:12px;color:#6b6259;">Wise Gourmet &mdash; Ekpoma. This is an automated message, please do not reply directly to this email.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const button = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr>
      <td style="background:${BRAND_ORANGE};border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:12px 28px;color:#fff;text-decoration:none;font-weight:bold;font-family:Arial,sans-serif;font-size:15px;">${label}</a>
      </td>
    </tr>
  </table>`;

// Never throws — a failed email should never take down the request that
// triggered it (a payment succeeding, a password-reset request); log and
// move on. Silently no-ops if RESEND_API_KEY isn't configured (local dev).
const sendEmail = async ({ to, subject, html }) => {
  if (!resend) {
    console.warn('Resend not configured (RESEND_API_KEY missing) — skipping email:', subject);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (error) {
    console.error('Failed to send email:', subject, error.message);
  }
};

module.exports = { sendEmail, wrapEmail, button, BRAND_ORANGE, BRAND_ORANGE_DARK };
