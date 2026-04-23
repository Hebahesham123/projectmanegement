import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/lib/types';

type Kind = Notification['kind'];

export type NotifyArgs = {
  userId: string;
  kind: Kind;
  title: string;
  body?: string;
  link?: string;
  email?: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  };
};

export async function notify(args: NotifyArgs): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('notifications').insert({
    user_id: args.userId,
    kind: args.kind,
    title: args.title,
    body: args.body ?? null,
    link: args.link ?? null,
    read: false,
  });
  if (error) console.warn('[notify] insert failed:', error.message);

  if (args.email?.to) {
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args.email),
      });
      if (!res.ok) {
        const { error: e } = await res.json().catch(() => ({ error: res.statusText }));
        console.warn('[notify] email failed:', e);
      }
    } catch (e) {
      console.warn('[notify] email error:', e);
    }
  }
}

export type EmailFact = { label: string; value: string };
export type EmailAccent = 'brand' | 'amber' | 'rose' | 'emerald';

const ACCENTS: Record<EmailAccent, { bar: string; pill: string; pillText: string }> = {
  brand:   { bar: '#6b3e26', pill: '#f3e7d9', pillText: '#553020' },
  amber:   { bar: '#d97706', pill: '#fef3c7', pillText: '#92400e' },
  rose:    { bar: '#e11d48', pill: '#ffe4e6', pillText: '#9f1239' },
  emerald: { bar: '#059669', pill: '#d1fae5', pillText: '#065f46' },
};

export type EmailTemplateArgs = {
  preheader?: string;
  eyebrow?: string;
  heading: string;
  intro?: string;
  facts?: EmailFact[];
  message?: string;
  cta?: { label: string; href: string };
  accent?: EmailAccent;
  recipientName?: string;
};

export function buildEmail(args: EmailTemplateArgs): { html: string; text: string } {
  const accent = ACCENTS[args.accent ?? 'brand'];

  const factsHtml = (args.facts ?? [])
    .map(
      f => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1e7d9;vertical-align:top;width:40%;">
            <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8f5a31;">${esc(f.label)}</div>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f1e7d9;vertical-align:top;">
            <div style="font-size:14px;color:#1e293b;font-weight:500;">${esc(f.value)}</div>
          </td>
        </tr>`
    )
    .join('');

  const messageHtml = args.message
    ? `<div style="margin:20px 0 0;padding:14px 16px;background:#faf5f0;border:1px solid #f3e7d9;border-radius:10px;color:#334155;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(args.message)}</div>`
    : '';

  const ctaHtml = args.cta
    ? `<tr><td align="center" style="padding:28px 0 8px;">
         <a href="${escAttr(args.cta.href)}"
            style="display:inline-block;background:${accent.bar};color:#ffffff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:.01em;">
           ${esc(args.cta.label)}
         </a>
       </td></tr>`
    : '';

  const eyebrowHtml = args.eyebrow
    ? `<div style="display:inline-block;background:${accent.pill};color:${accent.pillText};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:5px 10px;border-radius:999px;margin-bottom:12px;">${esc(args.eyebrow)}</div>`
    : '';

  const greeting = args.recipientName
    ? `<p style="margin:0 0 14px;color:#475569;font-size:14px;">Hi ${esc(args.recipientName.split(' ')[0])},</p>`
    : '';

  const intro = args.intro
    ? `<p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.6;">${esc(args.intro)}</p>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(args.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f8f3ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Arial,sans-serif;color:#1e293b;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f8f3ec;">${esc(args.preheader ?? args.heading)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f3ec;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;border:1px solid #ece0cf;box-shadow:0 4px 24px rgba(60,30,10,0.06);overflow:hidden;">
      <!-- header band -->
      <tr><td style="height:6px;background:linear-gradient(90deg,#8f5a31 0%,#6b3e26 60%,#3f241a 100%);"></td></tr>
      <!-- brand -->
      <tr><td style="padding:22px 28px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="width:42px;height:42px;background:#faf5f0;border:1px solid #f3e7d9;border-radius:12px;text-align:center;vertical-align:middle;">
                  <span style="font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:22px;color:#6b3e26;letter-spacing:-1px;line-height:42px;">NS</span>
                </td>
                <td style="padding-left:12px;vertical-align:middle;">
                  <div style="font-size:15px;font-weight:700;color:#1e293b;letter-spacing:-0.2px;">NS Project Tracker</div>
                  <div style="font-size:11px;color:#8f5a31;letter-spacing:.08em;text-transform:uppercase;font-weight:600;">Enterprise project &amp; task management</div>
                </td>
              </tr></table>
            </td>
          </tr>
        </table>
      </td></tr>
      <!-- body -->
      <tr><td style="padding:26px 28px 8px;">
        ${eyebrowHtml}
        <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#0f172a;letter-spacing:-0.3px;font-weight:700;">${esc(args.heading)}</h1>
        ${greeting}
        ${intro}
        ${factsHtml ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-top:1px solid #f1e7d9;">${factsHtml}</table>` : ''}
        ${messageHtml}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${ctaHtml}</table>
      </td></tr>
      <!-- footer -->
      <tr><td style="padding:18px 28px 26px;border-top:1px solid #f3e7d9;background:#faf5f0;">
        <p style="margin:0;color:#8f5a31;font-size:11px;line-height:1.6;">
          You received this notification because you are an active member of NS Project Tracker.<br>
          Manage your preferences in <strong style="color:#553020;">Settings → Security</strong>.
        </p>
      </td></tr>
    </table>
    <div style="max-width:600px;margin:14px auto 0;color:#a08974;font-size:11px;text-align:center;">
      &copy; ${new Date().getFullYear()} NS · Project Tracker
    </div>
  </td></tr>
</table>
</body></html>`;

  const textLines = [
    args.heading,
    args.recipientName ? `Hi ${args.recipientName.split(' ')[0]},` : '',
    args.intro ?? '',
    ...(args.facts ?? []).map(f => `${f.label}: ${f.value}`),
    args.message ?? '',
    args.cta ? `${args.cta.label}: ${args.cta.href}` : '',
    '',
    '— NS Project Tracker',
  ].filter(Boolean);

  return { html, text: textLines.join('\n') };
}

/** @deprecated use buildEmail for richer emails; kept for backwards compatibility */
export function emailTemplate(title: string, bodyLines: string[], cta?: { label: string; href: string }) {
  return buildEmail({
    heading: title,
    intro: bodyLines[0],
    message: bodyLines.slice(1).filter(Boolean).join('\n'),
    cta,
  }).html;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
function escAttr(s: string) { return esc(s); }
