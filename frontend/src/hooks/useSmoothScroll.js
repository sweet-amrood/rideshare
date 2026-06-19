import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/**
 * Buttery momentum scrolling (Lenis) wired into GSAP ScrollTrigger so pinned
 * scrollytelling scrubs smoothly. Scoped to whatever component mounts it, so it
 * never interferes with the app's own scroll containers (maps, chat, modals).
 *
 * Honors prefers-reduced-motion by staying fully disabled.
 */
export default function useSmoothScroll(enabled = true) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!enabled || reduceMotion) return undefined;

    const lenis = new Lenis({
      duration: 1.05,
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5
    });

    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    const onTick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      lenis.off('scroll', onScroll);
      gsap.ticker.remove(onTick);
      gsap.ticker.lagSmoothing(500, 33); // restore GSAP default
      lenis.destroy();
      ScrollTrigger.refresh();
    };
  }, [enabled, reduceMotion]);
}
