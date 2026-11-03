import type { ReactNode } from 'react';
import { SECTIONS, type SectionKey } from '@/lib/site';

/** HUD header row shared by every module: "MODULE 01 / ABOUT" on the left, ID code + status on the right. */
export function SectionHead({
  k, status = 'ONLINE', title,
}: { k: SectionKey; status?: string; title?: string }) {
  const s = SECTIONS[k];
  const module = 'module' in s ? s.module : null;
  return (
    <div className="label flex items-center justify-between gap-4 border-b border-(--line) pb-3 text-(--fg-muted)">
      <span>{module ? `Module ${module} / ${title ?? s.label}` : (title ?? s.label)}</span>
      <span className="flex items-center gap-3">
        <span className="hidden sm:inline">{s.code}</span>
        <span className="flex items-center gap-2 text-(--accent-ink)"><span className="live-dot" aria-hidden />{status}</span>
      </span>
    </div>
  );
}

/** Semantic section wrapper. Gives every section a stable id, aria label and data-section code. */
export function Section({
  k, labelledBy, className = '', children, bleed = false,
}: { k: SectionKey; labelledBy?: string; className?: string; children: ReactNode; bleed?: boolean }) {
  const s = SECTIONS[k];
  return (
    <section id={s.id} data-section={s.code} aria-labelledby={labelledBy} className={`relative ${bleed ? '' : 'section-y'} ${className}`}>
      {children}
    </section>
  );
}
