import "server-only";

import { getDemoList } from "@/lib/demo-data";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import type { RankItem, RankedList } from "@/lib/types";

export async function getServerPublicList(slug: string): Promise<RankedList | null> {
  const firebase = getFirebaseAdmin();
  if (!firebase) return getDemoList(slug);

  const listSnapshot = await firebase.db.collection("lists").where("slug", "==", slug).limit(1).get();
  if (listSnapshot.empty) return null;

  const listDoc = listSnapshot.docs[0];
  const itemSnapshot = await listDoc.ref.collection("items").orderBy("creatorPosition", "asc").get();
  const data = listDoc.data();
  const items: RankItem[] = itemSnapshot.docs.map((item) => {
    const itemData = item.data();
    return {
      id: item.id,
      title: String(itemData.title),
      imageUrl: typeof itemData.imageUrl === "string" ? itemData.imageUrl : null,
      creatorPosition: Number(itemData.creatorPosition),
      rating: Number(itemData.rating ?? 1000),
      rank: Number(itemData.rank ?? 1),
      comparisonCount: Number(itemData.comparisonCount ?? 0)
    };
  });

  return {
    id: listDoc.id,
    slug: String(data.slug),
    title: String(data.title),
    creatorId: String(data.creatorId),
    coverImageUrl: typeof data.coverImageUrl === "string" ? data.coverImageUrl : null,
    isSeed: Boolean(data.isSeed),
    published: Boolean(data.published),
    voteCount: Number(data.voteCount ?? 0),
    itemCount: Number(data.itemCount ?? items.length),
    createdAt: data.createdAt?.toDate?.().toISOString?.() ?? null,
    items
  };
}
