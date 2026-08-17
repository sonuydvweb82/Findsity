import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ShieldAlert } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import type { Report } from '../../types';
import { Avatar, EmptyState, Skeleton } from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Input';
import { formatDate, titleCase } from '../../utils/format';

const REASON_LABELS: Record<string, string> = {
  fake_listing: 'Fake listing',
  scam: 'Scam',
  spam: 'Spam',
  inappropriate: 'Inappropriate',
  suspicious_user: 'Suspicious user',
  incorrect_info: 'Incorrect info',
  other: 'Other',
};

export default function AdminReports() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [total, setTotal] = useState(0);
  const [resolving, setResolving] = useState<Report | null>(null);
  const [decision, setDecision] = useState<'resolved' | 'rejected'>('resolved');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get<{ reports: Report[]; total: number }>('/api/admin/reports')
      .then((r) => {
        setReports(r.reports);
        setTotal(r.total);
      })
      .catch(() => setReports([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async () => {
    if (!resolving) return;
    setBusy(true);
    try {
      const res = await api.post<{ message: string }>(`/api/admin/reports/${resolving.id}/resolve`, { decision, note });
      toast.success(res.message);
      setResolving(null);
      setNote('');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not resolve report');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Reports <span className="text-sm font-normal text-slate-400">({total})</span>
        </h2>
      </div>

      <div className="mt-6 space-y-4">
        {reports === null && <Skeleton className="h-64" />}
        {reports !== null && reports.length === 0 && (
          <EmptyState icon={<ShieldAlert className="size-10" />} title="No reports" description="Nothing to review right now." />
        )}
        {reports !== null &&
          reports.length > 0 &&
          reports.map((r) => (
            <div key={r.id} className="card flex flex-wrap items-center gap-4 p-5">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                <Avatar name={r.reporter_name} url={null} size={36} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {REASON_LABELS[r.reason] ?? titleCase(r.reason)}{' '}
                    <span className="font-normal text-slate-400">· {r.target_type} {r.target_id.slice(0, 8)}…</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Reported by {r.reporter_name ?? 'a user'} · {formatDate(r.created_at)}
                  </p>
                  {r.details && <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{r.details}</p>}
                </div>
              </div>
              <span
                className={`chip ${
                  r.status === 'pending'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                }`}
              >
                {r.status}
              </span>
              {r.status === 'pending' && (
                <Button size="sm" variant="secondary" onClick={() => { setResolving(r); setDecision('resolved'); setNote(''); }}>
                  Review
                </Button>
              )}
            </div>
          ))}
      </div>

      <Modal open={Boolean(resolving)} onClose={() => setResolving(null)} title="Resolve report">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {resolving?.target_type}: <span className="text-xs text-slate-400">{resolving?.target_id}</span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDecision('resolved')}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                decision === 'resolved'
                  ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                  : 'border-slate-200 text-slate-500 dark:border-slate-700'
              }`}
            >
              Valid — resolve
            </button>
            <button
              onClick={() => setDecision('rejected')}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                decision === 'rejected'
                  ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                  : 'border-slate-200 text-slate-500 dark:border-slate-700'
              }`}
            >
              Dismiss
            </button>
          </div>
          <div>
            <label className="label-base">Note</label>
            <Textarea placeholder="Optional resolution note…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button loading={busy} onClick={resolve}>
              {decision === 'resolved' ? 'Resolve report' : 'Dismiss report'}
            </Button>
            <Button variant="secondary" onClick={() => setResolving(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}