import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import type { Item } from '../../types';
import { Badge, TypeBadge } from '../ui/Badge';
import { cn, formatDate, posterLabel, timeAgo } from '../../utils/format';
import ItemImage from './ItemImage';

export default function ItemCard({ item }: { item: Item }) {
  return (
    <Link
      to={`/items/${item.id}`}
      className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-52 overflow-hidden sm:h-56 lg:h-60">
        <ItemImage
          src={item.cover_url}
          alt={item.name}
          categorySlug={item.category_slug}
          zoomable
          className="rounded-t-xl"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <TypeBadge type={item.type} />
        </div>
        {item.status !== (item.type === 'found' ? 'found' : 'lost') && (
          <div className="absolute right-3 top-3">
            <Badge kind="item" value={item.status} />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate font-semibold text-slate-900 dark:text-white">{item.name}</h3>
        <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
          {item.location && (
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" /> {item.location}
            </p>
          )}
          {item.date_incident && (
            <p className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" /> {formatDate(item.date_incident)}
            </p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
          <span className="truncate">{posterLabel(item.poster)}</span>
          <span className={cn('shrink-0')}>{timeAgo(item.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}