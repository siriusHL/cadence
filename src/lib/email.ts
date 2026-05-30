import { Resend } from 'resend';

// Transactional email wrapper. Lazy-initialised like supabaseAdmin() so the
// build doesn't require keys. Email here is a best-effort *notification* layer
// on top of the in-app inbox (the source of truth): if it isn't configured or
// the send fails, we log and move on rather than failing the user's request.

let cached: Resend | null = null;

function client(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

interface SendArgs {
  to: string;
  subject: string;
  text: string;
}

/**
 * Best-effort send. Returns true when the email was handed off to Resend,
 * false when the transport isn't configured or the send threw. Callers that
 * need to tell the user whether delivery happened (e.g. the "Send to
 * accountant" action) can branch on the result.
 */
async function send({ to, subject, text }: SendArgs): Promise<boolean> {
  const resend = client();
  const from = process.env.EMAIL_FROM;
  if (!resend || !from) {
    console.warn('[email] skipped — RESEND_API_KEY or EMAIL_FROM not set');
    return false;
  }
  try {
    await resend.emails.send({ from, to, subject, text });
    return true;
  } catch (err) {
    console.error('[email] send failed:', err);
    return false;
  }
}

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return base.replace(/\/$/, '') + path;
}

/** A user posted a message — notify the support inbox. */
export async function notifySupportOfMessage(args: {
  fromEmail: string;
  threadId: string;
  subject: string;
  body: string;
}): Promise<void> {
  const supportInbox = process.env.SUPPORT_EMAIL;
  if (!supportInbox) {
    console.warn('[email] skipped support notification — SUPPORT_EMAIL not set');
    return;
  }
  await send({
    to: supportInbox,
    subject: `[Cadence support] ${args.subject}`,
    text:
      `New message from ${args.fromEmail}\n\n` +
      `${args.body}\n\n` +
      `— Reply via the admin endpoint for thread ${args.threadId}.`,
  });
}

/** Support replied — notify the user that there's a new message in their inbox. */
export async function notifyUserOfReply(args: {
  toEmail: string;
  subject: string;
  body: string;
}): Promise<void> {
  await send({
    to: args.toEmail,
    subject: `Re: ${args.subject}`,
    text:
      `Support replied to your message:\n\n` +
      `${args.body}\n\n` +
      `View the full conversation: ${appUrl('/app/messages')}`,
  });
}

/**
 * The user pressed "Send to accountant" on the Tax page. The subject/body have
 * already been previewed and (optionally) edited by the user, so we send them
 * through verbatim. Replies go back to the user, not our transactional inbox.
 */
export async function sendTaxSummaryToAccountant(args: {
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  return send({
    to: args.to,
    subject: args.subject,
    text: args.body,
  });
}
