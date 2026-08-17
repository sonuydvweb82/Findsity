import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileQuestion,
  Handshake,
  HelpCircle,
  Lock,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { ClaimDetail, ClaimStatus } from '../types';
import { Badge } from '../components/ui/Badge';
import { Avatar, Spinner } from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Field, Input, Textarea } from '../components/ui/Input';
import { formatDate, formatDateTime, timeAgo } from '../utils/format';

export default function ClaimDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverForm, setHandoverForm] = useState({ pickupLocation: '', scheduledDate: '', scheduledTime: '', notes: '' });
  const [startConv, setStartConv] = useState(false);
  const [convMsg, setConvMsg] = useState('');
  const [convBusy, setConvBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get<{ claim: ClaimDetail }>(`/api/claims/${id}`)
      .then((r) => setClaim(r.claim))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load claim'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (path: string, body?: Record<string, unknown>, successMsg?: string) => {
    setBusy(true);
    try {
      const res = await api.post<{ message: string }>(path, body ?? {});
      toast.success(successMsg ?? res.message);
      setNotes('');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const openHandoverForm = () => {
    setHandoverForm({
      pickupLocation: claim?.handover?.pickup_location ?? '',
      scheduledDate: claim?.handover?.scheduled_date ?? '',
      scheduledTime: claim?.handover?.scheduled_time ?? '',
      notes: claim?.handover?.notes ?? '',
    });
    setHandoverOpen(true);
  };

  const startConversation = async () => {
    if (!claim) return;
    setConvBusy(true);
    try {
      const res = await api.post<{ conversation: { id: string } }>('/api/conversations', {
        itemId: claim.item_id,
        initialMessage: convMsg || undefined,
      });
      setStartConv(false);
      window.location.href = `/messages/${res.conversation.id}`;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not start conversation');
    } finally {
      setConvBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Claim not found</h1>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <Link to="/claims" className="btn-primary mt-6">
          Back to claims
        </Link>
      </div>
    );
  }

  const isFinder = claim.viewerRole === 'finder';
  const isClaimant = claim.viewerRole === 'claimant';
  const isAdmin = user?.role === 'admin';
  const canReview = Boolean(claim.canReview) || isAdmin;

  const handoverStage: Record<string, number> = { pending: 0, proposed: 1, scheduled: 2, handed_over: 3, completed: 4 };
  const stage = claim.handover ? (handoverStage[claim.handover.status] ?? 0) : 0;
  const h = claim.handover;

  const flowValue: Record<ClaimStatus, number> = {
    pending: 1,
    more_info: 1,
    escalated: 1,
    approved: 2,
    closed: 1,
    rejected: 0,
    returned: 4,
  };

  const steps = [
    { label: 'Under review', active: flowValue[claim.status] >= 1, done: flowValue[claim.status] > 1 },
    { label: 'Approved', active: flowValue[claim.status] >= 2, done: claim.status === 'returned' || stage >= 1 },
    { label: 'Handover', active: claim.status === 'approved' && stage >= 1, done: claim.status === 'returned' || stage >= 4 },
    { label: 'Returned', active: claim.status === 'returned', done: claim.status === 'returned' },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/claims" className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="size-4" /> All claims
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{claim.item_name}</h1>
            <Badge kind="claim" value={claim.status} />
            <Badge kind="risk" value={claim.risk_level} />
          </div>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Claim {claim.uid} · submitted {timeAgo(claim.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          {canReview && claim.status === 'pending' && (
            <>
              <Button
                variant="danger"
                size="sm"
                loading={busy}
                onClick={() => act(`/api/claims/${claim.id}/reject`, { notes }, 'Claim rejected')}
              >
                Reject
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={busy}
                onClick={() => act(`/api/claims/${claim.id}/request-info`, { notes }, 'More information requested')}
              >
                <FileQuestion className="size-4" /> Ask for more
              </Button>
              <Button size="sm" loading={busy} onClick={() => act(`/api/claims/${claim.id}/approve`, {}, 'Claim approved')}>
                <CheckCircle2 className="size-4" /> Approve claim
              </Button>
            </>
          )}
          {canReview && claim.status === 'more_info' && (
            <Button size="sm" loading={busy} onClick={() => act(`/api/claims/${claim.id}/approve`, {}, 'Claim approved')}>
              <CheckCircle2 className="size-4" /> Approve claim
            </Button>
          )}
          {claim.status === 'pending' && (isClaimant || isAdmin) && (
            <Button variant="secondary" size="sm" loading={busy} onClick={() => act(`/api/claims/${claim.id}/escalate`, {}, 'Escalated to admin')}>
              Escalate to admin
            </Button>
          )}
        </div>
      </div>

      {/* Status stepper */}
      <div className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold ${
                    s.active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                  }`}
                >
                  {s.done ? <CheckCircle2 className="size-5" /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${s.active ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-3 mb-5 h-0.5 flex-1 rounded ${s.done ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>
        {claim.status === 'rejected' && (
          <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
            This claim was rejected. {claim.admin_notes ? `Reason: ${claim.admin_notes}` : 'Contact the finder for details.'}
          </p>
        )}
        {claim.status === 'escalated' && (
          <p className="mt-4 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
            This claim was escalated. An administrator is reviewing it.
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Claim details */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Claim details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ['Lost on', formatDate(claim.lost_date)],
              ['Lost at', claim.lost_location || '—'],
              ['Brand', claim.brand || '—'],
              ['Model', claim.model || '—'],
              ['Colour', claim.color || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
                <dd className="text-right font-medium text-slate-900 dark:text-white">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Lock className="size-3.5" /> Private verification answers
            </p>
            <div className="mt-3 space-y-3">
              {claim.answers && claim.answers.length > 0 ? (
                claim.answers.map((a) => (
                  <div key={a.question}>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{a.question}</p>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{a.answer}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No verification answers on this claim.</p>
              )}
              {claim.unique_feature && (
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Unique feature described</p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{claim.unique_feature}</p>
                </div>
              )}
              {claim.proof_of_ownership && (
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Proof of ownership</p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{claim.proof_of_ownership}</p>
                </div>
              )}
              {claim.additional_info && (
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Additional info</p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{claim.additional_info}</p>
                </div>
              )}
            </div>
          </div>

          {canReview && (
            <div className="mt-5">
              <label className="label-base">Review note (visible to admin only)</label>
              <Textarea placeholder="Your assessment of this claim…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}

          {isClaimant && claim.finder_notes && (
            <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
              <p className="font-medium text-slate-700 dark:text-slate-300">Note from the finder</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">{claim.finder_notes}</p>
            </div>
          )}
        </div>

        {/* Claimant + handover */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {isClaimant ? 'The finder' : 'The claimant'}
            </h2>
            <div className="mt-4 flex items-center gap-3">
              {claim.claimant?.id ? (
                <Link to={`/profile/${claim.claimant.id}`} className="flex shrink-0 items-center gap-3 transition hover:opacity-80" aria-label={`View ${claim.claimant_name ?? 'claimant'}'s profile`}>
                  <Avatar name={claim.claimant_name} url={claim.claimant_avatar} size={44} />
                </Link>
              ) : (
                <Avatar name={claim.claimant_name} url={claim.claimant_avatar} size={44} />
              )}
              <div className="min-w-0">
                {claim.claimant?.id ? (
                  <Link
                    to={`/profile/${claim.claimant.id}`}
                    className="block truncate font-semibold text-slate-900 transition hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
                  >
                    {claim.claimant_name ?? 'Unknown'}
                  </Link>
                ) : (
                  <p className="font-semibold text-slate-900 dark:text-white">{claim.claimant_name ?? 'Unknown'}</p>
                )}
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {claim.claimant_college ?? ''} · ID {claim.claimant_student_id ?? 'masked'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="font-display text-xl font-bold text-slate-900 dark:text-white">{claim.claimant?.successfulReturns ?? 0}</p>
                <p className="text-xs text-slate-500">successful returns</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="font-display text-xl font-bold text-slate-900 dark:text-white">{claim.claimant?.totalItems ?? 0}</p>
                <p className="text-xs text-slate-500">listings</p>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="secondary" className="w-full" onClick={() => setStartConv(true)}>
                <MessageCircle className="size-4" /> Message {isClaimant ? 'the finder' : 'the claimant'}
              </Button>
            </div>
          </div>

          {/* Handover */}
          <div className="card p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
              <Handshake className="size-5 text-brand-500" /> Handover
            </h2>
            {claim.status !== 'approved' && claim.status !== 'returned' ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Once a claim is approved, the finder arranges an in-person handover here.
              </p>
            ) : stage === 0 || !h ? (
              <div className="mt-4">
                <div className="space-y-3 text-sm">
                  <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <MapPin className="size-4 text-brand-500" /> Location: TBD
                  </p>
                  <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <CalendarDays className="size-4 text-brand-500" /> Date: TBD
                  </p>
                </div>
                {h?.declined_at && isFinder && (
                  <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                    The claimant declined the previous proposal. Propose a new time.
                  </p>
                )}
                <div className="mt-4">
                  {isFinder ? (
                    <Button className="w-full" onClick={openHandoverForm}>
                      <Handshake className="size-4" /> Arrange handover
                    </Button>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">The finder will arrange the handover soon.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4">
                {stage >= 4 ? (
                  <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckCircle2 className="size-5" /> Item returned to the claimant
                  </p>
                ) : (
                  <p
                    className={`flex items-center gap-2 text-sm font-semibold ${
                      stage >= 2 ? 'text-emerald-700 dark:text-emerald-400' : 'text-brand-600 dark:text-brand-400'
                    }`}
                  >
                    {stage === 1 && 'Handover proposed'}
                    {stage === 2 && 'Handover scheduled'}
                    {stage === 3 && 'Awaiting confirmation'}
                  </p>
                )}
                <div className="mt-3 space-y-3 text-sm">
                  <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <MapPin className="size-4 text-brand-500" /> {h?.pickup_location || 'Location TBD'}
                  </p>
                  <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <CalendarDays className="size-4 text-brand-500" /> {h?.scheduled_date ? formatDate(h.scheduled_date) : 'Date TBD'}
                  </p>
                  <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Clock className="size-4 text-brand-500" /> {h?.scheduled_time || 'Time TBD'}
                  </p>
                  {h?.notes && <p className="text-slate-500 dark:text-slate-400">{h.notes}</p>}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div
                    className={`rounded-lg p-3 text-center text-xs ${
                      stage >= 2 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-50 text-slate-400 dark:bg-slate-800/60'
                    }`}
                  >
                    {stage >= 4 ? '✓ Finder confirmed' : stage >= 2 ? 'Finder: Confirmed' : stage === 1 ? 'Finder: Proposed' : 'Finder: Pending'}
                  </div>
                  <div
                    className={`rounded-lg p-3 text-center text-xs ${
                      stage >= 2 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-50 text-slate-400 dark:bg-slate-800/60'
                    }`}
                  >
                    {stage >= 4 ? '✓ Claimant confirmed' : stage >= 2 ? 'Claimant: Confirmed' : 'Claimant: Pending'}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {stage === 1 && isClaimant && (
                    <>
                      <Button className="w-full" loading={busy} onClick={() => act(`/api/claims/${claim.id}/handover/claimant-accept`, {}, 'Handover confirmed')}>
                        <CheckCircle2 className="size-4" /> Confirm handover
                      </Button>
                      <Button variant="secondary" className="w-full" loading={busy} onClick={() => act(`/api/claims/${claim.id}/handover/claimant-decline`, {}, 'Handover declined')}>
                        Decline / suggest another time
                      </Button>
                    </>
                  )}
                  {stage === 2 && isFinder && (
                    <Button className="w-full" loading={busy} onClick={() => act(`/api/claims/${claim.id}/handover/finder-confirm`, {}, 'Handover confirmed')}>
                      <Handshake className="size-4" /> Mark item handed over
                    </Button>
                  )}
                  {stage === 3 && isClaimant && (
                    <Button className="w-full" loading={busy} onClick={() => act(`/api/claims/${claim.id}/handover/claimant-confirm`, {}, 'Return confirmed')}>
                      <CheckCircle2 className="size-4" /> I received the item — confirm receipt
                    </Button>
                  )}
                  {(stage === 1 && isFinder) || (stage === 2 && isClaimant) || (stage === 3 && isFinder) ? (
                    <p className="rounded-lg bg-slate-50 px-4 py-3 text-center text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      {stage === 1 && 'Waiting for the claimant to confirm the proposed handover.'}
                      {stage === 2 && 'The finder will hand the item over at the scheduled time.'}
                      {stage === 3 && 'Handover complete — waiting for the claimant to confirm receipt.'}
                    </p>
                  ) : null}
                  {isAdmin && claim.status === 'approved' && (
                    <p className="rounded-lg bg-slate-50 px-4 py-3 text-center text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      Admins can review handover progress but cannot perform handover actions.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Item info */}
          <Link to={`/items/${claim.item_id}`} className="card flex items-center gap-4 p-4 transition hover:shadow-md">
            {claim.item_cover ? (
              <img src={claim.item_cover} alt="" className="size-14 rounded-lg object-cover" />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-lg bg-slate-100 text-slate-300 dark:bg-slate-800">
                <HelpCircle className="size-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900 dark:text-white">{claim.item_name}</p>
              <p className="text-xs text-slate-500">{claim.item_uid} · {claim.item_status}</p>
            </div>
            <ChevronRight className="size-4 text-slate-300" />
          </Link>
        </div>
      </div>

      {/* Handover modal */}
      <Modal open={handoverOpen} onClose={() => setHandoverOpen(false)} title="Arrange handover">
        <div className="space-y-4">
          <Field label="Pickup location">
            <Input required placeholder="e.g. Main Library entrance" value={handoverForm.pickupLocation} onChange={(e) => setHandoverForm((f) => ({ ...f, pickupLocation: e.target.value }))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" required value={handoverForm.scheduledDate} onChange={(e) => setHandoverForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
            </Field>
            <Field label="Time">
              <Input type="time" value={handoverForm.scheduledTime} onChange={(e) => setHandoverForm((f) => ({ ...f, scheduledTime: e.target.value }))} />
            </Field>
          </div>
          <Field label="Notes for the claimant">
            <Textarea placeholder="e.g. Bring your student ID" value={handoverForm.notes} onChange={(e) => setHandoverForm((f) => ({ ...f, notes: e.target.value }))} />
          </Field>
          <div className="flex gap-3">
            <Button
              loading={busy}
              onClick={() => {
                if (!handoverForm.pickupLocation.trim() || !handoverForm.scheduledDate) {
                  toast.error('Enter a pickup location and a date');
                  return;
                }
                void act(
                  `/api/claims/${claim.id}/handover`,
                  { pickupLocation: handoverForm.pickupLocation, scheduledDate: handoverForm.scheduledDate, scheduledTime: handoverForm.scheduledTime, notes: handoverForm.notes },
                  'Handover proposed',
                ).then(() => setHandoverOpen(false));
              }}
            >
              Save handover
            </Button>
            <Button variant="secondary" onClick={() => setHandoverOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Message modal */}
      <Modal open={startConv} onClose={() => setStartConv(false)} title="Send a message">
        <div className="space-y-4">
          <Field label="Message">
            <Textarea placeholder="Hi! I wanted to talk about the item…" value={convMsg} onChange={(e) => setConvMsg(e.target.value)} />
          </Field>
          <div className="flex gap-3">
            <Button onClick={startConversation} loading={convBusy}>
              Start conversation
            </Button>
            <Button variant="secondary" onClick={() => setStartConv(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}