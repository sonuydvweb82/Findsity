import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Eye,
  Flag,
  MapPin,
  MessageCircle,
  PackageX,
  ShieldCheck,
  Sparkles,
  Clock,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Item, MatchResult } from '../types';
import { Badge, TypeBadge } from '../components/ui/Badge';
import { Avatar, EmptyState, Spinner } from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ClaimForm from '../components/claims/ClaimForm';
import ItemImage from '../components/items/ItemImage';
import { formatDate, titleCase } from '../utils/format';
import { resolveImageUrl } from '../utils/image';

export default function ItemDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [reportReason, setReportReason] = useState('fake_listing');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ item: Item }>(`/api/items/${id}`)
      .then((r) => setItem(r.item))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <PackageX className="mx-auto size-12 text-slate-300" />
        <h1 className="font-display mt-4 text-xl font-bold text-slate-900 dark:text-white">Item not found</h1>
        <p className="mt-2 text-sm text-slate-500">It may have been removed.</p>
        <Link to="/find" className="btn-primary mt-6">
          Back to listings
        </Link>
      </div>
    );
  }

  const images = item.images?.length
    ? item.images.map((img) => ({ ...img, url: resolveImageUrl(img.url) ?? '' }))
    : item.cover_url
      ? [{ url: resolveImageUrl(item.cover_url) ?? '', position: 0 }]
      : [];
  const isOwner = user && item.user_id === user.id;
  const canClaim = user && !isOwner && item.type === 'found' && (item.status === 'found' || item.status === 'return_pending');

  const submitReport = async () => {
    setReporting(true);
    try {
      await api.post('/api/reports', { targetType: 'item', targetId: item.id, reason: reportReason, details: reportDetails });
      toast.success('Report submitted. An administrator will review it.');
      setReportOpen(false);
      setReportDetails('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not submit report');
    } finally {
      setReporting(false);
    }
  };

  const startConversation = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post<{ conversation: { id: string } }>('/api/conversations', { itemId: item.id });
      navigate(`/messages/${res.conversation.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not start conversation');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Images */}
        <div className="lg:col-span-3">
          <div className="card overflow-hidden">
            {images.length > 0 ? (
              <>
                <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                  <img src={images[activeImage]?.url} alt={item.name} className="size-full object-cover" />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-3">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImage(i)}
                        className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                          i === activeImage ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img.url} alt="" className="size-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600">
                <PackageX className="size-14" />
              </div>
            )}
          </div>

          <div className="card mt-6 p-6">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Details</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ['Category', item.category_name ? titleCase(item.category_name) : '—'],
                ['Brand', item.brand || '—'],
                ['Model', item.model || '—'],
                ['Colour', item.color || '—'],
                ['Where', item.location || '—'],
                ['When', item.date_incident ? formatDate(item.date_incident) : '—'],
                ['Time (approx)', item.time_approx || '—'],
                ['Reward', item.reward || 'None mentioned'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-slate-100 pb-2 dark:border-slate-800">
                  <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
                  <dd className="text-right font-medium text-slate-900 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>
            {item.description && (
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
            )}
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Eye className="size-3.5" /> Viewed {item.view_count} times
            </div>
          </div>

          {isOwner && item.type === 'lost' && (
            <div className="card mt-6 p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
                <Sparkles className="size-5 text-brand-500" /> Possible matches
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Items found on campus that might be yours. We only show safe, public information.
              </p>
              <div className="mt-4 space-y-3">
                {item.possibleMatches && item.possibleMatches.length > 0 ? (
                  item.possibleMatches.map((m: MatchResult) => (
                    <Link key={m.item.id} to={`/items/${m.item.id}`} className="card flex items-center gap-4 p-4 transition hover:shadow-md">
                      <ItemImage src={m.item.cover_url} alt="" categorySlug={m.item.category_slug} className="size-14 shrink-0 rounded-lg" iconSize={13} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900 dark:text-white">{m.item.name}</p>
                        <p className="truncate text-xs text-slate-500">{m.item.location || 'Campus'}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {m.reasons.slice(0, 3).map((r) => (
                            <span key={r} className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl font-bold text-brand-600 dark:text-brand-400">{m.score}%</p>
                        <p className="text-xs text-slate-400">match</p>
                        <ChevronRight className="ml-auto mt-1 size-4 text-slate-300" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <EmptyState
                    icon={<Sparkles className="size-8" />}
                    title="No matches yet"
                    description="We'll notify you the moment something similar is reported as found."
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex gap-2">
                  <TypeBadge type={item.type} />
                  {item.status !== (item.type === 'found' ? 'found' : 'lost') && <Badge kind="item" value={item.status} />}
                </div>
                <h1 className="font-display mt-3 text-2xl font-bold text-slate-900 dark:text-white">{item.name}</h1>
                <p className="mt-1 text-sm text-slate-500">{item.uid}</p>
              </div>
              <button onClick={() => setReportOpen(true)} className="btn-ghost p-2 text-slate-400" aria-label="Report this listing">
                <Flag className="size-5" />
              </button>
            </div>

            {item.poster && (
              <Link
                to={`/profile/${item.poster.id}`}
                className="mt-5 flex items-center gap-3 rounded-lg bg-slate-50 p-3 transition hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
              >
                <Avatar name={item.poster.name} url={item.poster.avatarUrl} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 transition hover:text-brand-600 dark:text-white dark:hover:text-brand-400">
                    {item.poster.name}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {item.poster.college} · ID {item.poster.studentId ?? '—'}
                  </p>
                </div>
              </Link>
            )}

            <div className="mt-5 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
              {item.location && (
                <p className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-brand-500" /> {item.location}
                  {item.current_location && ` · now at ${item.current_location}`}
                </p>
              )}
              {item.date_incident && (
                <p className="flex items-center gap-2">
                  <CalendarDays className="size-4 shrink-0 text-brand-500" /> {formatDate(item.date_incident)}
                  {item.time_approx && `, ${item.time_approx}`}
                </p>
              )}
              <p className="flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-brand-500" /> Posted {formatDate(item.created_at)}
              </p>
            </div>

            <div className="mt-6 space-y-2.5">
              {isOwner ? (
                <>
                  <Link to={`/items/${item.id}/edit`} className="btn-secondary w-full">
                    Edit listing
                  </Link>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => navigate(`/claims?tab=finder`)}
                  >
                    View claims ({item.claims?.length ?? 0})
                  </Button>
                </>
              ) : canClaim ? (
                <>
                  <Button className="w-full" onClick={() => setClaimOpen(true)}>
                    <ShieldCheck className="size-4" /> This is mine — claim it
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={startConversation}>
                    <MessageCircle className="size-4" /> Message the poster
                  </Button>
                </>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                  {user ? 'This item is no longer claimable.' : 'Log in to claim this item.'}
                </div>
              )}
              {!user && (
                <p className="text-center text-xs text-slate-400">
                  <Link to="/login" className="font-medium text-brand-600 dark:text-brand-400">
                    Log in
                  </Link>{' '}
                  to claim items and message others.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Claim modal */}
      <Modal open={claimOpen} onClose={() => setClaimOpen(false)} title={`Claim "${item.name}"`}>
        <ClaimForm
          itemId={item.id}
          onSuccess={() => {
            setClaimOpen(false);
            load();
            toast.success('Your claim was submitted for review.');
          }}
          onCancel={() => setClaimOpen(false)}
        />
      </Modal>

      {/* Report modal */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report this listing">
        <div className="space-y-4">
          <label className="label-base">
            Reason
            <select className="input-base mt-1" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
              <option value="fake_listing">Fake or misleading listing</option>
              <option value="incorrect_info">Incorrect information</option>
              <option value="scam">Suspected scam</option>
              <option value="spam">Spam</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="other">Something else</option>
            </select>
          </label>
          <label className="label-base">
            Details (optional)
            <textarea
              className="input-base mt-1 min-h-24"
              placeholder="Anything that helps our moderators…"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />
          </label>
          <div className="flex gap-3">
            <Button onClick={submitReport} loading={reporting}>
              Submit report
            </Button>
            <Button variant="secondary" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}