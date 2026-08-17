import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import { api } from '../services/api';
import type { Item, Paginated } from '../types';
import ItemCard from '../components/items/ItemCard';
import ItemFilters, { type Filters } from '../components/items/ItemFilters';
import { EmptyState, Skeleton } from '../components/ui/Avatar';
import Button from '../components/ui/Button';

export default function FindItems() {
  const [params, setParams] = useSearchParams();
  const initialType = params.get('type') ?? '';
  const [filters, setFilters] = useState<Filters>({
    type: initialType,
    q: '',
    category: '',
    location: '',
    sort: 'newest',
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Item> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (filters.type) qs.set('type', filters.type);
    if (filters.q) qs.set('q', filters.q);
    if (filters.category) qs.set('category', filters.category);
    if (filters.location) qs.set('location', filters.location);
    qs.set('sort', filters.sort);
    qs.set('page', String(page));
    qs.set('limit', '12');
    api
      .get<Paginated<Item>>(`/api/items?${qs.toString()}`)
      .then(setData)
      .catch(() => setError('Could not load items. Please try again.'))
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => {
    const t = params.get('type');
    if (t === 'found' || t === 'lost') {
      setFilters((f) => ({ ...f, type: t }));
    }
  }, [params]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
          {filters.type === 'lost' ? 'Items lost on campus' : filters.type === 'found' ? 'Items found on campus' : 'Lost & found on campus'}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Browse recent listings. Spot yours? Open the item and submit a claim with proof of ownership.
        </p>
      </div>

      <ItemFilters value={filters} onChange={(f) => { setFilters(f); setPage(1); }} />

      <div className="mt-8">
        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <Skeleton className="h-52 rounded-none sm:h-56 lg:h-60" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && <EmptyState icon={<PackageSearch className="size-10" />} title={error} />}

        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState
            icon={<PackageSearch className="size-10" />}
            title="No items match your search"
            description="Try different keywords, or be the first to report this item."
            action={
              <Button onClick={() => setFilters({ type: '', q: '', category: '', location: '', sort: 'newest' })}>
                Clear filters
              </Button>
            }
          />
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {data.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
            {data.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-slate-500">
                  Page {data.page} of {data.totalPages}
                </span>
                <Button variant="secondary" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}