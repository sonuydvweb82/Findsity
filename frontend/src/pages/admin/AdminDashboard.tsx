import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  HeartHandshake,
  PackageSearch,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react';
import { api } from '../../services/api';
import type { AdminStats } from '../../types';
import { Skeleton } from '../../components/ui/Avatar';

interface Charts {
  lostVsFound: { label: string; value: number }[];
  returnsOverTime: { label: string; value: number }[];
  popularCategories: { label: string; value: number }[];
  claimsByStatus: { label: string; value: number }[];
  claimsByRisk: { label: string; value: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);

  useEffect(() => {
    api
      .get<{ stats: AdminStats }>('/api/admin/stats')
      .then((r) => setStats(r.stats))
      .catch(() => undefined);
    api
      .get<{ charts: Charts }>('/api/admin/charts')
      .then((r) => setCharts(r.charts))
      .catch(() => undefined);
  }, []);

  if (!stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const cards = [
    { label: 'Total users', value: stats.totalUsers, icon: Users, to: '/admin/users' },
    { label: 'Lost items', value: stats.totalLost, icon: PackageSearch, to: '/admin/items?type=lost' },
    { label: 'Found items', value: stats.totalFound, icon: PackageSearch, to: '/admin/items?type=found' },
    { label: 'Returned', value: stats.returned, icon: HeartHandshake, to: '/admin/items?status=returned' },
    { label: 'Active claims', value: stats.activeClaims, icon: ArrowUpRight, to: '/admin/claims' },
    { label: 'Pending reports', value: stats.pendingReports, icon: ShieldAlert, to: '/admin/reports' },
    { label: 'Suspended users', value: stats.suspendedUsers, icon: Users, to: '/admin/users?status=suspended' },
    { label: 'Success rate', value: `${stats.successRate}%`, icon: TrendingUp, to: '/admin' },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="card p-5 transition hover:shadow-md">
            <c.icon className="size-5 text-brand-500" />
            <p className="font-display mt-3 text-2xl font-bold text-slate-900 dark:text-white">{c.value}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {charts && (
          <>
            <div className="card p-6">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Lost vs found</h2>
              <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                {charts.lostVsFound.map((c) => (
                  <div
                    key={c.label}
                    className={c.label === 'lost' ? 'bg-rose-500' : 'bg-emerald-500'}
                    style={{ width: `${(c.value / Math.max(1, charts.lostVsFound.reduce((a, b) => a + b.value, 0))) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-sm">
                {charts.lostVsFound.map((c) => (
                  <span key={c.label} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className={`size-2.5 rounded-full ${c.label === 'lost' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    {c.label}: {c.value}
                  </span>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Claims by risk</h2>
              <div className="mt-4 space-y-3">
                {charts.claimsByRisk.map((c) => {
                  const total = charts.claimsByRisk.reduce((a, b) => a + b.value, 0) || 1;
                  const color = c.label === 'high' ? 'bg-rose-500' : c.label === 'medium' ? 'bg-amber-500' : 'bg-emerald-500';
                  return (
                    <div key={c.label}>
                      <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="capitalize">{c.label}</span>
                        <span>{c.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-full ${color}`} style={{ width: `${(c.value / total) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Popular categories</h2>
              <div className="mt-4 space-y-3">
                {charts.popularCategories.slice(0, 6).map((c) => {
                  const max = Math.max(1, ...charts.popularCategories.map((x) => x.value));
                  return (
                    <div key={c.label} className="flex items-center gap-3 text-sm">
                      <span className="w-32 truncate text-slate-600 dark:text-slate-300">{c.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full bg-brand-600" style={{ width: `${(c.value / max) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right text-xs text-slate-400">{c.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Returns over time</h2>
              <div className="mt-4 flex h-32 items-end gap-1.5">
                {charts.returnsOverTime.map((c) => (
                  <div key={c.label} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-400">{c.value}</span>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-brand-600 to-brand-400"
                      style={{ height: `${Math.max(6, (c.value / Math.max(1, ...charts.returnsOverTime.map((x) => x.value))) * 100)}px` }}
                    />
                    <span className="text-[10px] text-slate-400">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}