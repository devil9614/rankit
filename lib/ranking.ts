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
