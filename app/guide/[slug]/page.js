import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guideSections, guideHref } from '@/data/guide';
import * as measurement from '@/content/guide/measurement';
import * as errorAnalysis from '@/content/guide/error-analysis';
import * as tabulation from '@/content/guide/tabulation';
import * as graphing from '@/content/guide/graphing';

const content = {
  measurement,
  'error-analysis': errorAnalysis,
  tabulation,
  graphing,
};

export function generateStaticParams() {
  return guideSections.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const section = guideSections.find((s) => s.slug === slug);
  return { title: section ? `${section.title} — Guide — Praxis` : 'Guide — Praxis' };
}

export default async function GuideSectionPage({ params }) {
  const { slug } = await params;
  const at = guideSections.findIndex((s) => s.slug === slug);
  if (at === -1) notFound();
  const section = guideSections[at];
  const { intro, bodies } = content[slug];
  const prev = guideSections[at - 1];
  const next = guideSections[at + 1];
  // "2.3" — short enough for a hint to cite ("see §2.3") alongside its link.
  const num = (i) => `${Number(section.index)}.${i + 1}`;

  return (
    <section className="guide">
      <div className="wrap guide-in">
        <nav className="guide-toc" aria-label="On this page">
          <Link className="guide-back" href="/guide">
            ← ALL SECTIONS
          </Link>
          <span className="tag">ON THIS PAGE</span>
          <ol>
            {section.subsections.map((sub, i) => (
              <li key={sub.id}>
                <a href={`#${sub.id}`}>
                  <span>{num(i)}</span>
                  {sub.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="prose">
          <header className="guide-head">
            <p className="eyebrow">GUIDE · {section.index}</p>
            <h1>{section.title}</h1>
            <p className="guide-lede">{section.blurb}</p>
          </header>

          {intro}

          {section.subsections.map((sub, i) => (
            <div className="guide-sub" key={sub.id}>
              <h2 id={sub.id}>
                <a href={`#${sub.id}`}>
                  <span className="guide-num">{num(i)}</span>
                  {sub.title}
                </a>
              </h2>
              {bodies[sub.id] ?? <p className="guide-stub">Not written yet.</p>}
            </div>
          ))}

          <nav className="guide-pager" aria-label="Guide sections">
            {prev ? (
              <Link href={guideHref(prev.slug)}>
                <span>← {prev.index}</span>
                {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link className="next" href={guideHref(next.slug)}>
                <span>{next.index} →</span>
                {next.title}
              </Link>
            )}
          </nav>
        </article>
      </div>
    </section>
  );
}
