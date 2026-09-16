"use client";

import { useEffect, useMemo, useState } from "react";
import { castFirebaseVote, getVotingSession, isFirebaseConfigured, subscribeToList } from "@/lib/firebase/client";
import { pairKey, rankItems } from "@/lib/ranking";
import type { RankItem, RankedList } from "@/lib/types";

function nextPair(items: RankItem[], seen: Set<string>) {
  const ranked = rankItems(items);
  const pairs: Array<{ first: RankItem; second: RankItem; distance: number }> = [];
  for (let a = 0; a < ranked.length; a += 1) {
    for (let b = a + 1; b < ranked.length; b += 1) {
      if (!seen.has(pairKey(ranked[a].id, ranked[b].id))) {
        pairs.push({ first: ranked[a], second: ranked[b], distance: Math.abs(ranked[a].rating - ranked[b].rating) });
      }
    }
  }
  return pairs.sort((a, b) => a.distance - b.distance)[0] ?? null;
}

function Choice({ item, onPick, disabled }: { item: RankItem; onPick: () => void; disabled: boolean }) {
  return (
    <button className="embed-choice" type="button" disabled={disabled} onClick={onPick}>
      {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="embed-initial">{item.title.slice(0, 1).toUpperCase()}</span>}
      <strong>{item.title}</strong>
      <span>Pick →</span>
    </button>
  );
}

export function EmbedListClient({ initialList }: { initialList: RankedList }) {
  const [list, setList] = useState(initialList);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const live = isFirebaseConfigured() && !list.id.startsWith("demo-");
  const order = useMemo(() => rankItems(list.items), [list.items]);
  const pair = useMemo(() => nextPair(order, seen), [order, seen]);

  useEffect(() => {
    if (!live) return;
    getVotingSession(list.id).then((session) => {
      setCompleted(session.count);
      setSeen(new Set(session.seenPairs));
    }).catch(() => undefined);
    return subscribeToList(list.id, {
      onItems: (items) => items.length && setList((current) => ({ ...current, items })),
      onVoteCount: (voteCount) => setList((current) => ({ ...current, voteCount }))
    });
  }, [list.id, live]);

  async function vote(winnerId: string) {
    if (!pair || busy || completed >= 5) return;
    if (!live) return setMessage("Open the full ranking to vote.");
    try {
      setBusy(true);
      setMessage("");
      const result = await castFirebaseVote(list, pair.first.id, pair.second.id, winnerId);
      setList((current) => ({ ...current, items: result.items, voteCount: result.voteCount }));
      setCompleted(result.sessionVotes);
      setSeen(new Set(result.seenPairs));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That vote did not go through.");
    } finally {
      setBusy(false);
    }
  }

  const done = completed >= 5 || !pair;
  return (
    <main className="embed-app">
      <header className="embed-header">
        <a className="embed-brand" href="/" target="_blank" rel="noreferrer"><span>▤</span> rankit_</a>
        <a href={`/l/${list.slug}`} target="_blank" rel="noreferrer">Open full board ↗</a>
      </header>
      <section className="embed-title">
        <p>LIVE RANKING · {list.itemCount} PICKS</p>
        <h1>{list.title}</h1>
        <div><span>{list.voteCount} choices</span><span>{Math.min(completed, 5)}/5 yours</span></div>
      </section>
      {!done ? (
        <section className="embed-vote" aria-label="Vote on this ranking">
          <div className="embed-vote-head"><strong>Which belongs higher?</strong><span>Choice {completed + 1} of 5</span></div>
          <div className="embed-progress">{[0,1,2,3,4].map((step) => <i className={step < completed ? "done" : step === completed ? "current" : ""} key={step} />)}</div>
          <div className="embed-choices">
            <Choice item={pair.first} disabled={busy} onPick={() => void vote(pair.first.id)} />
            <b>OR</b>
            <Choice item={pair.second} disabled={busy} onPick={() => void vote(pair.second.id)} />
          </div>
          {message && <p className="embed-message" role="alert">{message}</p>}
        </section>
      ) : (
        <section className="embed-done"><span>✓</span><div><strong>Your take is on the board.</strong><p>See how the full community ranking moved.</p></div><a href={`/l/${list.slug}`} target="_blank" rel="noreferrer">See results ↗</a></section>
      )}
      <section className="embed-board">
        <div className="embed-board-head"><strong>Community top five</strong><span>updates live</span></div>
        <ol>{order.slice(0, 5).map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><small>{item.comparisonCount} cmp.</small></li>)}</ol>
      </section>
      <footer className="embed-footer"><span>Powered by RankIt</span><a href="/create" target="_blank" rel="noreferrer">Make your own ranking →</a></footer>
    </main>
  );
}
