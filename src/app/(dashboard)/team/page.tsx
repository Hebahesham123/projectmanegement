'use client';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { useData } from '@/lib/store/data';
import type { UserRole } from '@/lib/types';
import { Card, CardBody } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Select } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const { users, hydrated } = useData();
  const isAdmin = profile?.role === 'admin';

  const changeRole = async (id: string, role: UserRole) => {
    const { error } = await supabase.from('users').update({ role }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Role updated');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.team')}</h1>
        <p className="mt-1 text-sm text-slate-500">{users.length} members</p>
      </div>
      <Card>
        <CardBody className="p-0">
          {!hydrated ? (
            <div className="space-y-3 p-4">{[0,1,2].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-start">Member</th>
                  <th className="px-4 py-3 text-start">Email</th>
                  <th className="px-4 py-3 text-start">Role</th>
                  <th className="px-4 py-3 text-start">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {users.map(u => (
                  <tr key={u.id} className="text-sm">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name} email={u.email} />
                        <span className="font-medium text-slate-900 dark:text-slate-100">{u.full_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="px-4 py-3">
                      {isAdmin && u.id !== profile?.id ? (
                        <Select value={u.role} onChange={e => changeRole(u.id, e.target.value as UserRole)} className="w-44">
                          <option value="admin">{t('role.admin')}</option>
                          <option value="project_manager">{t('role.project_manager')}</option>
                          <option value="team_member">{t('role.team_member')}</option>
                        </Select>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {t(`role.${u.role}`)}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
