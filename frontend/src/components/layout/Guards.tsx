import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from './Header';
import Footer from './Footer';
import { Spinner } from '../ui/Avatar';

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}