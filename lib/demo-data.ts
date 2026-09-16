import type { ListCard, RankedList } from "@/lib/types";

type DemoDefinition = {
  id: string;
  slug: string;
  title: string;
  items: string[];
};

const demos: DemoDefinition[] = [
  {
    id: "demo-assassins-creed",
    slug: "best-assassins-creed-games-demo",
    title: "Every Assassin's Creed game, ranked",
    items: ["Assassin's Creed II", "Assassin's Creed IV: Black Flag", "Assassin's Creed Brotherhood", "Assassin's Creed Origins", "Assassin's Creed Unity", "Assassin's Creed Valhalla"]
  },
  {
    id: "demo-ai-tools",
    slug: "ai-tools-that-actually-earn-a-tab-demo",
    title: "AI tools that actually earn a tab",
    items: ["ChatGPT", "Claude", "Cursor", "Perplexity", "Notion AI", "Midjourney"]
  },
  {
    id: "demo-anime",
    slug: "anime-arcs-that-never-let-go-demo",
    title: "Anime arcs that never let go",
    items: ["Chimera Ant", "Return to Shiganshina", "Shibuya Incident", "Pain's Assault", "Dark Tournament"]
  },
  {
    id: "demo-films",
    slug: "best-movie-openings-demo",
    title: "Movie openings that set the whole room on fire",
    items: ["The Dark Knight", "Inglourious Basterds", "Baby Driver", "Scream", "The Social Network"]
  },
  {
    id: "demo-albums",
    slug: "albums-worth-listening-through-demo",
    title: "Albums worth listening through, no skips",
    items: ["To Pimp a Butterfly", "Blonde", "Rumours", "The Miseducation of Lauryn Hill", "Currents"]
  },
  {
    id: "demo-food",
    slug: "midnight-snacks-worth-making-demo",
    title: "Midnight snacks worth making properly",
    items: ["Grilled cheese", "Maggi", "Ramen with an egg", "Peanut butter toast", "Leftover pizza"]
  }
];

export const demoLists: ListCard[] = demos.map((demo) => ({
  id: demo.id,
  slug: demo.slug,
  title: demo.title,
  isSeed: true,
  voteCount: 0,
  itemCount: demo.items.length
}));

export function getDemoList(slug: string): RankedList | null {
  const demo = demos.find((entry) => entry.slug === slug);
  if (!demo) return null;

  return {
    id: demo.id,
    slug: demo.slug,
    title: demo.title,
    creatorId: "rankit-demo",
    coverImageUrl: null,
    isSeed: true,
    published: true,
    voteCount: 0,
    itemCount: demo.items.length,
    createdAt: null,
    items: demo.items.map((title, index) => ({
      id: `${demo.id}-${index + 1}`,
      title,
      imageUrl: null,
      creatorPosition: index + 1,
      rating: 1000,
      rank: index + 1,
      comparisonCount: 0
    }))
  };
}
