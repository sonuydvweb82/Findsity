import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  FileText,
  PackageSearch,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { ClaimSummary, Item, NotificationItem } from '../types';
import { Badge, TypeBadge } from '../components/ui/Badge';
import { Avatar, EmptyState, Skeleton, Spinner } from '../components/ui/Avatar';
import ItemCard from '../components/items/ItemCard';
import { timeAgo } from '../utils/format';

export default function Dashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);

  useEffect(() => {
    api
      .get<{ items: Item[] }>('/api/items/mine')
      .then((r) => setItems(r.items.slice(0, 4)))
      .catch(() => setItems([]));
    api
      .get<{ claims: ClaimSummary[] }>('/api/claims/mine')
      .then((r) => setClaims(r.claims.slice(0, 5)))
      .catch(() => setClaims([]));
    api
      .get<{ notifications: NotificationItem[] }>('/api/notifications')
      .then((r) => setNotifications(r.notifications.slice(0, 5)))
      .catch(() => setNotifications([]));
  }, []);

  const stats = [
    { label: 'My listings', value: items?.length ?? '—', to: '/my-items', icon: PackageSearch },
    { label: 'My claims', value: claims?.length ?? '—', to: '/claims', icon: FileText },
    {
      label: 'Active claims on my items',
      value: claims?.filter((c) => !['rejected', 'closed', 'returned'].includes(c.status)).length ?? '—',
      to: '/claims/finder',
      icon: ShieldCheck,
    },
    { label: 'Unread notifications', value: notifications?.filter((n) => !n.read_at).length ?? '—', to: '/notifications', icon: BellRing },
  ];

  if (items === null || claims === null || notifications === null) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            Hey, {user?.fullName.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Here's what's happening with your items.</p>
        </div>
        <Link to="/report" className="btn-primary">
          <PackageSearch className="size-4" /> Report an item
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card p-5 transition hover:shadow-md">
            <s.icon className="size-5 text-brand-500" />
            <p className="font-display mt-3 text-3xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* My recent listings */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">My recent listings</h2>
            <Link to="/my-items" className="btn-ghost text-sm">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {items.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="size-8" />}
              title="Nothing reported yet"
              description="Lost something? Found something? Report it to get matched."
              action={
                <Link to="/report" className="btn-primary">
                  Report an item
                </Link>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="space-y-8">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">My claims</h2>
              <Link to="/claims" className="btn-ghost text-sm">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {claims.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-8" />}
                title="No claims yet"
                description="Find an item that might be yours and submit a claim."
                action={
                  <Link to="/find?type=found" className="btn-primary">
                    Browse found items
                  </Link>
                }
              />
            ) : (
              <div className="card divide-y divide-slate-100 dark:divide-slate-800">
                {claims.map((c) => (
                  <Link key={c.id} to={`/claims/${c.id}`} className="flex items-center gap-3 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TypeBadge type={c.item_type ?? 'found'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {c.item_name ?? 'Item'}
                      </p>
                      <p className="text-xs text-slate-500">Claim {c.uid}</p>
                    </div>
                    <Badge kind="claim" value={c.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Notifications</h2>
              <Link to="/notifications" className="btn-ghost text-sm">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {notifications.length === 0 ? (
              <EmptyState icon={<BellRing className="size-8" />} title="All quiet" description="We'll ping you when something matches your items." />
            ) : (
              <div className="card divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    to={n.link ?? '/notifications'}
                    className={`flex items-start gap-3 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${n.read_at ? '' : 'bg-brand-50/50 dark:bg-brand-500/5'}`}
                  >
                    {n.read_at ? (
                      <BellRing className="mt-0.5 size-4 shrink-0 text-slate-300 dark:text-slate-600" />
                    ) : (
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{n.body}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}