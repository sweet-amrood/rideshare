import { Navigate } from 'react-router-dom';
import RootLayout from '@/layouts/RootLayout';
import { marketingRoute, appRoute, legacyAppRoutes } from '@/routes';
import { paths } from './paths';

export const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [marketingRoute, appRoute, ...legacyAppRoutes, { path: '*', element: <Navigate to={paths.home} replace /> }]
  }
];

export default routes;
