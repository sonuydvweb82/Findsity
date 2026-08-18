import { useState } from 'react';
import { cn, initials } from '../../utils/format';
import { resolveImageUrl } from '../../utils/image';

export function Avatar({ name, url, size = 40, className }: { name?: string | null; url?: string | null; size?: number; className?: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (url && !imgFailed) {
    return (
      <img
        src={resolveImageUrl(url)}
        alt={name ?? 'avatar'}
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        className={cn('rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white ring-1 ring-slate-200 dark:ring-slate-700',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block size-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent', className)}
      aria-label="Loading"
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
      {icon && <div className="mb-1 text-slate-400">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      {description && <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}