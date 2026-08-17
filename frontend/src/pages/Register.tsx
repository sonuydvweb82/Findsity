import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, Search, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api';
import { Field, Input } from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    college: '',
    studentId: '',
    password: '',
    confirmPassword: '',
  });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, studentId: form.studentId || undefined });
      toast.success('Account created — welcome to Findsity!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg">
          <UserRound className="size-6" />
        </span>
        <h1 className="font-display mt-4 text-2xl font-bold text-slate-900 dark:text-white">Join Findsity</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Help your campus community reunite with lost belongings.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </div>
        )}
        <Field label="Full name">
          <Input required placeholder="e.g. Aarav Mehta" value={form.fullName} onChange={set('fullName')} autoComplete="name" />
        </Field>
        <Field label="Email">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              type="email"
              required
              placeholder="you@campus.edu"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
            />
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="College / University">
            <Input required placeholder="e.g. City College" value={form.college} onChange={set('college')} />
          </Field>
          <Field label="Student ID (optional)" hint="Masked publicly — never shown in full.">
            <Input placeholder="e.g. 2026-1234" value={form.studentId} onChange={set('studentId')} />
          </Field>
        </div>
        <Field label="Password" hint="8+ characters with a number, uppercase and lowercase letter.">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9 pr-10"
              type={show ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
            </button>
          </div>
        </Field>
        <Field label="Confirm password">
          <Input
            type={show ? 'text' : 'password'}
            required
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            autoComplete="new-password"
          />
        </Field>
        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <ShieldCheck className="size-3.5" /> Your student ID is never displayed in full to other users.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Log in
        </Link>
      </p>
    </div>
  );
}