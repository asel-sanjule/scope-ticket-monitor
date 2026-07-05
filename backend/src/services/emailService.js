import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLinkEmail(email, verifyUrl) {
  await resend.emails.send({
    from: process.env.NOTIFICATIONS_FROM_EMAIL || 'Scope Ticket Monitor <onboarding@resend.dev>',
    to: email,
    subject: 'Your sign-in link',
    html: `
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
    `,
  });
}
