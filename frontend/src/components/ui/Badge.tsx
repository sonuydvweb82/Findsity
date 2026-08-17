import { cn } from '../../utils/format';
import { RISK_LABELS, CLAIM_STATUS_LABELS, ITEM_STATUS_LABELS } from '../../utils/format';

const tones: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  medium: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400',
  high: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400',
  more_info: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400',
  escalated: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400',
  closed: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400',
  returned: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400',
  found: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  lost: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400',
  return_pending: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400',
};

export function Badge({ kind, value, className }: { kind: 'risk' | 'claim' | 'item'; value: string; className?: string }) {
  const label =
    kind === 'risk' ? RISK_LABELS[value] ?? value : kind === 'claim' ? CLAIM_STATUS_LABELS[value] ?? value : ITEM_STATUS_LABELS[value] ?? value;
  return (
    <span className={cn('chip ring-1 ring-inset', tones[value] ?? tones.closed, className)}>
      {label}
    </span>
  );
}

export function TypeBadge({ type }: { type: 'lost' | 'found' }) {
  return type === 'found' ? (
    <span className="chip bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400">
      Found
    </span>
  ) : (
    <span className="chip bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400">
      Lost
    </span>
  );
}