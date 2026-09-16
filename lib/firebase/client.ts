"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
} from "firebase/firestore";
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
  const listQuery = query(collection(db, "lists"), where("slug", "==", slug), limit(1));
  const listSnapshot = await getDocs(listQuery);
  if (listSnapshot.empty) return null;
  const listDoc = listSnapshot.docs[0];
  const itemSnapshot = await getDocs(query(collection(listDoc.ref, "items"), orderBy("creatorPosition", "asc")));
  return toList(listDoc.id, listDoc.data(), itemSnapshot.docs.map((item) => toRankItem(item.id, item.data())));
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
