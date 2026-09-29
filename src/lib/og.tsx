import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";
import type { Author } from "@/lib/types";

/** Shared 1200x630 share card. Avatars are webp (unsupported by the renderer), so we draw initials. */
export function ogCard({
  author,
  text,
  footer,
}: {
  author: Pick<Author, "displayName" | "username">;
  text: string;
  footer?: string;
}) {
  const clipped = text.length > 260 ? `${text.slice(0, 259).trimEnd()}…` : text;
  const initials = (author.displayName || author.username).replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "?";
  const size = clipped.length > 160 ? 40 : clipped.length > 80 ? 48 : 58;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0b0e12 0%, #12202b 100%)",
          color: "#e8edf2",
          padding: "64px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 999,
              background: "#1d9bd1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
              color: "white",
            }}
          >
            {initials}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 40, fontWeight: 700 }}>{author.displayName}</div>
            <div style={{ fontSize: 30, color: "#8a96a3" }}>{`@${author.username}`}</div>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", fontSize: size, lineHeight: 1.3, marginTop: 24 }}>
          {clipped}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "#8a96a3" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: 999, background: "#ff487c" }} />
            <span style={{ color: "#3db5e8", fontWeight: 700, textTransform: "uppercase" }}>{SITE_NAME}</span>
          </div>
          <span>{footer ?? "Twatter, live from the city"}</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
}
