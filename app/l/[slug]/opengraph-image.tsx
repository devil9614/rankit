import { ImageResponse } from "next/og";
import { rankItems } from "@/lib/ranking";
import { getServerPublicList } from "@/lib/server-lists";

export const alt = "A RankIt ranking";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCENT = "#c7ff45";
const INK = "#f5f7f0";
const MUTED = "#8d9285";

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = await getServerPublicList(slug);
  const title = list?.title ?? "A ranking worth arguing with";
  const ranked = list ? rankItems(list.items) : [];
  const items = ranked.slice(0, 5);
  const voteCount = list?.voteCount ?? 0;
  const itemCount = list?.itemCount ?? 0;

  // Movement against the creator's original order is the hook: it shows at a
  // glance that the crowd has already pushed back on this list.
  const movers = items
    .map((item, index) => ({ title: item.title, delta: item.creatorPosition - (index + 1) }))
    .filter((item) => item.delta !== 0);
  const headline = voteCount > 0 && movers.length
    ? `${voteCount} ${voteCount === 1 ? "choice" : "choices"} in — the order is moving`
    : "The creator's order is in. Yours isn't.";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "62px 74px",
          background: "#101217",
          color: INK,
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ display: "flex", color: ACCENT, fontSize: 26, fontWeight: 800, letterSpacing: "-1px" }}>RANKIT</span>
            <span style={{ display: "flex", width: 6, height: 6, borderRadius: 99, background: MUTED }} />
            <span style={{ display: "flex", color: MUTED, fontSize: 22 }}>{itemCount} picks</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 52 ? 46 : 56,
              lineHeight: 1.04,
              fontWeight: 800,
              letterSpacing: "-2px",
              maxWidth: 1010,
              marginTop: 20
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item, index) => {
            const delta = item.creatorPosition - (index + 1);
            return (
              <div key={item.id} style={{ display: "flex", alignItems: "center", fontSize: 26 }}>
                <span style={{ display: "flex", width: 46, color: ACCENT, fontWeight: 800 }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span style={{ display: "flex", maxWidth: 780, overflow: "hidden" }}>{item.title}</span>
                {delta !== 0 && (
                  <span style={{ display: "flex", marginLeft: 16, fontSize: 20, color: delta > 0 ? ACCENT : MUTED }}>
                    {delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "flex", color: MUTED, fontSize: 24 }}>{headline}</span>
          <span
            style={{
              display: "flex",
              background: ACCENT,
              color: "#101217",
              fontSize: 22,
              fontWeight: 800,
              padding: "12px 24px",
              borderRadius: 99
            }}
          >
            Five choices. Your call.
          </span>
        </div>
      </div>
    ),
    size
  );
}
