import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { api } from '../services/api';
import type { ClaimSummary } from '../types';
import { Badge, TypeBadge } from '../components/ui/Badge';
import { Avatar, EmptyState, Skeleton } from '../components/ui/Avatar';
import { timeAgo } from '../utils/format';
import { resolveImageUrl } from '../utils/image';

export default function Claims() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState<'mine' | 'finder'>(params.get('tab') === 'finder' ? 'finder' : 'mine');
  const [data, setData] = useState<ClaimSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const path = tab === 'mine' ? '/api/claims/mine' : '/api/claims/finder';
    api
      .get<{ claims: ClaimSummary[] }>(path)
      .then((r) => setData(r.claims))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Claims</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track ownership verification and handovers for your items.
        </p>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setTab('mine')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'mine' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          Claims I submitted
        </button>
        <button
          onClick={() => setTab('finder')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'finder' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          Claims on my items
        </button>
      </div>

      <div className="mt-8">
        {loading && <Skeleton className="h-64" />}

        {!loading && data && data.length === 0 && (
          <EmptyState
            icon={<FileText className="size-10" />}
            title={tab === 'mine' ? 'No claims yet' : 'No claims on your items yet'}
            description={
              tab === 'mine'
                ? 'Browse found items and claim the ones that might be yours.'
                : 'When someone claims one of your found items, it will show up here.'
            }
            action={
              tab === 'mine' ? (
                <Link to="/find?type=found" className="btn-primary">
                  Browse found items
                </Link>
              ) : undefined
            }
          />
        )}

        {!loading && data && data.length > 0 && (
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((c) => (
              <Link key={c.id} to={`/claims/${c.id}`} className="flex items-center gap-4 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                {c.item_cover ? (
                  <img src={resolveImageUrl(c.item_cover)} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300 dark:bg-slate-800">
                    <FileText className="size-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-slate-900 dark:text-white">{c.item_name ?? 'Item'}</p>
                    <TypeBadge type={c.item_type ?? 'found'} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {tab === 'mine'
                      ? `Claim ${c.uid} · ${timeAgo(c.created_at)}`
                      : (
                        <span>
                          <Link
                            to={`/profile/${c.claimant_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-slate-700 transition hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400"
                          >
                            {c.claimant_name ?? 'Someone'}
                          </Link>{' '}
                          claims it · {timeAgo(c.created_at)}
                        </span>
                      )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge kind="risk" value={c.risk_level} className="hidden sm:inline-flex" />
                  <Badge kind="claim" value={c.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}