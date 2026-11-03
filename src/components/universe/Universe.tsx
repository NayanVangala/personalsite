// STUB: replaced by the owning agent. Keep the exported name and props.
import { Section, SectionHead } from '@/components/ui/Section';
import type { GithubData } from '@/lib/github/types';
export function Universe({ github }: { github: GithubData }) {
  return (
    <Section k="universe">
      <div className="wrap"><SectionHead k="universe" /><h2 id="universe-title" className="display mt-8" style={{ fontSize: 'var(--fs-h2)' }}>Universe</h2></div>
    </Section>
  );
}
