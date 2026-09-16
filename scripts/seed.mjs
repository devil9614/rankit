import { existsSync } from "node:fs";

if (existsSync(".env.local") && process.loadEnvFile) process.loadEnvFile(".env.local");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to .env.local before seeding.");
}

const { cert, initializeApp } = await import("firebase-admin/app");
const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

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
  const existing = await db.collection("lists").where("slug", "==", slug).limit(1).get();
  if (!existing.empty) continue;

  const listRef = db.collection("lists").doc();
  const batch = db.batch();
  batch.set(listRef, {
    title,
    slug,
    creatorId: "rankit-seed",
    coverImageUrl: null,
    isSeed: true,
    published: true,
    itemCount: itemTitles.length,
    voteCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    publishedAt: FieldValue.serverTimestamp(),
    activityAt: FieldValue.serverTimestamp()
  });
  itemTitles.forEach((itemTitle, index) => {
    batch.set(listRef.collection("items").doc(), {
      title: itemTitle,
      imageUrl: null,
      creatorPosition: index + 1,
      rating: 1000,
      rank: index + 1,
      comparisonCount: 0,
      createdAt: FieldValue.serverTimestamp()
    });
  });
  await batch.commit();
  console.log(`Seeded: ${title}`);
}

console.log("Seed lists are ready.");
