// STUB: replaced by the owning agent. Keep the exported name and props.
import { Section, SectionHead } from '@/components/ui/Section';
import type { GithubData } from '@/lib/github/types';
export function Route({ github }: { github: GithubData }) {
  return (
    <Section k="route">
      <div className="wrap"><SectionHead k="route" /><h2 id="route-title" className="display mt-8" style={{ fontSize: 'var(--fs-h2)' }}>Route</h2></div>
    </Section>
  );
}
