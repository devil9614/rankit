import { ImageResponse } from "next/og";
import { getServerPublicList } from "@/lib/server-lists";

export const alt = "A RankIt ranking";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = await getServerPublicList(slug);
  const title = list?.title ?? "A ranking worth arguing with";
  const items = list?.items.slice(0, 5) ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "68px 74px",
          background: "#101217",
          color: "#f5f7f0",
          flexDirection: "column",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", color: "#c7ff45", fontSize: 28, fontWeight: 800, letterSpacing: "-1px" }}>RANKIT</div>
        <div style={{ display: "flex", fontSize: 54, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-2px", maxWidth: 990, marginTop: 18 }}>
          {title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 42 }}>
          {items.map((item, index) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", fontSize: 27 }}>
              <span style={{ display: "flex", width: 42, color: "#c7ff45", fontWeight: 800 }}>{index + 1}</span>
              <span style={{ display: "flex" }}>{item.title}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
