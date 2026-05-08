import { ImageResponse } from "next/og";
import { DEFAULT_SEO_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = "Animez";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0f",
          color: "#ffffff",
          padding: "72px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <div
            style={{
              width: "58px",
              height: "58px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "16px",
              background: "#f49e0b",
              color: "#0a0a0f",
              fontSize: "34px",
              fontWeight: 900,
            }}
          >
            A
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: "44px", fontWeight: 900, letterSpacing: 0 }}>
              {SITE_NAME}
            </div>
            <div style={{ color: "#f49e0b", fontSize: "22px", fontWeight: 700 }}>
              Discover. Track. Share.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "22px",
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              fontSize: "82px",
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: 0,
            }}
          >
            Your anime hub
          </div>
          <div
            style={{
              maxWidth: "760px",
              color: "#d1d5db",
              fontSize: "30px",
              lineHeight: 1.35,
            }}
          >
            {DEFAULT_SEO_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    size
  );
}
