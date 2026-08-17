import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, PackageSearch, RotateCcw, ShieldCheck, UserRound } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { PublicProfile } from '../types';
import { Avatar, EmptyState, Skeleton } from '../components/ui/Avatar';
import { formatDate } from '../utils/format';

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    api
      .get<{ user: PublicProfile }>(`/api/users/${userId}`)
      .then((r) => setProfile(r.user))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof ApiError ? err.message : 'Could not load profile');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [userId]);

  const isOwn = Boolean(user && profile && user.id === profile.id);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mt-10">
          <EmptyState
            icon={<UserRound className="size-10" />}
            title="User not found"
            description="This profile doesn't exist or may have been removed."
            action={
              <Link to="/find" className="btn-primary">
                Browse items
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mt-10">
          <EmptyState
            icon={<PackageSearch className="size-10" />}
            title="Could not load this profile"
            description={error ?? 'Something went wrong while loading this profile.'}
            action={
              <button onClick={load} className="btn-primary">
                <RotateCcw className="size-4" /> Try again
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link to="/find" className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="size-4" /> Back to items
      </Link>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <Avatar name={profile.fullName} url={profile.avatarUrl} size={72} />
          <div className="min-w-0">
            <h1 className="font-display truncate text-2xl font-bold text-slate-900 dark:text-white">{profile.fullName}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {profile.college || 'Member'}
              {profile.studentIdMasked && ` · ID ${profile.studentIdMasked}`}
            </p>
            {isOwn && (
              <Link to="/profile" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                <ShieldCheck className="size-3.5" /> This is you — edit your profile
              </Link>
            )}
          </div>
        </div>

        {profile.bio && <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">{profile.bio}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-800/60">
            <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">{profile.successfulReturns}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">successful returns</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-800/60">
            <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">{profile.activeListings}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">active listings</p>
          </div>
        </div>

        <p className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400 dark:border-slate-800">
          <CalendarDays className="size-3.5" /> Member since {formatDate(profile.joinedAt)}
        </p>
      </div>
    </div>
  );
}