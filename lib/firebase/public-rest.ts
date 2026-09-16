import "server-only";

import type { RankItem, RankedList } from "@/lib/types";

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
};

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

function value(field: FirestoreValue | undefined) {
  if (!field) return undefined;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  return null;
}

function documentId(document: FirestoreDocument) {
  return document.name.split("/").at(-1) ?? "";
}

export async function getPublicListFromRest(slug: string): Promise<RankedList | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return null;

  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const listResponse = await fetch(`${base}:runQuery?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "lists" }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              { fieldFilter: { field: { fieldPath: "slug" }, op: "EQUAL", value: { stringValue: slug } } },
              { fieldFilter: { field: { fieldPath: "published" }, op: "EQUAL", value: { booleanValue: true } } }
            ]
          }
        },
        limit: 1
      }
    }),
    next: { revalidate: 60 }
  });
  if (!listResponse.ok) return null;

  const rows = await listResponse.json() as Array<{ document?: FirestoreDocument }>;
  const listDocument = rows.find((row) => row.document)?.document;
  if (!listDocument) return null;

  const id = documentId(listDocument);
  const itemUrl = new URL(`${base}/lists/${encodeURIComponent(id)}/items`);
  itemUrl.searchParams.set("key", apiKey);
  itemUrl.searchParams.set("pageSize", "40");
  itemUrl.searchParams.set("orderBy", "creatorPosition");
  const itemResponse = await fetch(itemUrl, { next: { revalidate: 60 } });
  if (!itemResponse.ok) return null;

  const itemBody = await itemResponse.json() as { documents?: FirestoreDocument[] };
  const items: RankItem[] = (itemBody.documents ?? []).map((document) => ({
    id: documentId(document),
    title: String(value(document.fields?.title) ?? "Untitled item"),
    imageUrl: typeof value(document.fields?.imageUrl) === "string" ? String(value(document.fields?.imageUrl)) : null,
    creatorPosition: Number(value(document.fields?.creatorPosition) ?? 1),
    rating: Number(value(document.fields?.rating) ?? 1000),
    rank: Number(value(document.fields?.rank) ?? 1),
    comparisonCount: Number(value(document.fields?.comparisonCount) ?? 0)
  }));
  const fields = listDocument.fields ?? {};

  return {
    id,
    slug: String(value(fields.slug) ?? slug),
    title: String(value(fields.title) ?? "Untitled ranking"),
    creatorId: String(value(fields.creatorId) ?? ""),
    coverImageUrl: typeof value(fields.coverImageUrl) === "string" ? String(value(fields.coverImageUrl)) : null,
    isSeed: Boolean(value(fields.isSeed)),
    published: Boolean(value(fields.published)),
    voteCount: Number(value(fields.voteCount) ?? 0),
    itemCount: Number(value(fields.itemCount) ?? items.length),
    createdAt: typeof value(fields.createdAt) === "string" ? String(value(fields.createdAt)) : null,
    items
  };
}
