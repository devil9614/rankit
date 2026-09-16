"use client";

import { useMemo } from "react";
import { contrarianLabel, contrarianScore, personalOrder, type PersonalVote } from "@/lib/ranking";
import type { RankItem } from "@/lib/types";

type RankRevealProps = {
  communityOrder: RankItem[];
  picks: PersonalVote[];
  onShare: () => void;
  shareLabel: string;
};

export function RankReveal({ communityOrder, picks, onShare, shareLabel }: RankRevealProps) {
  const yourOrder = useMemo(() => personalOrder(communityOrder, picks), [communityOrder, picks]);
  const score = useMemo(() => contrarianScore(communityOrder, picks), [communityOrder, picks]);
  const communityPosition = useMemo(
    () => new Map(communityOrder.map((item, index) => [item.id, index + 1])),
    [communityOrder]
  );

  if (score === null) return null;
  const verdict = contrarianLabel(score);
  const percent = Math.round(score * 100);

  return (
    <section className="rank-reveal" aria-labelledby="reveal-title">
      <div className="reveal-verdict">
        <p className="eyebrow">the verdict</p>
        <h2 id="reveal-title">{verdict.title}</h2>
        <p className="reveal-note">{verdict.note}</p>
        <div className="reveal-meter" role="img" aria-label={`You disagreed with the community on ${percent}% of your matchups.`}>
          <div className="reveal-meter-fill" style={{ width: `${Math.max(percent, 4)}%` }} />
        </div>
        <p className="reveal-stat"><strong>{percent}%</strong> of your matchups went against the room</p>
        <button type="button" className="button button-light" onClick={onShare}>{shareLabel} <span aria-hidden="true">↗</span></button>
      </div>

      <div className="reveal-compare">
        <div className="reveal-column-head">
          <span>Your order</span>
          <span>vs the room</span>
        </div>
        <ol className="reveal-list">
          {yourOrder.map((item, index) => {
            const theirs = communityPosition.get(item.id) ?? index + 1;
            const delta = theirs - (index + 1);
            const tone = delta === 0 ? "same" : delta > 0 ? "up" : "down";
            const label = delta === 0 ? "same spot" : delta > 0 ? `you had it ${delta} higher` : `you had it ${Math.abs(delta)} lower`;
            return (
              <li key={item.id}>
                <span className="reveal-rank">{String(index + 1).padStart(2, "0")}</span>
                <span className="reveal-name">{item.title}</span>
                <span className={`reveal-delta ${tone}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
