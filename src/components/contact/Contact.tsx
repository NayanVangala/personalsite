// STUB: replaced by the owning agent. Keep the exported name and props.
import { Section, SectionHead } from '@/components/ui/Section';
import type { GithubSummary } from '@/lib/github/types';
export function Contact({ summary }: { summary: GithubSummary }) {
  return (
    <Section k="contact">
      <div className="wrap"><SectionHead k="contact" /><h2 id="contact-title" className="display mt-8" style={{ fontSize: 'var(--fs-h2)' }}>Contact</h2></div>
    </Section>
  );
}
