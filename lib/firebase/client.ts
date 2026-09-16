"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch
} from "firebase/firestore";
import { calculateEloWinner, pairKey } from "@/lib/ranking";
import { slugify } from "@/lib/slug";
import type { DraftItem, ListCard, RankItem, RankedList } from "@/lib/types";

const webConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export function isFirebaseConfigured() {
  return Boolean(webConfig.apiKey && webConfig.authDomain && webConfig.projectId && webConfig.appId);
}

function app(): FirebaseApp {
  if (!isFirebaseConfigured()) throw new Error("Firebase has not been configured.");
  return getApps().length ? getApp() : initializeApp(webConfig);
}

export function getFirebaseAuth() {
  return getAuth(app());
}

function firestore() {
  return getFirestore(app());
}

export async function ensureAnonymousUser(): Promise<User> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;

  const current = await new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

  if (current) return current;
  return (await signInAnonymously(auth)).user;
}

function toRankItem(id: string, data: Record<string, unknown>): RankItem {
  return {
    id,
    title: String(data.title ?? "Untitled item"),
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : null,
    creatorPosition: Number(data.creatorPosition ?? 1),
    rating: Number(data.rating ?? 1000),
    rank: Number(data.rank ?? 1),
    comparisonCount: Number(data.comparisonCount ?? 0)
  };
}

function toList(id: string, data: Record<string, unknown>, items: RankItem[]): RankedList {
  return {
    id,
    slug: String(data.slug),
    title: String(data.title),
    creatorId: String(data.creatorId),
    coverImageUrl: typeof data.coverImageUrl === "string" ? data.coverImageUrl : null,
    isSeed: Boolean(data.isSeed),
    published: Boolean(data.published),
    voteCount: Number(data.voteCount ?? 0),
    itemCount: Number(data.itemCount ?? items.length),
    createdAt: null,
    items
  };
}

export async function createPublishedList(title: string, draftItems: DraftItem[]) {
  const user = await ensureAnonymousUser();
  const db = firestore();
  const cleanItems = draftItems
    .map((item) => ({ ...item, title: item.title.trim(), imageUrl: item.imageUrl.trim() }))
    .filter((item) => item.title.length > 0);
  const slug = `${slugify(title)}-${crypto.randomUUID().slice(0, 6)}`;
  const listRef = doc(collection(db, "lists"));
  const batch = writeBatch(db);

  batch.set(doc(db, "users", user.uid), { id: user.uid, createdAt: serverTimestamp(), lastSeenAt: serverTimestamp() }, { merge: true });
  batch.set(listRef, {
    title: title.trim(),
    slug,
    creatorId: user.uid,
    coverImageUrl: null,
    isSeed: false,
    published: true,
    itemCount: cleanItems.length,
    voteCount: 0,
    createdAt: serverTimestamp(),
    publishedAt: serverTimestamp(),
    activityAt: serverTimestamp()
  });

  cleanItems.forEach((item, index) => {
    const itemRef = doc(collection(listRef, "items"));
    batch.set(itemRef, {
      title: item.title,
      imageUrl: item.imageUrl || null,
      creatorPosition: index + 1,
      rating: 1000,
      rank: index + 1,
      comparisonCount: 0,
      createdAt: serverTimestamp()
    });
  });

  await batch.commit();
  return slug;
}

export async function getPublicListBySlug(slug: string) {
  const db = firestore();
  const listQuery = query(collection(db, "lists"), where("slug", "==", slug), where("published", "==", true), limit(1));
  const listSnapshot = await getDocs(listQuery);
  if (listSnapshot.empty) return null;
  const listDoc = listSnapshot.docs[0];
  const itemSnapshot = await getDocs(query(collection(listDoc.ref, "items"), orderBy("creatorPosition", "asc")));
  return toList(listDoc.id, listDoc.data(), itemSnapshot.docs.map((item) => toRankItem(item.id, item.data())));
}

export async function getVotingSession(listId: string) {
  const user = await ensureAnonymousUser();
  const snapshot = await getDoc(doc(firestore(), "lists", listId, "sessions", user.uid));
  const data = snapshot.data();
  return {
    count: Number(data?.count ?? 0),
    seenPairs: Array.isArray(data?.seenPairs) ? data.seenPairs.filter((value): value is string => typeof value === "string") : []
  };
}

export async function castFirebaseVote(list: RankedList, itemAId: string, itemBId: string, winnerItemId: string) {
  const user = await ensureAnonymousUser();
  const db = firestore();
  const listRef = doc(db, "lists", list.id);
  const canonicalPair = pairKey(itemAId, itemBId);
  const voteId = `${user.uid}_${canonicalPair}`;
  const voteRef = doc(db, "lists", list.id, "votes", voteId);
  const sessionRef = doc(db, "lists", list.id, "sessions", user.uid);
  const itemRefs = list.items.map((item) => doc(db, "lists", list.id, "items", item.id));

  return runTransaction(db, async (transaction) => {
    const listSnapshot = await transaction.get(listRef);
    const voteSnapshot = await transaction.get(voteRef);
    const sessionSnapshot = await transaction.get(sessionRef);
    const itemSnapshots = await Promise.all(itemRefs.map((itemRef) => transaction.get(itemRef)));
    if (!listSnapshot.exists() || listSnapshot.data().published !== true) throw new Error("This list is no longer available.");
    if (voteSnapshot.exists()) throw new Error("You have already judged this matchup.");

    const priorSessionVotes = Number(sessionSnapshot.data()?.count ?? 0);
    const priorSeenPairs = Array.isArray(sessionSnapshot.data()?.seenPairs)
      ? sessionSnapshot.data()!.seenPairs.filter((value: unknown): value is string => typeof value === "string")
      : [];
    if (priorSessionVotes >= 5) throw new Error("You have already made five choices on this list.");

    const items = itemSnapshots.map((snapshot) => {
      if (!snapshot.exists()) throw new Error("One of the ranked items no longer exists.");
      return toRankItem(snapshot.id, snapshot.data());
    });
    const first = items.find((item) => item.id === itemAId);
    const second = items.find((item) => item.id === itemBId);
    if (!first || !second || (winnerItemId !== first.id && winnerItemId !== second.id)) throw new Error("That matchup is not valid.");

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
    const sessionVotes = priorSessionVotes + 1;

    ranked.forEach((item) => transaction.update(doc(db, "lists", list.id, "items", item.id), {
      rating: item.rating,
      rank: item.rank,
      comparisonCount: item.comparisonCount
    }));
    transaction.set(voteRef, {
      listId: list.id,
      itemAId: [itemAId, itemBId].sort()[0],
      itemBId: [itemAId, itemBId].sort()[1],
      winnerItemId,
      voterId: user.uid,
      sequence: sessionVotes,
      createdAt: serverTimestamp()
    });
    transaction.set(sessionRef, {
      count: sessionVotes,
      lastVoteId: voteId,
      seenPairs: [...priorSeenPairs, canonicalPair],
      updatedAt: serverTimestamp()
    });
    transaction.update(listRef, {
      voteCount: Number(listSnapshot.data().voteCount ?? 0) + 1,
      activityAt: serverTimestamp()
    });

    return {
      items: ranked,
      voteCount: Number(listSnapshot.data().voteCount ?? 0) + 1,
      sessionVotes,
      seenPairs: [...priorSeenPairs, canonicalPair]
    };
  });
}

export async function getPublishedLists(): Promise<ListCard[]> {
  const db = firestore();
  const listQuery = query(
    collection(db, "lists"),
    where("published", "==", true),
    orderBy("activityAt", "desc"),
    limit(24)
  );
  const snapshot = await getDocs(listQuery);
  return snapshot.docs.map((item) => ({
    id: item.id,
    slug: String(item.data().slug),
    title: String(item.data().title),
    isSeed: Boolean(item.data().isSeed),
    voteCount: Number(item.data().voteCount ?? 0),
    itemCount: Number(item.data().itemCount ?? 0)
  }));
}
