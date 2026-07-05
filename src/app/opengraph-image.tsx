import { ImageResponse } from "next/og";
import { site } from "@/lib/seo";

// Dynamic Open Graph / Twitter card image (1200×630), generated at the edge.
export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0e7490 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 34, opacity: 0.85 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "#22d3ee",
              marginRight: 18,
            }}
          />
          real-estate ops · PropTech
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>
            {site.name}
          </div>
          <div style={{ fontSize: 46, marginTop: 24, maxWidth: 900, color: "#cbd5e1" }}>
            {site.tagline}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 30, color: "#94a3b8" }}>
          <span>AI agent</span>
          <span>·</span>
          <span>hybrid RAG</span>
          <span>·</span>
          <span>PostGIS + pgvector</span>
          <span>·</span>
          <span>OSRM routing</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
