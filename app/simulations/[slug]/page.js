import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categories, simulations } from '@/data/simulations';

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  return { title: cat ? `${cat.title} — Praxis` : 'Praxis' };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();

  const list = simulations[slug] || [];

  return (
    <section>
      <div className="wrap">
        <div className="head">
          <h2>{cat.title}</h2>
          <span className="count">{list.length} LIVE</span>
        </div>
        <p className="lede">{cat.blurb}</p>

        {list.length === 0 ? (
          <p className="hint">Nothing here yet. This is where the simulations land.</p>
        ) : (
          <div className="sims">
            {list.map((s) => {
              const inner = (
                <>
                  <span className="tag">{s.status.toUpperCase()}</span>
                  <h3>{s.title}</h3>
                  <p>{s.blurb}</p>
                  {s.href && <span className="go">OPEN →</span>}
                </>
              );
              return s.href ? (
                <Link className="sim" key={s.slug} href={s.href}>
                  {inner}
                </Link>
              ) : (
                <div className="sim" key={s.slug}>
                  {inner}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
