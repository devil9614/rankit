import { existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { collection, doc, getDocs, getFirestore, limit, query, serverTimestamp, where, writeBatch } from "firebase/firestore";

if (existsSync(".env.local") && process.loadEnvFile) process.loadEnvFile(".env.local");

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
  throw new Error("Add the NEXT_PUBLIC_FIREBASE_* web settings to .env.local before seeding.");
}

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const user = (await signInAnonymously(auth)).user;

const seeds = [
  ["Every Assassin's Creed game, ranked", ["Assassin's Creed II", "Assassin's Creed IV: Black Flag", "Assassin's Creed Brotherhood", "Assassin's Creed Origins", "Assassin's Creed Unity", "Assassin's Creed Valhalla"]],
  ["AI tools that actually earn a tab", ["ChatGPT", "Claude", "Cursor", "Perplexity", "Notion AI", "Midjourney"]],
  ["Anime arcs that never let go", ["Chimera Ant", "Return to Shiganshina", "Shibuya Incident", "Pain's Assault", "Dark Tournament"]],
  ["Movie openings that set the whole room on fire", ["The Dark Knight", "Inglourious Basterds", "Baby Driver", "Scream", "The Social Network"]],
  ["Albums worth listening through, no skips", ["To Pimp a Butterfly", "Blonde", "Rumours", "The Miseducation of Lauryn Hill", "Currents"]],
  ["Midnight snacks worth making properly", ["Grilled cheese", "Maggi", "Ramen with an egg", "Peanut butter toast", "Leftover pizza"]]
];

for (const [title, itemTitles] of seeds) {
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 54)}-seed`;
  const existing = await getDocs(query(collection(db, "lists"), where("slug", "==", slug), where("published", "==", true), limit(1)));
  if (!existing.empty) continue;

  const listRef = doc(collection(db, "lists"));
  const batch = writeBatch(db);
  batch.set(doc(db, "users", user.uid), { id: user.uid, createdAt: serverTimestamp(), lastSeenAt: serverTimestamp() }, { merge: true });
  batch.set(listRef, {
    title,
    slug,
    creatorId: user.uid,
    coverImageUrl: null,
    isSeed: true,
    published: true,
    itemCount: itemTitles.length,
    voteCount: 0,
    createdAt: serverTimestamp(),
    publishedAt: serverTimestamp(),
    activityAt: serverTimestamp()
  });
  itemTitles.forEach((itemTitle, index) => {
    batch.set(doc(collection(listRef, "items")), {
      title: itemTitle,
      imageUrl: null,
      creatorPosition: index + 1,
      rating: 1000,
      rank: index + 1,
      comparisonCount: 0,
      createdAt: serverTimestamp()
    });
  });
  await batch.commit();
  console.log(`Seeded: ${title}`);
}

console.log("Seed lists are ready.");
process.exit(0);
