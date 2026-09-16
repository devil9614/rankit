"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RankReveal } from "@/components/rank-reveal";
import { SiteHeader } from "@/components/site-header";
import { castFirebaseVote, getVotingSession, isFirebaseConfigured, subscribeToList } from "@/lib/firebase/client";
import { rememberVotedList } from "@/lib/local-history";
import { pairKey, rankItems, type PersonalVote } from "@/lib/ranking";
import type { RankItem, RankedList } from "@/lib/types";

function findNextPair(items: RankItem[], seen: Set<string>) {
  const ranked = rankItems(items);
  const candidates: Array<{ first: RankItem; second: RankItem; distance: number }> = [];
  for (let firstIndex = 0; firstIndex < ranked.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < ranked.length; secondIndex += 1) {
      const first = ranked[firstIndex];
      const second = ranked[secondIndex];
      if (!seen.has(pairKey(first.id, second.id))) {
        candidates.push({ first, second, distance: Math.abs(first.rating - second.rating) });
      }
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0] ?? null;
}

function ItemVisual({ item, rank }: { item: RankItem; rank?: number }) {
  return (
    <div className="item-visual">
      {rank !== undefined && <span className="item-rank">{String(rank).padStart(2, "0")}</span>}
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
      ) : (
        <span className="item-initial">{item.title.slice(0, 1).toUpperCase()}</span>
      )}
      <span className="item-name">{item.title}</span>
    </div>
  );
}

function movementFromOriginal(item: RankItem, communityRank: number) {
  const delta = item.creatorPosition - communityRank;
  if (delta === 0) return { label: "unchanged", tone: "same" };
  return delta > 0
    ? { label: `↑ ${delta} vs creator`, tone: "up" }
    : { label: `↓ ${Math.abs(delta)} vs creator`, tone: "down" };
}

export function ListDetailClient({ initialList }: { initialList: RankedList }) {
  const [list, setList] = useState(initialList);
  const [seenPairs, setSeenPairs] = useState<Set<string>>(() => new Set());
  const [completed, setCompleted] = useState(0);
  const [picks, setPicks] = useState<PersonalVote[]>([]);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState("");
  const [copied, setCopied] = useState(false);
  const communityOrder = useMemo(() => rankItems(list.items), [list.items]);
  const creatorOrder = useMemo(() => [...list.items].sort((a, b) => a.creatorPosition - b.creatorPosition), [list.items]);
  const pair = useMemo(() => findNextPair(communityOrder, seenPairs), [communityOrder, seenPairs]);
  const firebaseReady = isFirebaseConfigured();
  const isPreviewList = list.id.startsWith("demo-");
  const votingComplete = completed >= 5;

  useEffect(() => {
    if (!firebaseReady || isPreviewList) return;
    getVotingSession(list.id)
      .then((session) => {
        setCompleted(session.count);
        setSeenPairs(new Set(session.seenPairs));
        setPicks(session.picks);
      })
      .catch(() => undefined);
  }, [firebaseReady, isPreviewList, list.id]);

  // Keep the community board live while the visitor is reading it.
  useEffect(() => {
    if (!firebaseReady || isPreviewList) return;
    return subscribeToList(list.id, {
      onItems: (items) => {
        if (items.length) setList((current) => ({ ...current, items }));
      },
      onVoteCount: (voteCount) => setList((current) => ({ ...current, voteCount }))
    });
  }, [firebaseReady, isPreviewList, list.id]);

  async function castVote(winnerId: string) {
    if (!pair || isVoting || votingComplete) return;
    if (!firebaseReady || isPreviewList) {
      setVoteError("This is a preview list. Run the Firebase seed once to open real voting.");
      return;
    }
    try {
      setIsVoting(true);
      setVoteError("");
      const result = await castFirebaseVote(list, pair.first.id, pair.second.id, winnerId);
      setList((current) => ({ ...current, items: result.items, voteCount: result.voteCount }));
      setSeenPairs(new Set(result.seenPairs));
      setCompleted(result.sessionVotes);
      setPicks(result.picks);
      rememberVotedList(list.slug, list.title);
    } catch (error) {
      setVoteError(error instanceof Error ? error.message : "Vote not accepted. Try again.");
    } finally {
      setIsVoting(false);
    }
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: list.title, text: "What is your order?", url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main>
      <div className="page-shell list-shell">
        <SiteHeader />
        <section className="list-hero">
          <div>
            <p className="eyebrow">ranking / {list.itemCount} picks</p>
            <h1>{list.title}</h1>
          </div>
          <button type="button" className="share-button" onClick={() => void share()}>{copied ? "Link copied" : "Share"} <span aria-hidden="true">↗</span></button>
        </section>

        <div className="ranking-layout">
          <section className="creator-ranking" aria-labelledby="creator-order-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">the original take</p>
                <h2 id="creator-order-title">Creator’s ranking</h2>
              </div>
              <span className="section-note">Set in stone</span>
            </div>
            <ol className="ranking-list">
              {creatorOrder.map((item, index) => (
                <li key={item.id}><ItemVisual item={item} rank={index + 1} /></li>
              ))}
            </ol>
          </section>

          <aside className="vote-panel" aria-labelledby="vote-title">
            <div className="vote-panel-top">
              <p className="eyebrow"><span className="live-dot" /> your turn</p>
              <span>{Math.min(completed + 1, 5)} / 5</span>
            </div>
            <div className="vote-progress" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((step) => <span className={step < completed ? "is-complete" : step === completed ? "is-current" : ""} key={step} />)}
            </div>
            {votingComplete ? (
              <div className="vote-finish">
                <p className="vote-kicker">You made your case.</p>
                <h2 id="vote-title">The board has moved.</h2>
                <p>Five choices added. See how your order stacks up against the room.</p>
                <a className="button button-light" href="#rank-reveal">See your verdict ↓</a>
              </div>
            ) : pair ? (
              <>
                <h2 id="vote-title">Which belongs higher?</h2>
                <p className="vote-instruction">Trust your first instinct. There are no wrong answers—just more interesting arguments.</p>
                <div className="choice-stack">
                  <button className="choice-card" disabled={isVoting} onClick={() => void castVote(pair.first.id)}>
                    <ItemVisual item={pair.first} />
                    <span className="choice-action">Pick this <span aria-hidden="true">→</span></span>
                  </button>
                  <span className="versus">or</span>
                  <button className="choice-card" disabled={isVoting} onClick={() => void castVote(pair.second.id)}>
                    <ItemVisual item={pair.second} />
                    <span className="choice-action">Pick this <span aria-hidden="true">→</span></span>
                  </button>
                </div>
                {voteError && <p className="vote-error" role="alert">{voteError}</p>}
              </>
            ) : (
              <div className="vote-finish"><h2 id="vote-title">No more fresh matchups.</h2><p>Come back as the list grows.</p></div>
            )}
          </aside>
        </div>

        {picks.length > 0 && (
          <div id="rank-reveal">
            <RankReveal
              communityOrder={communityOrder}
              picks={picks}
              onShare={() => void share()}
              shareLabel={copied ? "Link copied" : "Share your verdict"}
            />
          </div>
        )}

        <section className="community-ranking" id="community-ranking" aria-labelledby="community-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">the room responds</p>
              <h2 id="community-title">Community ranking</h2>
            </div>
            <span className="section-note">{list.voteCount} choices recorded</span>
          </div>
          {list.voteCount === 0 ? (
            <p className="empty-community">No one has moved the order yet. Be the first person to put a vote behind an opinion.</p>
          ) : (
            <ol className="community-list">
              {communityOrder.map((item, index) => (
                <li key={item.id}>
                  <ItemVisual item={item} rank={index + 1} />
                  <div className="community-meta">
                    <span className="comparison-count">{item.comparisonCount} comparisons</span>
                    {(() => {
                      const movement = movementFromOriginal(item, index + 1);
                      return <span className={`rank-shift ${movement.tone}`}>{movement.label}</span>;
                    })()}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="make-own">
          <p className="eyebrow">your turn to start one</p>
          <h2>Got a better order?</h2>
          <Link className="button button-primary" href="/create">Make your ranking <span aria-hidden="true">→</span></Link>
        </section>
      </div>
    </main>
  );
}
