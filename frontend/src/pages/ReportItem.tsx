import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ImagePlus, Lock, MapPin, PackageSearch, X } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { Field, Input, Select, Textarea } from '../components/ui/Input';
import Button from '../components/ui/Button';
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

interface Props {
  initialType: 'lost' | 'found';
}

export default function ReportItem({ initialType }: Props) {
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const navigate = useNavigate();
  const [type, setType] = useState<'lost' | 'found'>(initialType);
  const [form, setForm] = useState({
    name: '',
    categoryId: '1',
    brand: '',
    model: '',
    color: '',
    dateIncident: '',
    timeApprox: '',
    location: '',
    locationDetails: '',
    currentLocation: '',
    description: '',
    privateIdentifyingFeatures: '',
    reward: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('found');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, 6);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const removeFile = (i: number) => {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set('type', type);
      fd.set('name', form.name);
      fd.set('categoryId', form.categoryId);
      fd.set('brand', form.brand);
      fd.set('model', form.model);
      fd.set('color', form.color);
      fd.set('dateIncident', form.dateIncident);
      fd.set('timeApprox', form.timeApprox);
      fd.set('location', form.location);
      fd.set('locationDetails', form.locationDetails);
      fd.set('currentLocation', form.currentLocation);
      fd.set('description', form.description);
      fd.set('privateIdentifyingFeatures', form.privateIdentifyingFeatures);
      fd.set('reward', form.reward);
      for (const f of files) fd.append('images', f);
      if (editId) {
        const res = await api.put<{ message: string; item: Item }>(`/api/items/${editId}`, fd);
        toast.success(res.message);
        navigate(`/items/${editId}`);
      } else {
        const res = await api.post<{ message: string; item: Item }>('/api/items', fd);
        toast.success(res.message);
        navigate(`/items/${res.item.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
          {editId ? 'Edit listing' : type === 'found' ? 'Report a found item' : 'Report a lost item'}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {type === 'found'
            ? 'Great job! Help this item find its owner. You can mark identifying details as private.'
            : 'Tell us what you lost — the more details, the better the match.'}
        </p>
      </div>

      {/* Type toggle */}
      {!editId && (
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
          {(['lost', 'found'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                type === t
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {t === 'lost' ? 'I lost an item' : 'I found an item'}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="card space-y-5 p-6" noValidate>
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </div>
        )}

        <Field label="What is the item?">
          <Input required placeholder="e.g. Black JBL Tune 510BT headphones" value={form.name} onChange={set('name')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={form.categoryId} onChange={set('categoryId')}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Colour">
            <Input placeholder="e.g. Black" value={form.color} onChange={set('color')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand">
            <Input placeholder="e.g. JBL" value={form.brand} onChange={set('brand')} />
          </Field>
          <Field label="Model">
            <Input placeholder="e.g. Tune 510BT" value={form.model} onChange={set('model')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={type === 'lost' ? 'Lost on' : 'Found on'}>
            <Input type="date" value={form.dateIncident} onChange={set('dateIncident')} />
          </Field>
          <Field label="Approx. time">
            <Input placeholder="e.g. 4:30 pm" value={form.timeApprox} onChange={set('timeApprox')} />
          </Field>
          <Field label="Location">
            <Input placeholder="e.g. Library" value={form.location} onChange={set('location')} />
          </Field>
        </div>

        <Field label={type === 'lost' ? 'Where exactly?' : 'Where was it found?'}>
          <Input placeholder="e.g. 3rd floor, near the reading tables" value={form.locationDetails} onChange={set('locationDetails')} />
        </Field>

        {type === 'found' && (
          <Field label="Where is it now?" hint="e.g. with the campus security desk — so the owner knows where to collect it.">
            <Input placeholder="e.g. Security office, Block A" value={form.currentLocation} onChange={set('currentLocation')} />
          </Field>
        )}

        <Field label="Description" hint="Visible to everyone. No identifying marks here — those go in the private field below.">
          <Textarea placeholder="Condition, what it looks like, anything public…" value={form.description} onChange={set('description')} />
        </Field>

        {type === 'found' && (
          <Field
            label="Private identifying features"
            hint="Hidden from the public. Only you (and admins) see this — claimants must describe it to prove ownership."
          >
            <Textarea
              placeholder="e.g. Small scratch on the back, custom wallpaper"
              value={form.privateIdentifyingFeatures}
              onChange={set('privateIdentifyingFeatures')}
            />
          </Field>
        )}

        <Field label={type === 'found' ? 'Reward offered by owner (optional)' : 'Reward you can offer (optional)'}>
          <Input placeholder="e.g. ₹500" value={form.reward} onChange={set('reward')} />
        </Field>

        {/* Images */}
        <div>
          <label className="label-base">Photos (up to 6)</label>
          <div className="flex flex-wrap gap-3">
            {previews.map((p, i) => (
              <div key={i} className="relative size-24 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <img src={p} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-0.5 text-white hover:bg-slate-950"
                  aria-label="Remove image"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {previews.length < 6 && (
              <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 transition hover:border-brand-500 hover:text-brand-500 dark:border-slate-700">
                <ImagePlus className="size-6" />
                <span className="text-[10px] font-medium">Add photo</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
              </label>
            )}
          </div>
        </div>

        {type === 'found' && (
          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            <span>
              <strong className="text-slate-700 dark:text-slate-300">Keep it private.</strong> Never upload photos showing
              names, phone numbers or other personal data. The finder's details stay masked.
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" loading={loading}>
            {editId ? 'Save changes' : type === 'found' ? 'Post found item' : 'Report lost item'}
          </Button>
          <Link to="/my-items" className="btn-ghost">
            Cancel
          </Link>
        </div>
      </form>

      {type === 'found' && (
        <div className="card mt-6 flex items-center gap-3 p-4">
          <MapPin className="size-5 shrink-0 text-brand-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tip: hand found items to campus security or keep them somewhere safe. Don't include your room or phone number in listings.
          </p>
        </div>
      )}
    </div>
  );
}