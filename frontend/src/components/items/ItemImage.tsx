import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '../../utils/format';

interface Props {
  src?: string | null;
  alt: string;
  categorySlug?: string | null;
  className?: string;
  zoomable?: boolean;
  iconSize?: number;
}

export default function ItemImage({ src, alt, categorySlug, className, zoomable = false, iconSize = 28 }: Props) {
  const [failed, setFailed] = useState(false);
  void categorySlug;

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn(
          'size-full object-cover transition duration-500 ease-out',
          zoomable && 'group-hover:scale-[1.04]',
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'relative flex size-full flex-col items-center justify-center gap-2.5 overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-800 dark:via-slate-800/60 dark:to-slate-700',
        className,
      )}
      aria-hidden={!alt}
    >
      <span
        className="flex items-center justify-center rounded-full bg-white/85 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-700/60 dark:ring-slate-600/70"
        style={{ width: iconSize * 2, height: iconSize * 2 }}
      >
        <ImageIcon className="text-slate-400 dark:text-slate-300" style={{ width: iconSize, height: iconSize }} />
      </span>
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">No photo available</span>
    </div>
  );
}