type TopicIdea = {
  matches: string[];
  items: string[];
};

// Offline suggestions. These run when no AI key is configured and whenever the
// model call fails, so the "Find suggestions" button never dead-ends.
const topicIdeas: TopicIdea[] = [
  {
    matches: ["assassin", "ac game"],
    items: ["Assassin's Creed", "Assassin's Creed Revelations", "Assassin's Creed Rogue", "Assassin's Creed Odyssey", "Assassin's Creed Mirage"]
  },
  {
    matches: ["ai", "artificial intelligence", "llm", "coding tool"],
    items: ["NotebookLM", "n8n", "Raycast", "v0", "Windsurf", "ElevenLabs"]
  },
  {
    matches: ["anime", "manga"],
    items: ["Yorknew City", "Golden Age", "Soul Society", "Marineford", "Entertainment District"]
  },
  {
    matches: ["album", "music", "record", "song", "track"],
    items: ["OK Computer", "Carrie & Lowell", "My Beautiful Dark Twisted Fantasy", "The Rise and Fall of Ziggy Stardust", "Punisher"]
  },
  {
    matches: ["movie", "film", "cinema", "director"],
    items: ["Whiplash", "Parasite", "Mad Max: Fury Road", "The Godfather", "Spirited Away"]
  },
  {
    matches: ["food", "snack", "dish", "cuisine", "restaurant"],
    items: ["Masala dosa", "Biryani", "Tacos al pastor", "Neapolitan pizza", "Pani puri"]
  },
  {
    matches: ["game", "video game", "console"],
    items: ["Elden Ring", "Hollow Knight", "Portal 2", "The Witcher 3", "Hades"]
  },
  {
    matches: ["show", "series", "tv", "season", "episode"],
    items: ["The Wire", "Breaking Bad", "Fleabag", "Succession", "The Sopranos"]
  },
  {
    matches: ["book", "novel", "author", "read"],
    items: ["Dune", "Beloved", "The Left Hand of Darkness", "Blood Meridian", "Never Let Me Go"]
  },
  {
    matches: ["city", "country", "travel", "destination", "place"],
    items: ["Tokyo", "Lisbon", "Mexico City", "Istanbul", "Cape Town"]
  },
  {
    matches: ["sport", "team", "player", "athlete", "football", "cricket", "basketball"],
    items: ["Lionel Messi", "Serena Williams", "Michael Jordan", "Sachin Tendulkar", "Simone Biles"]
  },
  {
    matches: ["language", "framework", "library", "programming", "stack"],
    items: ["TypeScript", "Rust", "Go", "Python", "Elixir"]
  }
];

export function offlineSuggestions(query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  const topic = topicIdeas.find((idea) =>
    idea.matches.some((match) => (match === "ai" ? /\bai\b/.test(normalized) : normalized.includes(match)))
  );
  return topic?.items ?? [];
}
