import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { BellRing, CheckCheck, Sparkles } from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { NotificationItem } from '../types';
import { EmptyState, Skeleton } from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { timeAgo } from '../utils/format';

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);

  const load = () => {
    api
      .get<{ notifications: NotificationItem[] }>('/api/notifications')
      .then((r) => setItems(r.notifications))
      .catch(() => setItems([]));
  };

  useEffect(load, []);

  const markAll = async () => {
    try {
      await api.post('/api/notifications/read-all');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update notifications');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Matches, claims and handover updates.</p>
        </div>
        {items && items.length > 0 && (
          <Button variant="secondary" size="sm" onClick={markAll}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        )}
      </div>

      <div className="mt-8">
        {items === null && <Skeleton className="h-64" />}
        {items !== null && items.length === 0 && (
          <EmptyState
            icon={<BellRing className="size-10" />}
            title="You're all caught up"
            description="We'll notify you about possible matches, claims and handovers."
          />
        )}
        {items !== null && items.length > 0 && (
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 ${n.read_at ? '' : 'bg-brand-50/50 dark:bg-brand-500/5'}`}
              >
                <div
                  className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${
                    n.read_at ? 'bg-slate-100 text-slate-400 dark:bg-slate-800' : 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
                  }`}
                >
                  {n.read_at ? <BellRing className="size-4.5" /> : <Sparkles className="size-4.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{n.body}</p>
                  {n.link && (
                    <Link to={n.link} className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                      View details →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}