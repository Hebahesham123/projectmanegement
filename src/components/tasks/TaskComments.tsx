'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Comment, UserProfile } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { useData } from '@/lib/store/data';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';

export function TaskComments({ taskId }: { taskId: string }) {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const { comments: allComments, users } = useData();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const comments = useMemo(
    () => allComments
      .filter(c => c.task_id === taskId)
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .map(c => ({ ...c, author: users.find(u => u.id === c.author_id) })),
    [allComments, users, taskId]
  );

  const send = async () => {
    if (!body.trim() || !user) return;
    setLoading(true);
    try {
      const res = await supabase.from('comments').insert({
        task_id: taskId,
        body: body.trim(),
        author_id: user.id,
        parent_id: replyTo,
      }).select().single();
      if (res.error) { toast.error(res.error.message); return; }
      useData.getState().applyComment({ new: res.data as Comment, old: null, eventType: 'INSERT' });
      setBody('');
      setReplyTo(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post comment';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const del = async (id: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    useData.getState().applyComment({ new: null, old: { id }, eventType: 'DELETE' });
  };

  const roots = comments.filter(c => !c.parent_id);
  const repliesOf = (id: string) => comments.filter(c => c.parent_id === id);

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {roots.length === 0 && <div className="text-sm text-slate-500">No comments yet.</div>}
        {roots.map(c => (
          <div key={c.id}>
            <CommentRow c={c} currentUserId={user?.id} onReply={() => setReplyTo(c.id)} onDelete={() => del(c.id)} isAdmin={profile?.role === 'admin'} />
            <div className="ms-10 mt-3 space-y-3">
              {repliesOf(c.id).map(r => (
                <CommentRow key={r.id} c={r} currentUserId={user?.id} onDelete={() => del(r.id)} isAdmin={profile?.role === 'admin'} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Replying…</span>
            <button onClick={() => setReplyTo(null)} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">{t('common.cancel')}</button>
          </div>
        )}
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={t('task.add_comment')}
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" loading={loading} onClick={send} disabled={!body.trim()}>{t('task.post')}</Button>
        </div>
      </div>
    </div>
  );
}

function CommentRow({
  c, currentUserId, onReply, onDelete, isAdmin,
}: {
  c: Comment & { author?: UserProfile | undefined };
  currentUserId?: string;
  onReply?: () => void;
  onDelete: () => void;
  isAdmin?: boolean;
}) {
  const { t } = useI18n();
  const canDelete = c.author_id === currentUserId || isAdmin;
  return (
    <div className="flex gap-3">
      <Avatar name={c.author?.full_name} email={c.author?.email} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.author?.full_name ?? c.author?.email ?? '—'}</span>
          <span className="text-xs text-slate-400">{formatDate(c.created_at, 'MMM d, HH:mm')}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{c.body}</p>
        <div className="mt-1 flex items-center gap-3 text-xs">
          {onReply && <button onClick={onReply} className="text-slate-500 hover:text-brand-600">{t('task.reply')}</button>}
          {canDelete && <button onClick={onDelete} className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600"><Trash2 className="h-3 w-3" />{t('common.delete')}</button>}
        </div>
      </div>
    </div>
  );
}
