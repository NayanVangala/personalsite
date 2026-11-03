'use client';
// Single registration point. Always import gsap from here, never from 'gsap' directly,
// so ScrollTrigger is registered exactly once and tree-shaking stays sane.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
