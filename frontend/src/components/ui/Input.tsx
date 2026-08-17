import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/format';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('input-base', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('input-base min-h-24 resize-y', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('input-base cursor-pointer', className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && <label className="label-base">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}