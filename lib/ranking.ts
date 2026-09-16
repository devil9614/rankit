import type { RankItem } from "@/lib/types";

export function getExpectedScore(rating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

export function calculateEloWinner(winnerRating: number, loserRating: number, k = 24) {
  const expected = getExpectedScore(winnerRating, loserRating);
  return {
    winner: Math.round(winnerRating + k * (1 - expected)),
    loser: Math.round(loserRating + k * (0 - (1 - expected)))
  };
}

export function rankItems(items: RankItem[]) {
  return [...items]
    .sort((a, b) => b.rating - a.rating || a.creatorPosition - b.creatorPosition)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function pairKey(a: string, b: string) {
  return [a, b].sort().join("_");
}

export type PersonalVote = {
  winnerId: string;
  loserId: string;
};

// Orders items by the choices this visitor actually made. A visitor only sees
// five matchups, so most items carry no signal: those keep the creator's order
// rather than being pushed around. Items the visitor beat down are ranked below
// untouched ones, since losing a head-to-head is real evidence and silence is not.
export function personalOrder(items: RankItem[], votes: PersonalVote[]) {
  const record = new Map<string, number>();
  for (const vote of votes) {
    record.set(vote.winnerId, (record.get(vote.winnerId) ?? 0) + 1);
    record.set(vote.loserId, (record.get(vote.loserId) ?? 0) - 1);
  }
  return [...items]
    .sort((a, b) => {
      const scoreGap = (record.get(b.id) ?? 0) - (record.get(a.id) ?? 0);
      if (scoreGap !== 0) return scoreGap;
      return a.creatorPosition - b.creatorPosition;
    })
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

// Share of judged pairs where the visitor's winner sits below the community's
// order. 0 means complete agreement, 1 means they disagreed on every matchup.
export function contrarianScore(communityOrder: RankItem[], votes: PersonalVote[]) {
  if (!votes.length) return null;
  const position = new Map(communityOrder.map((item, index) => [item.id, index]));
  let disagreements = 0;
  let counted = 0;
  for (const vote of votes) {
    const winner = position.get(vote.winnerId);
    const loser = position.get(vote.loserId);
    if (winner === undefined || loser === undefined) continue;
    counted += 1;
    if (winner > loser) disagreements += 1;
  }
  return counted ? disagreements / counted : null;
}

export function contrarianLabel(score: number) {
  if (score === 0) return { title: "In lockstep", note: "Every call matched the room." };
  if (score <= 0.25) return { title: "Mostly aligned", note: "You and the crowd read this list the same way." };
  if (score <= 0.5) return { title: "Independent", note: "You broke from the room on a few of these." };
  if (score < 1) return { title: "Contrarian", note: "You disagreed with the crowd more often than not." };
  return { title: "Total outlier", note: "You went against the room on every single pick." };
}
