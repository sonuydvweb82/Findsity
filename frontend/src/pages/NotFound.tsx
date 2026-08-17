import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl font-extrabold text-brand-600/20 dark:text-brand-400/20">404</p>
      <Search className="-mt-8 size-10 text-brand-500" />
      <h1 className="font-display mt-4 text-2xl font-bold text-slate-900 dark:text-white">This page went missing</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Just like a lost item. Let's get you back to where things are found.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="btn-primary">
          Go home
        </Link>
        <Link to="/find" className="btn-secondary">
          Browse items
        </Link>
      </div>
    </div>
  );
}