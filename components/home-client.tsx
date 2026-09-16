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
          <p className="eyebrow"><span className="live-dot" /> {isLive ? "live rankings" : "the argument starts here"}</p>
          <h1 id="home-title">Put your order<br />on the record.</h1>
          <p className="lede">Make a list, share it, then see what happens when everyone else gets five choices to disagree.</p>
          <Link className="button button-primary" href="/create">Start a ranking <span aria-hidden="true">→</span></Link>
        </section>

        <section className="list-board" aria-labelledby="explore-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">open for judgment</p>
              <h2 id="explore-title">On the board</h2>
            </div>
            <span className="list-count">{lists.length} lists</span>
          </div>

          <div className="list-grid">
            {lists.map((list, index) => (
              <Link className="list-card" href={`/l/${list.slug}`} key={list.id}>
                <div className="card-topline">
                  <span className="card-index">{cardMarks[index] ?? String(index + 1).padStart(2, "0")}</span>
                  {list.isSeed && <span className="seed-tag">starter list</span>}
                </div>
                <h3>{list.title}</h3>
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
