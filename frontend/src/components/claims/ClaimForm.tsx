import { useState, type FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { Lock } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { Field, Input, Textarea } from '../ui/Input';
import Button from '../ui/Button';
import type { ClaimSummary } from '../../types';

interface Props {
  itemId: string;
  onSuccess: (claim: ClaimSummary) => void;
  onCancel: () => void;
}

export default function ClaimForm({ itemId, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({
    lostDate: '',
    lostLocation: '',
    brand: '',
    model: '',
    color: '',
    uniqueFeature: '',
    proofOfOwnership: '',
    additionalInfo: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ claim: ClaimSummary; message: string }>(`/api/items/${itemId}/claims`, form);
      toast.success(res.message);
      onSuccess(res.claim);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        <span>
          <strong>Only the true owner can answer these.</strong> Your answers are only visible to the person who found the
          item and to administrators. Public listings never show your student ID.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="When did you lose it?">
          <Input type="date" required value={form.lostDate} onChange={set('lostDate')} />
        </Field>
        <Field label="Where did you lose it?">
          <Input placeholder="e.g. Library, 3rd floor" required value={form.lostLocation} onChange={set('lostLocation')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Brand">
          <Input placeholder="e.g. Sony" value={form.brand} onChange={set('brand')} />
        </Field>
        <Field label="Model">
          <Input placeholder="e.g. WH-1000XM4" value={form.model} onChange={set('model')} />
        </Field>
        <Field label="Colour">
          <Input placeholder="e.g. Black" value={form.color} onChange={set('color')} />
        </Field>
      </div>

      <Field
        label="Unique feature (not visible in the listing)"
        hint="Something only you would know — a scratch, a sticker, a custom case. Used to verify ownership."
      >
        <Textarea required placeholder="e.g. A red keychain charm, small dent on the bottom-left corner…" value={form.uniqueFeature} onChange={set('uniqueFeature')} />
      </Field>

      <Field label="Proof of ownership (optional)" hint="Receipt, IMEI, serial number, engraving…">
        <Textarea placeholder="e.g. I have the purchase receipt and the serial number" value={form.proofOfOwnership} onChange={set('proofOfOwnership')} />
      </Field>

      <Field label="Anything else?">
        <Textarea placeholder="Any extra details that help prove it's yours" value={form.additionalInfo} onChange={set('additionalInfo')} />
      </Field>

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading}>
          Submit claim
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}