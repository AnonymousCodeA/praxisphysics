import Link from 'next/link';

export default function Header() {
  return (
    <header className="top">
      <div className="wrap top-in">
        <Link className="mark" href="/">
          <svg className="gyro" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
            <circle cx="12" cy="12" r="9.2" />
            <ellipse className="spin" cx="12" cy="12" rx="3.6" ry="9.2" />
            <ellipse cx="12" cy="12" rx="9.2" ry="3.6" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          <span className="mark-name">PRAXIS</span>
        </Link>
        <nav className="nav">
          {/* Shortened on the narrowest phones so five nav items still fit at 360px. */}
          <Link href="/#sims" aria-label="Simulations">
            <span className="nav-full">SIMULATIONS</span>
            <span className="nav-short">SIMS</span>
          </Link>
          <Link href="/#papers">PAPERS</Link>
          <Link href="/guide">GUIDE</Link>
          <Link href="/#community">DISCORD</Link>
          <span className="nav-sep" aria-hidden="true" />
          <Link className="signup" href="/signup">Sign up</Link>
        </nav>
      </div>
    </header>
  );
}
