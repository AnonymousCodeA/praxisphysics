import Link from 'next/link';
import DiffractionGrating from '@/components/DiffractionGrating';
import { Figure } from '@/components/Figures';
import { categories } from '@/data/simulations';
import { collections } from '@/data/papers';

export default function Home() {
  return (
    <>
      <div className="hero">
        <div className="wrap hero-in">
          <div>
            <h1>
              Physics Lab,
              <br />
              <em>Simulated.</em>
            </h1>
            <p className="lede">
              Every equation on the syllabus, running live in your browser. Plus past
              papers with worked solutions.{' '}
              <strong>Free, always. Works on a phone.</strong>
            </p>
            <div className="ctas">
              <Link className="btn btn-fill" href="#sims">
                Open a simulation
              </Link>
              <Link className="btn btn-line" href="#papers">
                Browse past papers
              </Link>
            </div>
          </div>

          <div>
            <div className="lab-frame">
              <DiffractionGrating />
            </div>
            <p className="hint">Drag to rule the grating finer or coarser.</p>
          </div>
        </div>
      </div>

      <section id="sims">
        <div className="wrap">
          <div className="head">
            <h2>Simulations</h2>
            <span className="count">1 LIVE · 30 PLANNED</span>
          </div>
          <div className="sims">
            {categories.map((c) => (
              <Link className="sim" key={c.slug} href={`/simulations/${c.slug}`}>
                <span className="tag">{c.tag}</span>
                <Figure slug={c.slug} />
                <h3>{c.title}</h3>
                <p>{c.blurb}</p>
                <span className="go">OPEN →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="papers">
        <div className="wrap">
          <div className="head">
            <h2>Past papers</h2>
            <span className="count">3 COLLECTIONS</span>
          </div>
          <div className="cats">
            {collections.map((c) => (
              <Link className="cat" key={c.slug} href={`/papers/${c.slug}`}>
                <span className="idx">{c.index}</span>
                <h3>
                  {c.lines[0]}
                  <br />
                  {c.lines[1]}
                </h3>
                <p>{c.blurb}</p>
                <span className="go">OPEN →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="community">
        <div className="wrap">
          <div className="band">
            <div>
              <h2>Stuck on a problem?</h2>
              <p>
                Ask on the Praxis Discord. Olympiad students and past medalists hang
                out there, and questions usually get an answer the same day.
              </p>
            </div>
            <a className="btn btn-fill" href="#">
              Join the Discord
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
