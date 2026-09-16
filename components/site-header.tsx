import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="RankIt home">rankit<span>_</span></Link>
      <nav className="header-nav">
        <Link className="header-link" href="/mine">Your rankings</Link>
        <Link className="header-create" href="/create">Create a list <span aria-hidden="true">↗</span></Link>
      </nav>
    </header>
  );
}
