'use client';
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';

function mq(query: string) {
  return {
    subscribe(cb: () => void) {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}

function useMedia(query: string, serverValue = false) {
  const m = typeof window === 'undefined' ? null : mq(query);
  return useSyncExternalStore(
    (cb) => (m ? m.subscribe(cb) : () => {}),
    () => (m ? m.get() : serverValue),
    () => serverValue,
  );
}

/** true when the user asked for reduced motion. Swap to calm static versions. */
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
/** true on touch-first devices. Mobile gets purpose-built interactions, not shrunken desktop. */
export const useCoarsePointer = () => useMedia('(pointer: coarse)');
export const useIsMobile = () => useMedia('(max-width: 767px)');

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/** IntersectionObserver. Use it to pause offscreen WebGL/canvas/video work. */
export function useInView<T extends Element = HTMLDivElement>(
  opts: IntersectionObserverInit & { once?: boolean } = {},
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const { once, ...io } = opts;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting);
      if (e.isIntersecting && once) obs.disconnect();
    }, { rootMargin: '10% 0px', ...io });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView];
}

export function usePageVisible() {
  const [v, setV] = useState(true);
  useEffect(() => {
    const on = () => setV(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return v;
}

export type Capability = {
  ready: boolean;
  /** 'high' = full WebGL scenes. 'low' = lighter scenes, no postprocessing. 'none' = static illustrated fallback. */
  tier: 'high' | 'low' | 'none';
  webgl: boolean;
  reducedMotion: boolean;
  coarse: boolean;
};

let cached: Pick<Capability, 'tier' | 'webgl'> | null = null;
function probe(): Pick<Capability, 'tier' | 'webgl'> {
  if (cached) return cached;
  let webgl = false;
  try {
    const c = document.createElement('canvas');
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {}
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 500;
  const tier = !webgl ? 'none' : cores <= 4 || mem <= 4 || small ? 'low' : 'high';
  return (cached = { tier, webgl });
}

/** One place that decides how much WebGL a device gets. Reduced motion forces 'none' for heavy scenes. */
export function useCapability(): Capability {
  const reducedMotion = useReducedMotion();
  const coarse = useCoarsePointer();
  const [state, setState] = useState<Pick<Capability, 'tier' | 'webgl'> & { ready: boolean }>({
    ready: false, tier: 'none', webgl: false,
  });
  useEffect(() => setState({ ready: true, ...probe() }), []);
  return {
    ...state,
    tier: reducedMotion ? 'none' : state.tier,
    reducedMotion,
    coarse,
  };
}

/** Device pixel ratio cap used everywhere WebGL is created. */
export const MAX_DPR = 2;
export const dprRange = (): [number, number] => [1, MAX_DPR];
