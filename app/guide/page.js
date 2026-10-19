import Link from 'next/link';
import { guideSections, guideHref } from '@/data/guide';

export const metadata = { title: 'Guide — Praxis' };

export default function GuideContents() {
  return (
    <section className="guide">
      <div className="wrap">
        <header className="guide-contents-head">
          <p className="eyebrow">GUIDE</p>
          <h1>Practical skills</h1>
          <p className="guide-lede">
            How to measure, how sure you can be, how to record it, and how to draw a graph
            that tells you something. Read it start to finish, or follow a link from an
            experiment straight to the part you need.
          </p>
        </header>

        <ol className="guide-contents">
          {guideSections.map((s) => (
            <li key={s.slug}>
              <span className="guide-contents-idx">{s.index}</span>
              <div>
                <h2>
                  <Link href={guideHref(s.slug)}>{s.title}</Link>
                </h2>
                <p>{s.blurb}</p>
                <ol className="guide-contents-subs">
                  {s.subsections.map((sub, i) => (
                    <li key={sub.id}>
                      <Link href={guideHref(s.slug, sub.id)}>
                        <span>
                          {Number(s.index)}.{i + 1}
                        </span>
                        {sub.title}
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
