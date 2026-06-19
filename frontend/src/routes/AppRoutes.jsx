import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import AuthLayout from '@/components/layouts/AuthLayout';
import ProtectedRoute from '@/app/router/ProtectedRoute';
import PublicRoute from '@/app/router/PublicRoute';
import OnboardingGuard from '@/app/router/OnboardingGuard';
import RoleRoute from '@/app/router/RoleRoute';
import AppPathRedirect from '@/app/router/AppPathRedirect';
import { paths } from '@/app/router/paths';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const OnboardingPage = lazy(() => import('@/features/auth/pages/OnboardingPage'));
const DriverSetupPage = lazy(() => import('@/features/driver/pages/DriverSetupPage'));
const CompleteProfilePage = lazy(() => import('@/features/auth/pages/CompleteProfilePage'));
const DriverResubmitDocsPage = lazy(() => import('@/features/driver/pages/DriverResubmitDocsPage'));

const Dashboard = lazy(() => import('@/pages/app/Dashboard'));
const FindRide = lazy(() => import('@/pages/app/FindRide'));
const OfferRide = lazy(() => import('@/pages/app/OfferRide'));
const Profile = lazy(() => import('@/pages/app/Profile'));
const PublicProfilePage = lazy(() => import('@/features/profile/pages/PublicProfilePage'));
const ChatPage = lazy(() => import('@/pages/app/ChatPage'));
const RideRequestChatPage = lazy(() => import('@/pages/app/RideRequestChatPage'));
const MapPage = lazy(() => import('@/pages/app/MapPage'));
const BookingHistoryPage = lazy(() => import('@/features/bookings/pages/BookingHistoryPage'));
const CarpoolingPage = lazy(() => import('@/features/carpool/pages/CarpoolingPage'));

const appChildren = [
  { index: true, element: <Navigate to="dashboard" replace /> },

  {
    element: (
      <PublicRoute>
        <AuthLayout />
      </PublicRoute>
    ),
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> }
    ]
  },

  {
    element: <ProtectedRoute />,
    children: [
      { path: 'complete-profile', element: <CompleteProfilePage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: 'onboarding/driver-setup', element: <DriverSetupPage /> },
      {
        element: <OnboardingGuard />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: 'dashboard', element: <Dashboard /> },
              {
                path: 'find',
                element: (
                  <RoleRoute allow="RIDER" redirectTo={paths.dashboard}>
                    <FindRide />
                  </RoleRoute>
                )
              },
              {
                path: 'carpooling',
                element: (
                  <RoleRoute allow={['RIDER', 'DRIVER']} redirectTo={paths.dashboard}>
                    <CarpoolingPage />
                  </RoleRoute>
                )
              },
              {
                path: 'bookings',
                element: (
                  <RoleRoute allow="RIDER" redirectTo={paths.dashboard}>
                    <BookingHistoryPage />
                  </RoleRoute>
                )
              },
              {
                path: 'offer',
                element: (
                  <RoleRoute allow="DRIVER" redirectTo={paths.dashboard}>
                    <OfferRide />
                  </RoleRoute>
                )
              },
              { path: 'profile', element: <Profile /> },
              {
                path: 'driver/resubmit-documents',
                element: (
                  <RoleRoute allow="DRIVER" redirectTo={paths.profile}>
                    <DriverResubmitDocsPage />
                  </RoleRoute>
                )
              },
              { path: 'users/:userId', element: <PublicProfilePage /> },
              { path: 'chat/:rideId', element: <ChatPage /> },
              { path: 'ride-request/:requestId/chat', element: <RideRequestChatPage /> },
              { path: 'map', element: <MapPage /> }
            ]
          }
        ]
      }
    ]
  },

  { path: '*', element: <Navigate to={paths.dashboard} replace /> }
];

/** App shell under /app — split-ready for its own deploy target. */
export const appRoute = {
  path: 'app',
  children: appChildren
};

/** Pre-/app URLs → /app/... for bookmarks and old links */
export const legacyAppRoutes = [
  { path: 'login', element: <AppPathRedirect /> },
  { path: 'register', element: <AppPathRedirect /> },
  { path: 'verify-email', element: <AppPathRedirect /> },
  { path: 'forgot-password', element: <AppPathRedirect /> },
  { path: 'reset-password', element: <AppPathRedirect /> },
  { path: 'complete-profile', element: <AppPathRedirect /> },
  { path: 'onboarding/*', element: <AppPathRedirect /> },
  { path: 'dashboard', element: <AppPathRedirect /> },
  { path: 'find', element: <AppPathRedirect /> },
  { path: 'carpooling', element: <AppPathRedirect /> },
  { path: 'bookings', element: <AppPathRedirect /> },
  { path: 'offer', element: <AppPathRedirect /> },
  { path: 'profile', element: <AppPathRedirect /> },
  { path: 'map', element: <AppPathRedirect /> },
  { path: 'driver/*', element: <AppPathRedirect /> },
  { path: 'chat/*', element: <AppPathRedirect /> },
  { path: 'ride-request/*', element: <AppPathRedirect /> },
  { path: 'users/*', element: <AppPathRedirect /> }
];
