import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="RankIt home">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span className="brand-name">rankit<span>_</span></span>
      </Link>
      <nav className="header-nav">
        <Link className="header-link" href="/mine">Your rankings</Link>
        <Link className="header-create" href="/create"><span className="header-create-plus" aria-hidden="true">+</span> Create a list</Link>
      </nav>
    </header>
  );
}
