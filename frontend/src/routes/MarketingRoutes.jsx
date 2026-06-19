import { lazy } from 'react';
import MarketingLayout from '@/layouts/MarketingLayout';
import HomeRoute from '@/app/router/HomeRoute';

const AboutPage = lazy(() => import('@/pages/marketing/AboutPage'));
const ContactPage = lazy(() => import('@/pages/marketing/ContactPage'));
const ModeSelectPage = lazy(() => import('@/pages/marketing/ModeSelectPage'));
const ExperiencePage = lazy(() => import('@/pages/marketing/ExperiencePage'));

/**
 * Home (/) renders its own marketing chrome (header/footer) and embeds the
 * cinematic journey. It lives OUTSIDE MarketingLayout because that layout wraps
 * pages in a transformed PageTransition, which would break GSAP ScrollTrigger
 * pinning used by the embedded horizontal journey.
 */
export const homeRoute = { index: true, element: <HomeRoute /> };

/** Marketing site routes (/about, /contact). Split-ready for its own deploy target. */
export const marketingRoute = {
  element: <MarketingLayout />,
  children: [
    { path: 'about', element: <AboutPage /> },
    { path: 'contact', element: <ContactPage /> },
    { path: 'choose-mode', element: <ModeSelectPage /> }
  ]
};

/** Immersive full-screen experience — rendered without the marketing chrome. */
export const experienceRoute = { path: 'experience', element: <ExperiencePage /> };
