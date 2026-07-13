import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Gmail's API wants a full RFC 2822 message, base64url-encoded (not
// standard base64 — '+' and '/' replaced, no padding).
function buildRawMessage({ to, from, subject, html }) {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ].join('\r\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendMagicLinkEmail(email, verifyUrl) {
  const from = process.env.GMAIL_SENDER_EMAIL;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Sign in to Scope Ticket Monitor</h2>
      <p>Click the button below to sign in. This link expires in 15 minutes and can only be used once.</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}"
           style="background:#4338ca;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
          Sign in
        </a>
      </p>
      <p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  const raw = buildRawMessage({ to: email, from, subject: 'Your sign-in link', html });

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });
}
