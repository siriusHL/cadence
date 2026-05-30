import { z } from 'zod';
import { withAuth, json } from '@/lib/auth';
import { sendTaxSummaryToAccountant } from '@/lib/email';

// The user previews (and may edit) the email before sending, so we accept the
// recipient, subject and body from the client and validate them here. Replies
// go back to the signed-in user, not our transactional inbox.
const Body = z.object({
  to:      z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(200),
  body:    z.string().trim().min(1).max(20_000),
});

export const POST = withAuth({}, async ({ req }) => {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'invalid_body', detail: parsed.error.format() }, 400);

  const sent = await sendTaxSummaryToAccountant({
    to:      parsed.data.to.toLowerCase(),
    subject: parsed.data.subject,
    body:    parsed.data.body,
  });

  if (!sent) return json({ error: 'email_unavailable' }, 502);
  return json({ ok: true });
});
