import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Search, ShieldBan, ShieldCheck, Users } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import type { AdminUserRow } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Avatar, EmptyState, Skeleton } from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatDate } from '../../utils/format';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState('');
  const perPage = 20;

  const load = useCallback(
    (p = page, query = q) => {
      const qs = new URLSearchParams();
      if (query) qs.set('q', query);
      qs.set('page', String(p));
      qs.set('limit', String(perPage));
      api
        .get<{ users: AdminUserRow[]; total: number }>(`/api/admin/users?${qs.toString()}`)
        .then((r) => {
          setUsers(r.users);
          setTotal(r.total);
        })
        .catch(() => setUsers([]));
    },
    [page, q],
  );

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (u: AdminUserRow) => {
    setBusyId(u.id);
    try {
      const next = u.status === 'suspended' ? 'active' : 'suspended';
      const res = await api.patch<{ message: string }>(`/api/admin/users/${u.id}/status`, { status: next });
      toast.success(res.message);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update user');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Users <span className="text-sm font-normal text-slate-400">({total})</span>
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="w-64 pl-9"
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
              load(1, e.target.value);
            }}
          />
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto">
        {users === null ? (
          <Skeleton className="h-64 m-4" />
        ) : users.length === 0 ? (
          <EmptyState icon={<Users className="size-10" />} title="No users found" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">College</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Listings</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.full_name} url={null} size={32} />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{u.full_name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.college}</td>
                  <td className="px-4 py-3">
                    {u.role === 'admin' ? (
                      <span className="chip bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">Admin</span>
                    ) : (
                      <span className="text-slate-500">User</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge kind="claim" value={u.status === 'active' ? 'approved' : 'rejected'} className="[&:first-letter]:normal-case" />
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.item_count}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'admin' && (
                      <Button
                        variant={u.status === 'suspended' ? 'secondary' : 'danger'}
                        size="sm"
                        loading={busyId === u.id}
                        onClick={() => toggleStatus(u)}
                      >
                        {u.status === 'suspended' ? (
                          <>
                            <ShieldCheck className="size-3.5" /> Reactivate
                          </>
                        ) : (
                          <>
                            <ShieldBan className="size-3.5" /> Suspend
                          </>
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > perPage && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} of {Math.ceil(total / perPage)}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / perPage)} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}