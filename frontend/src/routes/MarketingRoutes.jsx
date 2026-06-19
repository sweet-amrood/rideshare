import { lazy } from 'react';
import MarketingLayout from '@/layouts/MarketingLayout';
import HomeRoute from '@/app/router/HomeRoute';

const AboutPage = lazy(() => import('@/pages/marketing/AboutPage'));
const ContactPage = lazy(() => import('@/pages/marketing/ContactPage'));
const ModeSelectPage = lazy(() => import('@/pages/marketing/ModeSelectPage'));
const ExperiencePage = lazy(() => import('@/pages/marketing/ExperiencePage'));

/** Marketing site routes (/, /about, /contact). Split-ready for its own deploy target. */
export const marketingRoute = {
  element: <MarketingLayout />,
  children: [
    { index: true, element: <HomeRoute /> },
    { path: 'about', element: <AboutPage /> },
    { path: 'contact', element: <ContactPage /> },
    { path: 'choose-mode', element: <ModeSelectPage /> }
  ]
};

/** Immersive full-screen experience — rendered without the marketing chrome. */
export const experienceRoute = { path: 'experience', element: <ExperiencePage /> };
