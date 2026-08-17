import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Moon, Plus, Search, Sun, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../utils/format';

const navLinks = [
  { to: '/find', label: 'Find Items' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/my-items', label: 'My Items' },
  { to: '/claims', label: 'My Claims' },
  { to: '/messages', label: 'Messages' },
];

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const links = user?.role === 'admin' ? [...navLinks, { to: '/admin', label: 'Admin' }] : navLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <Search className="size-4.5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Find<span className="text-brand-600">sity</span>
          </span>
        </Link>

        {user && (
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {user && (
            <>
              <Link
                to="/report"
                className="hidden items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 sm:inline-flex"
              >
                <Plus className="size-4" /> Report
              </Link>
              <Link to="/notifications" className="btn-ghost relative p-2" aria-label="Notifications">
                <Bell className="size-5" />
              </Link>
            </>
          )}
          <button onClick={toggle} className="btn-ghost p-2" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>

          {user ? (
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-full p-0.5 transition hover:ring-2 hover:ring-brand-500/40">
                <Avatar name={user.fullName} url={user.avatarUrl} size={34} />
              </button>
              {menuOpen && (
                <div className="fade-up absolute right-0 top-12 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="btn-ghost w-full justify-start">
                    Profile settings
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="btn-ghost w-full justify-start text-rose-600 dark:text-rose-400"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Sign up free
              </Link>
            </div>
          )}

          <button onClick={() => setOpen((v) => !v)} className="btn-ghost p-2 md:hidden" aria-label="Menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && user && (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Link to="/report" onClick={() => setOpen(false)} className="btn-primary mt-2">
              <Plus className="size-4" /> Report an item
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}