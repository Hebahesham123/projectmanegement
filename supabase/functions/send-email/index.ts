// Supabase Edge Function: send-email
// Sends a single email via Outlook (or any) SMTP.
// Deploy via Supabase Dashboard → Edge Functions → Create function → paste this.
// Set the environment variables listed in the README block below in the
// function's Secrets tab BEFORE testing.
//
//   SMTP_HOST      smtp.office365.com
//   SMTP_PORT      587
//   SMTP_USER      alerts@nstextile-eg.com
//   SMTP_PASSWORD  <password or app password>
//   SMTP_FROM      Project Tracker <alerts@nstextile-eg.com>
//   FUNCTION_SECRET  <any long random string — must match _app_config.email_fn_secret>

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

Deno.serve(async (req) => {
  // Minimal bearer auth so random strangers can't call this endpoint
  const expected = Deno.env.get('FUNCTION_SECRET') ?? '';
  const auth = req.headers.get('Authorization') ?? '';
  if (!expected || auth !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: { to?: string; subject?: string; html?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const { to, subject, html } = payload;
  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get('SMTP_HOST') ?? 'smtp.office365.com',
      port: Number(Deno.env.get('SMTP_PORT') ?? '587'),
      tls: false,            // false + STARTTLS (port 587). Set true only for implicit TLS (port 465).
      auth: {
        username: Deno.env.get('SMTP_USER') ?? '',
        password: Deno.env.get('SMTP_PASSWORD') ?? '',
      },
    },
  });

  try {
    await client.send({
      from: Deno.env.get('SMTP_FROM') ?? (Deno.env.get('SMTP_USER') ?? ''),
      to,
      subject,
      content: 'auto',
      html,
    });
    await client.close();
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    try { await client.close(); } catch {}
    console.error('SMTP send failed:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
