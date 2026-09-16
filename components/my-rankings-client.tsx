"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { clearHistory, getCreatedLists, getVotedLists, type HistoryEntry } from "@/lib/local-history";

function HistorySection({ title, note, entries, emptyCopy }: {
  title: string;
  note: string;
  entries: HistoryEntry[];
  emptyCopy: string;
}) {
  return (
    <section className="history-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{note}</p>
          <h2>{title}</h2>
        </div>
        <span className="list-count">{entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <p className="empty-community">{emptyCopy}</p>
      ) : (
        <ul className="history-list">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <Link href={`/l/${entry.slug}`}>
                <span className="history-title">{entry.title}</span>
                <span className="history-date">{new Date(entry.savedAt).toLocaleDateString()}</span>
                <span aria-hidden="true">↗</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MyRankingsClient() {
  const [created, setCreated] = useState<HistoryEntry[]>([]);
  const [voted, setVoted] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCreated(getCreatedLists());
    setVoted(getVotedLists());
    setLoaded(true);
  }, []);

  function forgetEverything() {
    clearHistory();
    setCreated([]);
    setVoted([]);
  }

  return (
    <main>
      <div className="page-shell history-shell">
        <SiteHeader />
        <section className="history-intro">
          <p className="eyebrow">saved in this browser</p>
          <h1>Your rankings.</h1>
          <p className="lede">
            RankIt has no accounts, so this history lives in this browser only. Clearing site data clears this page —
            keep the links you care about.
          </p>
        </section>

        {loaded && (
          <>
            <HistorySection
              title="Lists you made"
              note="your work"
              entries={created}
              emptyCopy="Nothing published from this browser yet."
            />
            <HistorySection
              title="Lists you judged"
              note="your votes"
              entries={voted}
              emptyCopy="No votes cast from this browser yet."
            />
            {(created.length > 0 || voted.length > 0) && (
              <button type="button" className="forget-button" onClick={forgetEverything}>
                Forget this history
              </button>
            )}
          </>
        )}

        <section className="make-own">
          <p className="eyebrow">start another</p>
          <h2>One more ranking?</h2>
          <Link className="button button-primary" href="/create">Make a ranking <span aria-hidden="true">→</span></Link>
        </section>
      </div>
    </main>
  );
}
