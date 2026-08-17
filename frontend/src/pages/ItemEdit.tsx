import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { api, ApiError } from '../services/api';
import { Field, Input, Select, Textarea } from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Spinner } from '../components/ui/Avatar';
import type { Item } from '../types';

const CATEGORIES = [
  { id: 1, name: 'Electronics', slug: 'electronics' },
  { id: 2, name: 'Phones & Tablets', slug: 'phones' },
  { id: 3, name: 'Wallets & Cards', slug: 'wallets' },
  { id: 4, name: 'ID Cards', slug: 'id-cards' },
  { id: 5, name: 'Keys', slug: 'keys' },
  { id: 6, name: 'Books & Stationery', slug: 'books' },
  { id: 7, name: 'Clothing & Accessories', slug: 'clothing' },
  { id: 8, name: 'Bottles & Containers', slug: 'bottles' },
  { id: 9, name: 'Sports & Fitness', slug: 'sports' },
  { id: 10, name: 'Other', slug: 'other' },
];

export default function ItemEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [notOwner, setNotOwner] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('found');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ item: Item }>(`/api/items/${id}`)
      .then((r) => {
        const i = r.item;
        setItem(i);
        setStatus(i.status);
        setForm({
          name: i.name ?? '',
          categoryId: String(i.category_id ?? 1),
          brand: i.brand ?? '',
          model: i.model ?? '',
          color: i.color ?? '',
          dateIncident: i.date_incident ?? '',
          timeApprox: i.time_approx ?? '',
          location: i.location ?? '',
          locationDetails: i.location_details ?? '',
          currentLocation: i.current_location ?? '',
          description: i.description ?? '',
          privateIdentifyingFeatures: i.private_identifying_features ?? '',
          reward: i.reward ?? '',
        });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setNotOwner(true);
        else setError('Could not load the item');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(form)) {
        if (k === 'categoryId') fd.set(k, v);
        else fd.set(k, v);
      }
      fd.set('status', status);
      const res = await api.put<{ message: string }>(`/api/items/${id}`, fd);
      toast.success(res.message);
      navigate(`/items/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (notOwner) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Not your item</h1>
        <p className="mt-2 text-sm text-slate-500">You can only edit your own listings.</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">{error ?? 'Item not found'}</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Edit listing</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.uid}</p>

      <form onSubmit={submit} className="card mt-8 space-y-5 p-6">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </div>
        )}
        <Field label="Item name">
          <Input required value={form.name ?? ''} onChange={set('name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={form.categoryId ?? '1'} onChange={set('categoryId')}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {item.type === 'found' ? (
                <>
                  <option value="found">Available — still looking for owner</option>
                  <option value="return_pending">Return in progress</option>
                  <option value="returned">Returned to owner</option>
                </>
              ) : (
                <>
                  <option value="lost">Still lost</option>
                  <option value="returned">Found & returned</option>
                </>
              )}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Brand"><Input value={form.brand ?? ''} onChange={set('brand')} /></Field>
          <Field label="Model"><Input value={form.model ?? ''} onChange={set('model')} /></Field>
          <Field label="Colour"><Input value={form.color ?? ''} onChange={set('color')} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={item.type === 'lost' ? 'Lost on' : 'Found on'}>
            <Input type="date" value={form.dateIncident ?? ''} onChange={set('dateIncident')} />
          </Field>
          <Field label="Approx. time"><Input value={form.timeApprox ?? ''} onChange={set('timeApprox')} /></Field>
          <Field label="Location"><Input value={form.location ?? ''} onChange={set('location')} /></Field>
        </div>
        <Field label="Where exactly?">
          <Input value={form.locationDetails ?? ''} onChange={set('locationDetails')} />
        </Field>
        {item.type === 'found' && (
          <Field label="Where is it now?">
            <Input value={form.currentLocation ?? ''} onChange={set('currentLocation')} />
          </Field>
        )}
        <Field label="Description (public)">
          <Textarea value={form.description ?? ''} onChange={set('description')} />
        </Field>
        {item.type === 'found' && (
          <Field label="Private identifying features" hint="Only you and admins can see this.">
            <Textarea value={form.privateIdentifyingFeatures ?? ''} onChange={set('privateIdentifyingFeatures')} />
          </Field>
        )}
        <Field label="Reward">
          <Input value={form.reward ?? ''} onChange={set('reward')} />
        </Field>
        <div className="flex gap-3">
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/items/${id}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}