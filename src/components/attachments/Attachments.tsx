'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { Attachment } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Upload, Trash2, FileText, ImageIcon, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Parent =
  | { task_id: string }
  | { project_id: string }
  | { comment_id: string };

export function Attachments({ parent }: { parent: Parent }) {
  const supabase = createClient();
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<Attachment[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = profile?.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('attachments').select('*').order('created_at', { ascending: false });
    if ('task_id' in parent)         query = query.eq('task_id', parent.task_id);
    else if ('project_id' in parent) query = query.eq('project_id', parent.project_id);
    else                              query = query.eq('comment_id', parent.comment_id);
    const { data, error } = await query;
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data as Attachment[]) ?? [];
    setRows(list);

    // Generate signed URLs (1h) for previews + downloads.
    const next: Record<string, string> = {};
    await Promise.all(list.map(async (a) => {
      const { data: signed } = await supabase.storage.from('attachments').createSignedUrl(a.storage_path, 3600);
      if (signed?.signedUrl) next[a.id] = signed.signedUrl;
    }));
    setUrls(next);
    setLoading(false);
  }, [parent, supabase]);

  useEffect(() => { load(); }, [load]);

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
        const baseDir =
          'task_id'    in parent ? `task/${parent.task_id}` :
          'project_id' in parent ? `project/${parent.project_id}` :
          `comment/${(parent as { comment_id: string }).comment_id}`;
        const key = `${baseDir}/${crypto.randomUUID()}${ext ? '.' + ext : ''}`;

        const { error: upErr } = await supabase.storage
          .from('attachments')
          .upload(key, file, { contentType: file.type, upsert: false });
        if (upErr) { toast.error(upErr.message); continue; }

        const insertRow = {
          ...('task_id'    in parent ? { task_id:    parent.task_id    } : {}),
          ...('project_id' in parent ? { project_id: parent.project_id } : {}),
          ...('comment_id' in parent ? { comment_id: parent.comment_id } : {}),
          storage_path: key,
          file_name: file.name,
          content_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: user.id,
        };
        const { error: insErr } = await supabase.from('attachments').insert(insertRow);
        if (insErr) {
          await supabase.storage.from('attachments').remove([key]);
          toast.error(insErr.message);
          continue;
        }
      }
      await load();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeOne = async (a: Attachment) => {
    if (!confirm(`Delete "${a.file_name}"?`)) return;
    const { error: dbErr } = await supabase.from('attachments').delete().eq('id', a.id);
    if (dbErr) { toast.error(dbErr.message); return; }
    await supabase.storage.from('attachments').remove([a.storage_path]);
    setRows(rs => rs.filter(r => r.id !== a.id));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onPickFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm dark:border-slate-700"
      >
        <div className="text-slate-500">
          {uploading ? 'Uploading…' : 'Drop files here or click to upload'}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => onPickFiles(e.target.files)}
          />
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-2 text-xs text-slate-500">Loading attachments…</div>
      ) : rows.length === 0 ? (
        <div className="py-2 text-xs text-slate-500">No attachments yet.</div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows.map(a => {
            const isImage = (a.content_type ?? '').startsWith('image/');
            const url = urls[a.id];
            const canDelete = a.uploaded_by === user?.id || isAdmin;
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                {isImage && url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="block h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={a.file_name} className="h-full w-full object-cover" />
                  </a>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
                    {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{a.file_name}</div>
                  <div className="text-[11px] text-slate-500">
                    {a.size_bytes ? formatSize(a.size_bytes) : ''}
                    {a.content_type ? ` · ${a.content_type}` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      download={a.file_name}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => removeOne(a)}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
