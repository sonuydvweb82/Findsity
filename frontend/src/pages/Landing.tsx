import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  HeartHandshake,
  MapPin,
  PackageSearch,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import type { Item, Paginated } from '../types';
import ItemCard from '../components/items/ItemCard';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

const STEPS = [
  { icon: PackageSearch, title: 'Report', text: 'Report a lost or found item in under a minute with photos and details.' },
  { icon: ScanSearch, title: 'Get matched', text: 'Our smart matching finds possible matches based on name, brand, color and location.' },
  { icon: ShieldCheck, title: 'Verify', text: 'Claimants answer private verification questions to prove ownership — no personal data exposed.' },
  { icon: HeartHandshake, title: 'Reunite', text: 'Arrange an in-person handover on campus and confirm when the item is returned.' },
];

export default function Landing() {
  const { user } = useAuth();
  const [found, setFound] = useState<Item[]>([]);
  const [lost, setLost] = useState<Item[]>([]);
  const [stats, setStats] = useState<{ itemsReported?: number; itemsFound?: number; itemsReturned?: number; activeUsers?: number } | null>(null);

  useEffect(() => {
    void api
      .get<Paginated<Item>>('/api/items?type=found&limit=4')
      .then((r) => setFound(r.items))
      .catch(() => undefined);
    void api
      .get<Paginated<Item>>('/api/items?type=lost&limit=4')
      .then((r) => setLost(r.items))
      .catch(() => undefined);
    void api
      .get<{ stats: { itemsReported: number; itemsFound: number; itemsReturned: number; activeUsers: number } }>('/api/admin/public/stats')
      .then((r) => setStats(r.stats))
      .catch(() => undefined);
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.15),transparent)]"
          aria-hidden
        />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="chip mb-5 bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/20 dark:bg-brand-500/10 dark:text-brand-300">
              <Sparkles className="size-3.5" /> Campus lost &amp; found, made simple
            </span>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
              Lost something?
              <span className="block bg-gradient-to-r from-brand-600 to-indigo-500 bg-clip-text text-transparent">Find it here.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-400">
              Findsity connects people who lost things with the people who found them — with safe verification and
              in-person handovers. No phone numbers, no public student IDs.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/find" className="btn-primary px-6 py-3 text-base">
                Browse lost &amp; found <ArrowRight className="size-4" />
              </Link>
              {!user && (
                <Link to="/register" className="btn-secondary px-6 py-3 text-base">
                  Create free account
                </Link>
              )}
            </div>

            {stats && (
              <dl className="mx-auto mt-12 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Items reported', value: stats.itemsReported },
                  { label: 'Found', value: stats.itemsFound },
                  { label: 'Reunited', value: stats.itemsReturned },
                  { label: 'Members', value: stats.activeUsers },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-slate-200 bg-white/60 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</dt>
                    <dd className="font-display mt-1 text-2xl font-bold text-slate-900 dark:text-white">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mx-auto mt-10 flex max-w-xl items-center">
              {[
                { icon: PackageSearch, label: 'Reported', highlight: false },
                { icon: ScanSearch, label: 'Matched', highlight: true },
                { icon: HeartHandshake, label: 'Returned', highlight: false },
              ].map((step, i) => (
                <Fragment key={step.label}>
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={`flex size-10 items-center justify-center rounded-full border backdrop-blur ${
                        step.highlight
                          ? 'border-brand-300/70 bg-brand-50 text-brand-600 motion-safe:animate-pulse dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300'
                          : 'border-slate-200 bg-white/70 text-slate-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-500'
                      }`}
                    >
                      <step.icon className="size-4.5" />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {step.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className="mx-3 mb-5 h-px flex-1 bg-gradient-to-r from-brand-500/40 to-brand-500/70 dark:from-brand-400/25 dark:to-brand-400/50"
                      aria-hidden
                    />
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
            How Findsity works
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card p-6">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                  <s.icon className="size-5.5" />
                </div>
                <p className="mt-4 text-xs font-semibold tracking-wide text-brand-600 dark:text-brand-300">STEP {i + 1}</p>
                <h3 className="mt-1 font-semibold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent listings */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Recently found</h2>
            <p className="mt-1 text-sm text-slate-500">Newly found items looking for their owners.</p>
          </div>
          <Link to="/find?type=found" className="btn-ghost">
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {found.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-14 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Recently lost</h2>
            <p className="mt-1 text-sm text-slate-500">Keep an eye out for these.</p>
          </div>
          <Link to="/find?type=lost" className="btn-ghost">
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {lost.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* Safety CTA */}
      <section className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
              Safe by design. <span className="text-brand-600">Private by default.</span>
            </h2>
            <ul className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2.5">
                <BellRing className="mt-0.5 size-4.5 shrink-0 text-brand-500" />
                Verified ownership through private questions — never public student IDs or phone numbers.
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4.5 shrink-0 text-brand-500" />
                Handovers arranged in campus locations, confirmed by both sides.
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-brand-500" />
                Administrators review high-risk claims to protect your community.
              </li>
            </ul>
          </div>
          <div className="card max-w-sm p-6 text-center">
            <Search className="mx-auto size-10 text-brand-500" />
            <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">Did you find something?</h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Report it in one minute and help someone get their stuff back.
            </p>
            <Link to={user ? '/report' : '/register'} className="btn-primary mt-4 w-full">
              Report a found item
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}