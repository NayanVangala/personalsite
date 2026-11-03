'use client';
// Lenis smooth scroll + GSAP ScrollTrigger sync. Exposes useLenis() for programmatic scrolls.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '@/lib/gsap';

const LenisCtx = createContext<Lenis | null>(null);
export const useLenis = () => useContext(LenisCtx);

/** Scroll to a section id or y offset. Falls back to native scroll when Lenis is off. */
export function scrollToTarget(lenis: Lenis | null, target: string | number, offset = 0) {
  if (lenis) lenis.scrollTo(target as never, { offset, duration: 1.6, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
  else if (typeof target === 'string') document.querySelector(target)?.scrollIntoView({ behavior: 'auto' });
  else window.scrollTo({ top: target });
}

export function Providers({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.toggle('reduced', reduced);
    if (reduced) return; // native scroll, calm static versions everywhere

    const l = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    l.on('scroll', ScrollTrigger.update);
    const tick = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(l);
    return () => {
      gsap.ticker.remove(tick);
      l.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisCtx.Provider value={lenis}>{children}</LenisCtx.Provider>;
}
