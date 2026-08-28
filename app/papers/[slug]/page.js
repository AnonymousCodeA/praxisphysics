import { notFound } from 'next/navigation';
import { collections } from '@/data/papers';

export function generateStaticParams() {
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const col = collections.find((c) => c.slug === slug);
  return { title: col ? `${col.lines.join(' ')} — Praxis` : 'Praxis' };
}

export default async function CollectionPage({ params }) {
  const { slug } = await params;
  const col = collections.find((c) => c.slug === slug);
  if (!col) notFound();

  return (
    <section>
      <div className="wrap">
        <div className="head">
          <h2>{col.lines.join(' ')}</h2>
          <span className="count">{col.index}</span>
        </div>
        <p className="lede">{col.blurb}</p>
        <p className="hint">
          Nothing here yet. Papers go in a list on this page, grouped by exam and year.
        </p>
      </div>
    </section>
  );
}
