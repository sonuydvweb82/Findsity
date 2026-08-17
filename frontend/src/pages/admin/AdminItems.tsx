import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { PackageSearch, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import type { Item } from '../../types';
import { Badge, TypeBadge } from '../../components/ui/Badge';
import { EmptyState, Skeleton } from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Select } from '../../components/ui/Input';
import { formatDate } from '../../utils/format';

export default function AdminItems() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    (p = page, t = type, s = status) => {
      const qs = new URLSearchParams();
      if (t) qs.set('type', t);
      if (s) qs.set('status', s);
      qs.set('page', String(p));
      qs.set('limit', '20');
      api
        .get<{ items: Item[]; total: number }>(`/api/admin/items?${qs.toString()}`)
        .then((r) => {
          setItems(r.items);
          setTotal(r.total);
        })
        .catch(() => setItems([]));
    },
    [page, type, status],
  );

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.del(`/api/admin/items/${deleting.id}`);
      toast.success('Item removed');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not remove item');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Items <span className="text-sm font-normal text-slate-400">({total})</span>
        </h2>
        <div className="flex gap-2">
          <Select className="w-36" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">All types</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </Select>
          <Select className="w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="lost">Still lost</option>
            <option value="found">Available</option>
            <option value="return_pending">Return pending</option>
            <option value="returned">Returned</option>
          </Select>
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto">
        {items === null ? (
          <Skeleton className="m-4 h-64" />
        ) : items.length === 0 ? (
          <EmptyState icon={<PackageSearch className="size-10" />} title="No items found" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Posted</th>
                <th className="px-4 py-3 font-medium">Views</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.cover_url ? (
                        <img src={item.cover_url} alt="" className="size-10 rounded-lg object-cover" />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-300 dark:bg-slate-800">
                          <PackageSearch className="size-4" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.uid}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={item.type} /></td>
                  <td className="px-4 py-3"><Badge kind="item" value={item.status} /></td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.location || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{item.view_count}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Link to={`/items/${item.id}`} className="btn-ghost px-2.5 py-1.5 text-xs">
                        View
                      </Link>
                      <button
                        onClick={() => setDeleting(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 20 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Remove item?">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Permanently remove <strong>{deleting?.name}</strong> ({deleting?.uid}) from the platform? Related claims and
          conversations stay archived.
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="danger" loading={busy} onClick={remove}>
            <Trash2 className="size-4" /> Remove item
          </Button>
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}