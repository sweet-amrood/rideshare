import { Navigate } from 'react-router-dom';
import RootLayout from '@/components/layouts/RootLayout';
import AuthLayout from '@/components/layouts/AuthLayout';
import MainLayout from '@/components/layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import OnboardingGuard from './OnboardingGuard';
import RoleRoute from './RoleRoute';

import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import VerifyEmailPage from '@/features/auth/pages/VerifyEmailPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';
import OnboardingPage from '@/features/auth/pages/OnboardingPage';
import DriverSetupPage from '@/features/driver/pages/DriverSetupPage';
import CompleteProfilePage from '@/features/auth/pages/CompleteProfilePage';
import DriverResubmitDocsPage from '@/features/driver/pages/DriverResubmitDocsPage';

import Dashboard from '@/pages/Dashboard';
import FindRide from '@/pages/FindRide';
import OfferRide from '@/pages/OfferRide';
import Profile from '@/pages/Profile';
import PublicProfilePage from '@/features/profile/pages/PublicProfilePage';
import ChatPage from '@/pages/ChatPage';
import RideRequestChatPage from '@/pages/RideRequestChatPage';
import MapPage from '@/pages/MapPage';
import BookingHistoryPage from '@/features/bookings/pages/BookingHistoryPage';
import CarpoolingPage from '@/features/carpool/pages/CarpoolingPage';

export const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

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
                      <RoleRoute allow="RIDER" redirectTo="/dashboard">
                        <FindRide />
                      </RoleRoute>
                    )
                  },
                  {
                    path: 'carpooling',
                    element: (
                      <RoleRoute allow={['RIDER', 'DRIVER']} redirectTo="/dashboard">
                        <CarpoolingPage />
                      </RoleRoute>
                    )
                  },
                  {
                    path: 'bookings',
                    element: (
                      <RoleRoute allow="RIDER" redirectTo="/dashboard">
                        <BookingHistoryPage />
                      </RoleRoute>
                    )
                  },
                  {
                    path: 'offer',
                    element: (
                      <RoleRoute allow="DRIVER" redirectTo="/dashboard">
                        <OfferRide />
                      </RoleRoute>
                    )
                  },
                  { path: 'profile', element: <Profile /> },
                  {
                    path: 'driver/resubmit-documents',
                    element: (
                      <RoleRoute allow="DRIVER" redirectTo="/profile">
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

      { path: '*', element: <Navigate to="/dashboard" replace /> }
    ]
  }
];

export default routes;
