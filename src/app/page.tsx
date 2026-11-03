import { getGithubData, summarize } from '@/lib/github';
import { Loader } from '@/components/loader/Loader';
import { Hero } from '@/components/hero/Hero';
import { About } from '@/components/about/About';
import { Works } from '@/components/works/Works';
import { Disciplines } from '@/components/disciplines/Disciplines';
import { Universe } from '@/components/universe/Universe';
import { Route } from '@/components/route/Route';
import { GithubPulse } from '@/components/github/GithubPulse';
import { ImageryGrid } from '@/components/imagery/ImageryGrid';
import { QuoteBlock } from '@/components/quote/QuoteBlock';
import { Contact } from '@/components/contact/Contact';
import { JsonLd } from '@/components/ui/JsonLd';

export const revalidate = 3600; // ISR: refresh GitHub data hourly

export default async function Home() {
  const github = await getGithubData();
  const summary = summarize(github);
  return (
    <>
      <JsonLd />
      <Loader summary={summary} />
      <Hero />
      <About />
      <Works github={github} />
      <Disciplines />
      <GithubPulse github={github} />
      <Universe github={github} />
      <Route github={github} />
      <ImageryGrid />
      <QuoteBlock />
      <Contact summary={summary} />
    </>
  );
}
