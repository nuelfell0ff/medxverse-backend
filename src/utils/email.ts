import { env } from '../config/env.js';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email delivery is intentionally dependency-free. When Resend is configured,
 * invitations are delivered through its HTTPS API. In development without an
 * email provider, the caller receives the generated URL so local development
 * is still possible without silently pretending that an email was sent.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean }> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    console.warn(`[Email] Provider not configured. Email for ${input.to} was not sent.`);
    return { sent: false };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Email provider rejected the message (${response.status}): ${body}`);
  }

  return { sent: true };
}
