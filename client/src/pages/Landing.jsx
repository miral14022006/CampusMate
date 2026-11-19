import { useEffect, useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useDocumentTitle, usePrefersReducedMotion } from '../lib/hooks';
import { features } from '../config/features';

import Navbar from './Landing/sections/Navbar';
import Hero from './Landing/sections/Hero';
import FeaturesBento from './Landing/sections/FeaturesBento';
import IntroOverlay from '../components/brand/IntroOverlay';

// Lazy load Scenes 3 to 7 with React.lazy
const HowItWorks = lazy(() => import('./Landing/sections/HowItWorks'));
const InteractiveDemo = lazy(() => import('./Landing/sections/InteractiveDemo'));
const CalendarSpotlight = lazy(() => import('./Landing/sections/CalendarSpotlight'));
const FAQSection = lazy(() => import('./Landing/sections/FAQSection'));
const AboutContact = lazy(() => import('./Landing/sections/AboutContact'));
const Footer = lazy(() => import('./Landing/sections/Footer'));

const SCENES = [
  { id: 'home', label: 'Home', linkId: 'home' },
  { id: 'features', label: 'Features', linkId: 'features' },
  { id: 'how', label: 'How it works', linkId: 'how-it-works' },
  { id: 'demo', label: 'Demo', linkId: 'how-it-works' },
  { id: 'dates', label: 'Dates', linkId: 'calendar' },
  { id: 'faq', label: 'FAQ', linkId: null },
  { id: 'about', label: 'About & Contact', linkId: 'about' }
];

export default function Landing() {
  useDocumentTitle('CampusMate — Multilingual College Assistant');
  const reducedMotion = usePrefersReducedMotion();

  const [introFinished, setIntroFinished] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (reducedMotion) return true;
    try {
      return sessionStorage.getItem('cm_intro_seen') === 'true';
    } catch {
      return true;
    }
  });

  const [activeLinkId, setActiveLinkId] = useState('home');
  const [showMobileBackToTop, setShowMobileBackToTop] = useState(false);

  // Prefetch lazy scene chunks when the preceding scene reaches 50% in view
  useEffect(() => {
    const prefetchMap = {
      home: () => import('./Landing/sections/HowItWorks'),
      features: () => import('./Landing/sections/InteractiveDemo'),
      how: () => import('./Landing/sections/CalendarSpotlight'),
      demo: () => import('./Landing/sections/FAQSection'),
      dates: () => {
        import('./Landing/sections/AboutContact');
        import('./Landing/sections/Footer');
      }
    };

    const prefetchObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const id = entry.target.id;
            if (prefetchMap[id]) {
              prefetchMap[id]();
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    ['home', 'features', 'how', 'demo', 'dates'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) prefetchObserver.observe(el);
    });

    return () => prefetchObserver.disconnect();
  }, []);

  // Scrollspy via IntersectionObserver
  useEffect(() => {
    const handleScroll = () => {
      setShowMobileBackToTop(window.scrollY > 1000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const match = SCENES.find((s) => s.id === id);
            if (match && match.linkId !== undefined) {
              if (match.linkId !== null) {
                setActiveLinkId(match.linkId);
              }
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '-30% 0px -40% 0px',
        threshold: [0.1, 0.4]
      }
    );

    SCENES.forEach((scene) => {
      const el = document.getElementById(scene.id);
      if (el) observer.observe(el);
    });

    const contactEl = document.getElementById('contact');
    if (contactEl) {
      const contactObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) setActiveLinkId('contact');
          });
        },
        { rootMargin: '-20% 0px -40% 0px', threshold: 0.2 }
      );
      contactObs.observe(contactEl);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);


  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className={`relative min-h-screen max-w-[100vw] overflow-x-clip bg-[#161616] text-ink antialiased selection:bg-accent selection:text-white ${
        features.sceneSnap ? 'lg:[@media(pointer:fine)]:snap-y lg:[@media(pointer:fine)]:snap-proximity' : ''
      }`}
    >
      {/* 0. Session Intro Overlay */}
      {!reducedMotion && (
        <IntroOverlay onComplete={() => setIntroFinished(true)} />
      )}

      {/* 1. Floating Pill Navbar (Header Landmark) */}
      <Navbar
        activeLinkId={activeLinkId}
        introFinished={introFinished}
      />

      {/* Main Landmark wrapping content scenes */}
      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* Scene 1: Hero */}
        <Hero introFinished={introFinished} />

        {/* Scene 2: Features */}
        <FeaturesBento />

        {/* Lazy Loaded Scenes */}
        <Suspense fallback={<div className="h-[100svh] w-full bg-[#161616]" />}>
          {/* Scene 3: How it works */}
          <HowItWorks />

          {/* Scene 4: See it in action (Interactive Demo) */}
          <InteractiveDemo />

          {/* Scene 5: Dates (Calendar Spotlight) */}
          <CalendarSpotlight />

          {/* Scene 6: FAQ */}
          <FAQSection />

          {/* Scene 7: About & Contact */}
          <AboutContact />
        </Suspense>
      </main>

      {/* Footer Landmark */}
      <Suspense fallback={null}>
        <Footer />
      </Suspense>

      {/* Mobile-only Back to top button */}
      {showMobileBackToTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 flex xl:hidden h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-hairline bg-surface-2 text-ink shadow-lift hover:text-accent outline-none focus-visible:outline-2 focus-visible:outline-accent"
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </motion.button>
      )}
    </div>
  );
}
