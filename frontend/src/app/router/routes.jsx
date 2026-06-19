import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import RootLayout from '@/components/layouts/RootLayout';
import MarketingLayout from '@/components/layouts/MarketingLayout';
import AuthLayout from '@/components/layouts/AuthLayout';
import MainLayout from '@/components/layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import OnboardingGuard from './OnboardingGuard';
import RoleRoute from './RoleRoute';
import MobileRedirect from './MobileRedirect';
import AppPathRedirect from './AppPathRedirect';
import { paths } from './paths';

const LandingPage = lazy(() => import('@/pages/marketing/LandingPage'));
const AboutPage = lazy(() => import('@/pages/marketing/AboutPage'));
const ContactPage = lazy(() => import('@/pages/marketing/ContactPage'));

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const OnboardingPage = lazy(() => import('@/features/auth/pages/OnboardingPage'));
const DriverSetupPage = lazy(() => import('@/features/driver/pages/DriverSetupPage'));
const CompleteProfilePage = lazy(() => import('@/features/auth/pages/CompleteProfilePage'));
const DriverResubmitDocsPage = lazy(() => import('@/features/driver/pages/DriverResubmitDocsPage'));

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const FindRide = lazy(() => import('@/pages/FindRide'));
const OfferRide = lazy(() => import('@/pages/OfferRide'));
const Profile = lazy(() => import('@/pages/Profile'));
const PublicProfilePage = lazy(() => import('@/features/profile/pages/PublicProfilePage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const RideRequestChatPage = lazy(() => import('@/pages/RideRequestChatPage'));
const MapPage = lazy(() => import('@/pages/MapPage'));
const BookingHistoryPage = lazy(() => import('@/features/bookings/pages/BookingHistoryPage'));
const CarpoolingPage = lazy(() => import('@/features/carpool/pages/CarpoolingPage'));

/** App routes nested under /app */
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
            element: <MainLayout />,
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

/** Pre-/app URLs → /app/... for bookmarks and old links */
const legacyAppRoutes = [
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

export const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        element: <MarketingLayout />,
        children: [
          {
            index: true,
            element: (
              <MobileRedirect>
                <LandingPage />
              </MobileRedirect>
            )
          },
          { path: 'about', element: <AboutPage /> },
          { path: 'contact', element: <ContactPage /> }
        ]
      },

      { path: 'app', children: appChildren },

      ...legacyAppRoutes,

      { path: '*', element: <Navigate to={paths.home} replace /> }
    ]
  }
];

export default routes;
