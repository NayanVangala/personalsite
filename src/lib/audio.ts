'use client';
// AUDIO CONTRACT. Owned by the video+audio agent, who replaces the internals with a full Web Audio
// synth (clicks, whooshes, ambient pad, no external files). The exported API below must not change.
// Default is OFF. Nothing may make sound until the user flips the toggle.
import { useSyncExternalStore } from 'react';

export type SfxName = 'click' | 'hover' | 'whoosh' | 'open' | 'close' | 'tick' | 'sparkle' | 'success' | 'error' | 'boot';

type Listener = () => void;
const listeners = new Set<Listener>();
let enabled = false;

const emit = () => listeners.forEach((l) => l());

export const audio = {
  isEnabled: () => enabled,
  /** Must be called from a user gesture (the toggle click) so the AudioContext can resume. */
  setEnabled(v: boolean) { enabled = v; emit(); },
  toggle() { audio.setEnabled(!enabled); },
  /** Fire a synthesized UI sound. No-op while disabled. */
  play(_name: SfxName, _opts?: { intensity?: number }) { /* stub */ },
  subscribe(l: Listener) { listeners.add(l); return () => listeners.delete(l); },
};

export const sfx = (name: SfxName, opts?: { intensity?: number }) => audio.play(name, opts);

export function useSound() {
  const on = useSyncExternalStore(audio.subscribe, audio.isEnabled, () => false);
  return { enabled: on, toggle: audio.toggle, setEnabled: audio.setEnabled };
}
