import "server-only";

import { getDemoList } from "@/lib/demo-data";
import { getPublicListFromRest } from "@/lib/firebase/public-rest";
import type { RankedList } from "@/lib/types";

export async function getServerPublicList(slug: string): Promise<RankedList | null> {
  try {
    return (await getPublicListFromRest(slug)) ?? getDemoList(slug);
  } catch {
    return getDemoList(slug);
  }
}
