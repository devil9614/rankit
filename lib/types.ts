export type RankItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  creatorPosition: number;
  rating: number;
  rank: number;
  comparisonCount: number;
};

export type RankedList = {
  id: string;
  slug: string;
  title: string;
  creatorId: string;
  coverImageUrl: string | null;
  isSeed: boolean;
  published: boolean;
  voteCount: number;
  itemCount: number;
  createdAt: string | null;
  items: RankItem[];
};

export type ListCard = Pick<RankedList, "id" | "slug" | "title" | "isSeed" | "voteCount" | "itemCount">;

export type DraftItem = {
  id: string;
  title: string;
  imageUrl: string;
};
