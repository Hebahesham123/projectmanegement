import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Body = { text: string; source?: string; target: string };

// Free, keyless Google Translate endpoint. Called server-side to avoid CORS.
async function translate(text: string, source: string, target: string): Promise<string> {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx' +
    `&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}` +
    `&dt=t&q=${encodeURIComponent(text)}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) throw new Error(`translation service returned ${res.status}`);

  // Response shape: [[["translated","original",...], ...], ...]
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('unexpected translation response');
  }
  const segments = data[0] as Array<unknown>;
  return segments
    .map(seg => (Array.isArray(seg) ? String(seg[0] ?? '') : ''))
    .join('');
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

  const text = (body?.text ?? '').trim();
  const target = body?.target;
  const source = body?.source || 'auto';
  if (!text) return NextResponse.json({ error: 'missing text' }, { status: 400 });
  if (!target) return NextResponse.json({ error: 'missing target' }, { status: 400 });

  try {
    const translated = await translate(text, source, target);
    return NextResponse.json({ text: translated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'translation failed';
    console.error('[translate]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
