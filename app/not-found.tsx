import Link from "next/link";

export default function NotFound() {
  return (
    <main className="empty-page">
      <p className="eyebrow">404 / lost in the rankings</p>
      <h1>That list is not on the board.</h1>
      <Link className="button button-primary" href="/">Explore the lists</Link>
    </main>
  );
}
