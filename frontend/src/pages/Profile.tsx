import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { Camera, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, ApiError } from '../services/api';
import { Field, Input, Textarea } from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { formatDate } from '../utils/format';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    college: user?.college ?? '',
    studentId: user?.studentId ?? '',
    bio: user?.bio ?? '',
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      if (avatar) fd.set('avatar', avatar);
      fd.set('fullName', form.fullName);
      fd.set('college', form.college);
      fd.set('studentId', form.studentId);
      fd.set('bio', form.bio);
      await api.put('/api/auth/profile', fd);
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Profile</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your public identity on Findsity.</p>

      <form onSubmit={submit} className="card mt-8 space-y-5 p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar name={user?.fullName} url={avatar ? URL.createObjectURL(avatar) : user?.avatarUrl} size={72} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-brand-600 text-white shadow hover:bg-brand-700"
              aria-label="Change avatar"
            >
              <Camera className="size-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{user?.fullName}</p>
            <p className="text-xs text-slate-500">
              Member since {formatDate(user?.createdAt)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input required value={form.fullName} onChange={set('fullName')} />
          </Field>
          <Field label="Email">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" value={user?.email ?? ''} disabled />
            </div>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="College / University">
            <Input required value={form.college} onChange={set('college')} />
          </Field>
          <Field label="Student ID" hint="Always masked publicly — never shown in full.">
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" value={form.studentId} onChange={set('studentId')} />
            </div>
          </Field>
        </div>
        <Field label="Bio" hint="A short line about you — visible on your listings.">
          <Textarea maxLength={500} value={form.bio ?? ''} onChange={set('bio')} />
        </Field>

        <div className="flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <UserRound className="size-3.5" /> Public profile — keep it clean
          </p>
          <Button type="submit" loading={loading}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}