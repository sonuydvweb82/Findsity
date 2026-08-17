import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, PackageSearch, ScrollText, ShieldAlert, Users } from 'lucide-react';
import { cn } from '../../utils/format';

const links = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/items', label: 'Items', icon: PackageSearch },
  { to: '/admin/claims', label: 'Claims', icon: ScrollText },
  { to: '/admin/reports', label: 'Reports', icon: ShieldAlert },
];

export default function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Admin console</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Moderate the campus lost &amp; found.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
              )
            }
          >
            <l.icon className="size-4" /> {l.label}
          </NavLink>
        ))}
      </div>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}