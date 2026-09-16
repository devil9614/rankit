"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { getPublishedLists, isFirebaseConfigured } from "@/lib/firebase/client";
import type { ListCard } from "@/lib/types";

const cardMarks = ["01", "02", "03", "04", "05", "06", "07", "08"];

export function HomeClient({ initialLists }: { initialLists: ListCard[] }) {
  const [lists, setLists] = useState(initialLists);
  const [isLive, setIsLive] = useState(false);
  const totalChoices = lists.reduce((total, list) => total + list.voteCount, 0);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    getPublishedLists()
      .then((published) => {
        if (published.length) setLists(published);
        setIsLive(true);
      })
      .catch(() => setIsLive(false));
  }, []);

  return (
    <main>
      <div className="page-shell home-shell">
        <SiteHeader />

        <section className="home-intro" aria-labelledby="home-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="live-dot" /> {isLive ? "live rankings" : "the argument starts here"}</p>
            <h1 id="home-title">Put your taste<br /><em>on the record.</em></h1>
            <p className="lede">Build your definitive order. Drop the link. Let everyone else make five impossible choices—and watch the ranking move.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/create">Start a ranking <span aria-hidden="true">→</span></Link>
              <a className="text-link" href="#explore-title">See what’s being judged <span aria-hidden="true">↓</span></a>
            </div>
          </div>
          <div className="hero-scorecard" aria-label="How RankIt works">
            <div className="scorecard-stamp">Your opinion<br />versus everyone</div>
            <div className="scorecard-row"><strong>01</strong><span>Rank anything</span></div>
            <div className="scorecard-row"><strong>02</strong><span>Share one link</span></div>
            <div className="scorecard-row"><strong>03</strong><span>Settle it in 5 picks</span></div>
            <div className="scorecard-foot"><span>No account</span><span>Live results</span></div>
          </div>
        </section>

        <div className="pulse-strip" aria-label="RankIt activity summary">
          <span><strong>{lists.length}</strong> boards open</span>
          <span><strong>{totalChoices}</strong> choices cast</span>
          <span><strong>5</strong> taps to have a say</span>
          <span className="pulse-message">Strong opinions encouraged</span>
        </div>

        <section className="list-board" aria-labelledby="explore-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">open for judgment</p>
              <h2 id="explore-title">On the board</h2>
            </div>
            <span className="list-count"><span className="live-dot" /> {lists.length} live boards</span>
          </div>

          <div className="list-grid">
            {lists.map((list, index) => (
              <Link className="list-card" href={`/l/${list.slug}`} key={list.id}>
                <div className="card-topline">
                  <span className="card-index">{cardMarks[index] ?? String(index + 1).padStart(2, "0")}</span>
                  {list.closesAt ? <span className="seed-tag competition-tag">timed</span> : list.isSeed && <span className="seed-tag">starter list</span>}
                </div>
                <h3>{list.title}</h3>
                <p className="card-prompt">What belongs at the top?</p>
                <div className="card-meta">
                  <span>{list.itemCount} picks</span>
                  <span>{list.voteCount ? `${list.voteCount} choices` : "open now"}</span>
                </div>
                <span className="card-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
