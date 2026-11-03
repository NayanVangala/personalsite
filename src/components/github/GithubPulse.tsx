// STUB: replaced by the owning agent. Keep the exported name and props.
import { Section, SectionHead } from '@/components/ui/Section';
import type { GithubData } from '@/lib/github/types';
export function GithubPulse({ github }: { github: GithubData }) {
  return (
    <Section k="imagery">
      <div className="wrap"><SectionHead k="imagery" /><h2 id="imagery-title" className="display mt-8" style={{ fontSize: 'var(--fs-h2)' }}>GithubPulse</h2></div>
    </Section>
  );
}
