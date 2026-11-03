// STUB: replaced by the owning agent. Keep the exported name and props.
import { Section, SectionHead } from '@/components/ui/Section';
import type { GithubData } from '@/lib/github/types';
export function Works({ github }: { github: GithubData }) {
  return (
    <Section k="works">
      <div className="wrap"><SectionHead k="works" /><h2 id="works-title" className="display mt-8" style={{ fontSize: 'var(--fs-h2)' }}>Works</h2></div>
    </Section>
  );
}
