import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ScrollText } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import type { ClaimSummary } from '../../types';
import { Badge, TypeBadge } from '../../components/ui/Badge';
import { Avatar, EmptyState, Skeleton } from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Select, Textarea } from '../../components/ui/Input';
import { formatDate } from '../../utils/format';
import { resolveImageUrl } from '../../utils/image';

export default function AdminClaims() {
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [reviewing, setReviewing] = useState<ClaimSummary | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | 'request_info'>('approve');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    (p = page, s = status) => {
      const qs = new URLSearchParams();
      if (s) qs.set('status', s);
      qs.set('page', String(p));
      qs.set('limit', '20');
      api
        .get<{ claims: ClaimSummary[]; total: number }>(`/api/admin/claims?${qs.toString()}`)
        .then((r) => {
          setClaims(r.claims);
          setTotal(r.total);
        })
        .catch(() => setClaims([]));
    },
    [page, status],
  );

  useEffect(() => {
    load();
  }, [load]);

  const review = async () => {
    if (!reviewing) return;
    setBusy(true);
    try {
      const res = await api.post<{ message: string }>(`/api/admin/claims/${reviewing.id}/review`, { decision, note });
      toast.success(res.message);
      setReviewing(null);
      setNote('');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Review failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Claims <span className="text-sm font-normal text-slate-400">({total})</span>
        </h2>
        <Select className="w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="more_info">More info</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="escalated">Escalated</option>
          <option value="closed">Closed</option>
          <option value="returned">Returned</option>
        </Select>
      </div>

      <div className="card mt-6 overflow-x-auto">
        {claims === null ? (
          <Skeleton className="m-4 h-64" />
        ) : claims.length === 0 ? (
          <EmptyState icon={<ScrollText className="size-10" />} title="No claims found" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="px-4 py-3 font-medium">Claim</th>
                <th className="px-4 py-3 font-medium">Claimant</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {claims.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.item_cover ? (
                        <img src={resolveImageUrl(c.item_cover)} alt="" className="size-10 rounded-lg object-cover" />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-300 dark:bg-slate-800">
                          <ScrollText className="size-4" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{c.item_name ?? 'Item'}</p>
                        <p className="text-xs text-slate-500">{c.uid}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={c.claimant_name} url={c.claimant_avatar} size={28} />
                      <span className="text-slate-700 dark:text-slate-200">{c.claimant_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge kind="risk" value={c.risk_level} /></td>
                  <td className="px-4 py-3"><Badge kind="claim" value={c.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Link to={`/claims/${c.id}`} className="btn-ghost px-2.5 py-1.5 text-xs">
                        View
                      </Link>
                      {(c.status === 'pending' || c.status === 'more_info' || c.status === 'escalated') && (
                        <Button size="sm" variant="secondary" onClick={() => { setReviewing(c); setDecision('approve'); setNote(''); }}>
                          Review
                        </Button>
                      )}
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

      <Modal open={Boolean(reviewing)} onClose={() => setReviewing(null)} title={`Review claim ${reviewing?.uid ?? ''}`}>
        <div className="space-y-4">
          {reviewing?.risk_level === 'high' && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
              This is a <strong>high-risk</strong> claim — verify the answers carefully before approving.
            </p>
          )}
          <div>
            <label className="label-base">Decision</label>
            <Select value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}>
              <option value="approve">Approve claim</option>
              <option value="reject">Reject claim</option>
              <option value="request_info">Request more information</option>
            </Select>
          </div>
          <div>
            <label className="label-base">Note (visible to the claimant)</label>
            <Textarea placeholder={decision === 'reject' ? 'Explain why this claim was rejected…' : 'Optional note…'} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button loading={busy} onClick={review}>
              {decision === 'approve' ? 'Approve' : decision === 'reject' ? 'Reject' : 'Request info'}
            </Button>
            <Button variant="secondary" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}