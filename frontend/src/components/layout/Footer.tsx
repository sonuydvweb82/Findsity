import { Link } from 'react-router-dom';
import { Search, HeartHandshake, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <Search className="size-4" />
            </span>
            <span className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Find<span className="text-brand-600">sity</span>
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            The campus lost &amp; found. Lost something? Found something? Findsity helps your community reunite belongings safely.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li><Link className="hover:text-brand-600" to="/find">Find items</Link></li>
            <li><Link className="hover:text-brand-600" to="/report">Report an item</Link></li>
            <li><Link className="hover:text-brand-600" to="/register">Create account</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">How it works</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li className="flex items-center gap-2"><HeartHandshake className="size-4 text-brand-500" /> Report &amp; get matched</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand-500" /> Verify ownership safely</li>
            <li className="flex items-center gap-2"><Search className="size-4 text-brand-500" /> Hand over in person</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 py-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        © {new Date().getFullYear()} Findsity · Made for campus communities ·{' '}
        <span className="text-slate-400 dark:text-slate-500">Crafted by Sonu Kr Ydv</span>
      </div>
    </footer>
  );
}