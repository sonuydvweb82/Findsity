import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Field, Input, Select } from '../ui/Input';
import Button from '../ui/Button';

export interface Filters {
  type?: string;
  q?: string;
  category?: string;
  location?: string;
  sort: string;
}

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

export default function ItemFilters({
  value,
  onChange,
  showType = true,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  showType?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by name, brand, location…"
            value={value.q ?? ''}
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>
        {showType && (
          <Select className="w-36" value={value.type ?? ''} onChange={(e) => set({ type: e.target.value })}>
            <option value="">All types</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </Select>
        )}
        <Select className="w-44" value={value.sort} onChange={(e) => set({ sort: e.target.value })}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="recently_updated">Recently updated</option>
        </Select>
        <Button variant="secondary" size="sm" onClick={() => setExpanded((v) => !v)}>
          <SlidersHorizontal className="size-4" /> More filters
        </Button>
        {(value.q || value.category || value.location) && (
          <Button variant="ghost" size="sm" onClick={() => onChange({ ...value, q: '', category: '', location: '' })}>
            <X className="size-4" /> Clear
          </Button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3 dark:border-slate-800">
          <Field label="Category">
            <Select value={value.category ?? ''} onChange={(e) => set({ category: e.target.value })}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Location">
            <Input placeholder="e.g. Library, Cafeteria" value={value.location ?? ''} onChange={(e) => set({ location: e.target.value })} />
          </Field>
        </div>
      )}
    </div>
  );
}