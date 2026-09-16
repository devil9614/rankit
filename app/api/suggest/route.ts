import { NextResponse } from "next/server";

const topicIdeas = [
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
    matches: ["album", "music", "record"],
    items: ["OK Computer", "Carrie & Lowell", "My Beautiful Dark Twisted Fantasy", "The Rise and Fall of Ziggy Stardust", "Punisher"]
  },
  {
    matches: ["movie", "film", "cinema"],
    items: ["Whiplash", "Parasite", "Mad Max: Fury Road", "The Godfather", "Spirited Away"]
  },
  {
    matches: ["food", "snack", "dish"],
    items: ["Masala dosa", "Biryani", "Tacos al pastor", "Neapolitan pizza", "Pani puri"]
  }
];

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().toLocaleLowerCase() ?? "";
  if (query.length < 2 || query.length > 100) return NextResponse.json({ items: [] });

  const matchingTopic = topicIdeas.find((topic) => topic.matches.some((match) =>
    match === "ai" ? /\bai\b/.test(query) : query.includes(match)
  ));
  return NextResponse.json({ items: matchingTopic?.items ?? [] });
}
