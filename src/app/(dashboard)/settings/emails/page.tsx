'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CheckCircle2, XCircle, RefreshCw, Search, Mail, ChevronDown, ChevronUp } from 'lucide-react';

type EmailLogRow = {
  id: string;
  sent_by: string | null;
  to_addr: string;
  subject: string;
  html: string | null;
  text: string | null;
  status: 'sent' | 'failed';
  message_id: string | null;
  response: string | null;
  accepted: string[] | null;
  rejected: string[] | null;
  error: string | null;
  created_at: string;
};

export default function EmailLogPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setRows(data as EmailLogRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (profile && profile.role !== 'admin') {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardBody className="py-12 text-center text-slate-500">
            Only administrators can view the email log.
          </CardBody>
        </Card>
      </div>
    );
  }

  const filtered = rows.filter(r => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.to_addr.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      (r.error ?? '').toLowerCase().includes(q)
    );
  });

  const sent = rows.filter(r => r.status === 'sent').length;
  const failed = rows.filter(r => r.status === 'failed').length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email log</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every message dispatched by the app. Shows the last 200 attempts.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardBody className="py-4">
          <div className="text-xs text-slate-500">Total</div>
          <div className="text-2xl font-bold">{rows.length}</div>
        </CardBody></Card>
        <Card><CardBody className="py-4">
          <div className="text-xs text-emerald-600">Sent</div>
          <div className="text-2xl font-bold text-emerald-600">{sent}</div>
        </CardBody></Card>
        <Card><CardBody className="py-4">
          <div className="text-xs text-rose-600">Failed</div>
          <div className="text-2xl font-bold text-rose-600">{failed}</div>
        </CardBody></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Recent emails</CardTitle>
            <div className="relative w-72 max-w-full">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search recipient, subject, error…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <div className="text-sm text-slate-500">No emails found.</div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map(r => {
                const open = expanded === r.id;
                return (
                  <li key={r.id} className="px-4 py-3">
                    <button
                      onClick={() => setExpanded(open ? null : r.id)}
                      className="flex w-full items-start gap-3 text-left"
                    >
                      <div className="mt-0.5 shrink-0">
                        {r.status === 'sent' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-rose-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {r.subject}
                          </div>
                          <div className="shrink-0 text-xs text-slate-500">
                            {new Date(r.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          To: {r.to_addr}
                        </div>
                        {r.status === 'failed' && r.error && (
                          <div className="mt-1 truncate text-xs text-rose-600">{r.error}</div>
                        )}
                      </div>
                      <div className="mt-0.5 shrink-0 text-slate-400">
                        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {open && (
                      <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-4 text-xs dark:bg-slate-800/50">
                        <Field label="Status" value={r.status} />
                        <Field label="Message ID" value={r.message_id ?? '—'} />
                        <Field label="SMTP response" value={r.response ?? '—'} />
                        <Field label="Accepted" value={(r.accepted ?? []).join(', ') || '—'} />
                        <Field label="Rejected" value={(r.rejected ?? []).join(', ') || '—'} />
                        {r.error && <Field label="Error" value={r.error} />}
                        {r.html && (
                          <div>
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Preview
                            </div>
                            <iframe
                              srcDoc={r.html}
                              sandbox=""
                              className="h-96 w-full rounded-md border border-slate-200 bg-white dark:border-slate-700"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="break-all text-slate-700 dark:text-slate-200">{value}</div>
    </div>
  );
}
