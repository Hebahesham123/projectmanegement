import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Body = { to: string | string[]; subject: string; html?: string; text?: string };

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured. Set SMTP_HOST / SMTP_USER / SMTP_PASS in .env.local');
  }
  const secure = (process.env.SMTP_SECURE ?? 'true') === 'true';
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    pool: true,
    maxConnections: 3,
    connectionTimeout: 20000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: { servername: host, minVersion: 'TLSv1.2' },
    logger: true,
    debug: true,
  });
  return transporter;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body?.to || !body?.subject || !(body?.html || body?.text)) {
    return NextResponse.json({ error: 'missing to / subject / body' }, { status: 400 });
  }

  const mail = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: Array.isArray(body.to) ? body.to.join(',') : body.to,
    subject: body.subject,
    html: body.html,
    text: body.text,
  };

  const send = async () => getTransporter().sendMail(mail);
  const isTransient = (e: unknown) => {
    const m = e instanceof Error ? e.message : '';
    return /greeting never received|socket close|timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED/i.test(m);
  };

  const logAttempt = async (row: {
    status: 'sent' | 'failed';
    message_id?: string | null;
    response?: string | null;
    accepted?: string[] | null;
    rejected?: string[] | null;
    error?: string | null;
  }) => {
    try {
      await supabase.from('email_log').insert({
        sent_by: user.id,
        to_addr: mail.to,
        subject: mail.subject,
        html: mail.html ?? null,
        text: mail.text ?? null,
        ...row,
      });
    } catch (e) {
      console.warn('[email/send] log insert failed:', e instanceof Error ? e.message : e);
    }
  };

  try {
    let info;
    try {
      info = await send();
    } catch (e) {
      if (!isTransient(e)) throw e;
      console.warn('[email/send] transient failure, retrying:', e instanceof Error ? e.message : e);
      transporter = null;
      info = await send();
    }
    console.log('[email/send] accepted:', info.accepted, 'rejected:', info.rejected, 'response:', info.response);
    await logAttempt({
      status: 'sent',
      message_id: info.messageId ?? null,
      response: info.response ?? null,
      accepted: (info.accepted as string[]) ?? null,
      rejected: (info.rejected as string[]) ?? null,
    });
    return NextResponse.json({
      ok: true,
      id: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'send failed';
    console.error('[email/send]', msg);
    await logAttempt({ status: 'failed', error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
