import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { PackageSearch, Pencil, Trash2 } from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { Item } from '../types';
import ItemCard from '../components/items/ItemCard';
import { EmptyState, Skeleton } from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { TypeBadge } from '../components/ui/Badge';

export default function MyItems() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'all' | 'lost' | 'found'>('all');

  const load = () => {
    api
      .get<{ items: Item[] }>('/api/items/mine')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  };

  useEffect(load, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.del(`/api/items/${deleting.id}`);
      toast.success('Listing removed');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not remove listing');
    } finally {
      setBusy(false);
    }
  };

  const filtered = items?.filter((i) => tab === 'all' || i.type === tab);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">My items</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Everything you've reported — lost and found.</p>
        </div>
        <Link to="/report" className="btn-primary">
          <PackageSearch className="size-4" /> Report new item
        </Link>
      </div>

      <div className="mt-6 flex gap-2">
        {(['all', 'lost', 'found'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
              tab === t
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {items === null && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4]" />
            ))}
          </div>
        )}
        {items !== null && filtered!.length === 0 && (
          <EmptyState
            icon={<PackageSearch className="size-10" />}
            title="No items here yet"
            description="Report your first lost or found item to get started."
            action={
              <Link to="/report" className="btn-primary">
                Report an item
              </Link>
            }
          />
        )}
        {items !== null && filtered!.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered!.map((item) => (
              <div key={item.id} className="relative">
                <ItemCard item={item} />
                <div className="card absolute right-3 top-3 z-10 flex gap-1 rounded-lg p-1 shadow-sm">
                  <Link to={`/items/${item.id}/edit`} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-700" aria-label="Edit">
                    <Pencil className="size-3.5" />
                  </Link>
                  <button onClick={() => setDeleting(item)} className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label="Delete">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Remove listing?">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This permanently removes <strong>{deleting?.name}</strong> ({deleting?.uid}) from Findsity. Claims and messages
          stay in the archive for records. This can't be undone.
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="danger" onClick={confirmDelete} loading={busy}>
            <Trash2 className="size-4" /> Remove listing
          </Button>
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}