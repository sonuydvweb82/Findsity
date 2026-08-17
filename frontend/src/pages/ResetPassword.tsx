import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { Field, Input } from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password, confirmPassword: confirm });
      toast.success('Password reset! You can now log in.');
      navigate('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 text-center">
        <KeyRound className="mx-auto size-10 text-slate-300" />
        <h1 className="font-display mt-4 text-xl font-bold text-slate-900 dark:text-white">Invalid reset link</h1>
        <p className="mt-2 text-sm text-slate-500">This link is missing its token. Request a new one.</p>
        <Link to="/forgot-password" className="btn-primary mx-auto mt-6">
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg">
          <KeyRound className="size-6" />
        </span>
        <h1 className="font-display mt-4 text-2xl font-bold text-slate-900 dark:text-white">Choose a new password</h1>
      </div>
      <form onSubmit={submit} className="card space-y-4 p-6">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </div>
        )}
        <Field label="New password" hint="8+ characters with a number, uppercase and lowercase letter.">
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button type="submit" loading={loading} className="w-full">
          Reset password
        </Button>
      </form>
    </div>
  );
}