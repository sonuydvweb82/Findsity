import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout, ProtectedRoute, AdminRoute, GuestRoute } from './components/layout/Guards';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import FindItems from './pages/FindItems';
import ItemDetails from './pages/ItemDetails';
import ReportItem from './pages/ReportItem';
import ItemEdit from './pages/ItemEdit';
import MyItems from './pages/MyItems';
import Claims from './pages/Claims';
import ClaimDetails from './pages/ClaimDetails';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import NotFound from './pages/NotFound';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminItems from './pages/admin/AdminItems';
import AdminClaims from './pages/admin/AdminClaims';
import AdminReports from './pages/admin/AdminReports';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/find" element={<FindItems />} />
        <Route path="/items/:id" element={<ItemDetails />} />

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/report" element={<ReportItem initialType="found" />} />
          <Route path="/report/lost" element={<ReportItem initialType="lost" />} />
          <Route path="/items/:id/edit" element={<ItemEdit />} />
          <Route path="/my-items" element={<MyItems />} />
          <Route path="/claims" element={<Claims />} />
          <Route path="/claims/finder" element={<Claims />} />
          <Route path="/claims/:id" element={<ClaimDetails />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:id" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<UserProfile />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="items" element={<AdminItems />} />
            <Route path="claims" element={<AdminClaims />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}