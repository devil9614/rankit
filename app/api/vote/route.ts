import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { calculateEloWinner, pairKey } from "@/lib/ranking";
import type { RankItem } from "@/lib/types";

type VotePayload = {
  listId?: string;
  itemAId?: string;
  itemBId?: string;
  winnerItemId?: string;
};

export async function POST(request: Request) {
  const firebase = getFirebaseAdmin();
  if (!firebase) return NextResponse.json({ error: "Voting service is not configured." }, { status: 503 });

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Your voting session has expired. Refresh and try again." }, { status: 401 });

  let payload: VotePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "That vote was malformed." }, { status: 400 });
  }

  const { listId, itemAId, itemBId, winnerItemId } = payload;
  if (!listId || !itemAId || !itemBId || !winnerItemId || itemAId === itemBId || (winnerItemId !== itemAId && winnerItemId !== itemBId)) {
    return NextResponse.json({ error: "That matchup is not valid." }, { status: 400 });
  }

  let voterId: string;
  try {
    voterId = (await firebase.auth.verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: "Your voting session has expired. Refresh and try again." }, { status: 401 });
  }

  const listRef = firebase.db.collection("lists").doc(listId);
  const itemsRef = listRef.collection("items");
  const canonicalPair = pairKey(itemAId, itemBId);
  const voteRef = listRef.collection("votes").doc(`${voterId}_${canonicalPair}`);
  const sessionRef = listRef.collection("sessions").doc(voterId);

  try {
    const result = await firebase.db.runTransaction(async (transaction) => {
      const [listSnapshot, itemsSnapshot, existingVote, sessionSnapshot] = await Promise.all([
        transaction.get(listRef),
        transaction.get(itemsRef),
        transaction.get(voteRef),
        transaction.get(sessionRef)
      ]);
      if (!listSnapshot.exists || listSnapshot.data()?.published !== true) throw new Error("This list is no longer available.");
      if (existingVote.exists) throw new Error("You have already judged this matchup.");

      const priorSessionVotes = Number(sessionSnapshot.data()?.count ?? 0);
      if (priorSessionVotes >= 5) throw new Error("You have already made five choices on this list.");

      const items: RankItem[] = itemsSnapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          title: String(data.title),
          imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : null,
          creatorPosition: Number(data.creatorPosition),
          rating: Number(data.rating ?? 1000),
          rank: Number(data.rank ?? 1),
          comparisonCount: Number(data.comparisonCount ?? 0)
        };
      });
      const first = items.find((item) => item.id === itemAId);
      const second = items.find((item) => item.id === itemBId);
      if (!first || !second) throw new Error("One of those items no longer belongs to this list.");

      const winner = winnerItemId === first.id ? first : second;
      const loser = winnerItemId === first.id ? second : first;
      const updatedRatings = calculateEloWinner(winner.rating, loser.rating);
      winner.rating = updatedRatings.winner;
      loser.rating = updatedRatings.loser;
      winner.comparisonCount += 1;
      loser.comparisonCount += 1;
      const ranked = [...items]
        .sort((a, b) => b.rating - a.rating || a.creatorPosition - b.creatorPosition)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      ranked.forEach((item) => transaction.update(itemsRef.doc(item.id), {
        rating: item.rating,
        rank: item.rank,
        comparisonCount: item.comparisonCount
      }));
      transaction.create(voteRef, {
        listId,
        itemAId: [itemAId, itemBId].sort()[0],
        itemBId: [itemAId, itemBId].sort()[1],
        winnerItemId,
        voterId,
        createdAt: FieldValue.serverTimestamp()
      });
      transaction.set(sessionRef, { count: priorSessionVotes + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.update(listRef, {
        voteCount: Number(listSnapshot.data()?.voteCount ?? 0) + 1,
        activityAt: FieldValue.serverTimestamp()
      });

      return { items: ranked, voteCount: Number(listSnapshot.data()?.voteCount ?? 0) + 1, sessionVotes: priorSessionVotes + 1 };
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "That vote was not accepted." },
      { status: 400 }
    );
  }
}
