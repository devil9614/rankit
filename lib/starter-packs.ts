export type StarterPack = {
  title: string;
  label: string;
  items: string[];
};

export const starterPacks: StarterPack[] = [
  {
    label: "AC games",
    title: "Every Assassin's Creed game, ranked",
    items: ["Assassin's Creed II", "Assassin's Creed IV: Black Flag", "Assassin's Creed Brotherhood", "Assassin's Creed Origins", "Assassin's Creed Unity", "Assassin's Creed Valhalla"]
  },
  {
    label: "AI tools",
    title: "AI tools that actually earn a tab",
    items: ["ChatGPT", "Claude", "Cursor", "Perplexity", "Notion AI", "Midjourney"]
  },
  {
    label: "Anime arcs",
    title: "Anime arcs that never let go",
    items: ["Chimera Ant", "Return to Shiganshina", "Shibuya Incident", "Pain's Assault", "Dark Tournament"]
  },
  {
    label: "Movie openings",
    title: "Movie openings that set the whole room on fire",
    items: ["The Dark Knight", "Inglourious Basterds", "Baby Driver", "Scream", "The Social Network"]
  },
  {
    label: "Albums",
    title: "Albums worth listening through, no skips",
    items: ["To Pimp a Butterfly", "Blonde", "Rumours", "The Miseducation of Lauryn Hill", "Currents"]
  }
];
