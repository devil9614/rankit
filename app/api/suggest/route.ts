import { NextResponse } from "next/server";
import { offlineSuggestions } from "@/lib/suggest-fallback";

export const runtime = "nodejs";

// Recent knowledge cutoff and cheap enough that a suggestion costs a fraction
// of a cent. Verified against https://ai-gateway.vercel.sh/v1/models.
const MODEL = "google/gemini-3.5-flash-lite";
const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const MAX_SUGGESTIONS = 12;

const systemPrompt = [
  "You suggest concrete items that belong on a ranked list.",
  "Return only real, well-known, verifiable items that a general audience would recognise.",
  "Each item is a short proper name — no descriptions, no numbering, no commentary.",
  "If the topic is too vague, nonsensical, or you are not confident, return an empty array.",
  'Reply with JSON only, in the form {"items": ["First", "Second"]}.'
].join(" ");

function cleanSuggestions(raw: unknown, exclude: Set<string>) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set(exclude);
  const items: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const title = entry.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim().slice(0, 80);
    const key = title.toLocaleLowerCase();
    if (!title || seen.has(key)) continue;
    seen.add(key);
    items.push(title);
    if (items.length >= MAX_SUGGESTIONS) break;
  }
  return items;
}

async function aiSuggestions(query: string, exclude: Set<string>, signal: AbortSignal) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Suggest up to ${MAX_SUGGESTIONS} items for a ranked list titled: "${query}"` }
      ],
      max_tokens: 400,
      temperature: 0.7,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) return null;

  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = body.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as { items?: unknown };
    return cleanSuggestions(parsed.items, exclude);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let payload: { q?: unknown; have?: unknown };
  try {
    payload = await request.json() as { q?: unknown; have?: unknown };
  } catch {
    return NextResponse.json({ items: [], source: "none" });
  }

  const query = typeof payload.q === "string" ? payload.q.trim() : "";
  if (query.length < 3 || query.length > 100) {
    return NextResponse.json({ items: [], source: "none" });
  }

  const exclude = new Set(
    (Array.isArray(payload.have) ? payload.have : [])
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim().toLocaleLowerCase())
      .filter(Boolean)
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const generated = await aiSuggestions(query, exclude, controller.signal);
    if (generated?.length) {
      return NextResponse.json({ items: generated, source: "ai" });
    }
  } catch {
    // Fall through to the offline list below.
  } finally {
    clearTimeout(timeout);
  }

  const fallback = cleanSuggestions(offlineSuggestions(query), exclude);
  return NextResponse.json({ items: fallback, source: fallback.length ? "offline" : "none" });
}

// Kept so an older cached client bundle does not hard-fail after deploy.
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const items = query.length >= 3 ? offlineSuggestions(query) : [];
  return NextResponse.json({ items, source: items.length ? "offline" : "none" });
}
