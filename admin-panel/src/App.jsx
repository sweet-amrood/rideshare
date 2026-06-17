import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminLayout from '@/components/layout/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import UsersPage from '@/pages/UsersPage';
import UserDetailPage from '@/pages/UserDetailPage';
import DriversPage from '@/pages/DriversPage';
import VehiclesPage from '@/pages/VehiclesPage';
import VerificationsPage from '@/pages/VerificationsPage';
import VerificationReviewPage from '@/pages/VerificationReviewPage';
import RidesPage from '@/pages/RidesPage';
import BookingsPage from '@/pages/BookingsPage';
import ReportsPage from '@/pages/ReportsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import FareSettingsPage from '@/pages/FareSettingsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import { fetchAdminMe } from '@/store/slices/authSlice';

export default function App() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);

  useEffect(() => {
    if (token) dispatch(fetchAdminMe());
  }, [token, dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="verifications" element={<VerificationsPage />} />
        <Route path="verifications/review/:userId" element={<VerificationReviewPage />} />
        <Route path="rides" element={<RidesPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports-list" element={<Navigate to="/reports" replace />} />
        <Route path="fare-settings" element={<FareSettingsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
