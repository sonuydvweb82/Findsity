import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { KeyRound, Mail } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { Field, Input } from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ message: string; devResetUrl?: string }>('/api/auth/forgot-password', { email: email.trim() });
      setSent(true);
      if (res.devResetUrl) setDevUrl(res.devResetUrl);
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg">
          <KeyRound className="size-6" />
        </span>
        <h1 className="font-display mt-4 text-2xl font-bold text-slate-900 dark:text-white">Reset your password</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      {sent ? (
        <div className="card p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Mail className="size-5" />
          </div>
          <h2 className="mt-4 font-semibold text-slate-900 dark:text-white">Check your inbox</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
          </p>
          {devUrl && (
            <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-left text-xs dark:border-brand-500/30 dark:bg-brand-500/10">
              <p className="mb-1 font-semibold text-brand-700 dark:text-brand-300">Development mode (no email server)</p>
              <a href={devUrl} className="break-all text-brand-600 underline dark:text-brand-400">
                {devUrl}
              </a>
            </div>
          )}
          <Link to="/login" className="btn-secondary mt-5 w-full">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-4 p-6">
          <Field label="Email">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                type="email"
                required
                placeholder="you@campus.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </div>
  );
}