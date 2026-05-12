import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { APP_LOGOS } from "@/lib/branding";
import { DEFAULT_SEO_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = "Animez";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const runtime = "nodejs";

export default function Image() {
  const logoDataUrl = `data:image/png;base64,${readFileSync(
    join(process.cwd(), "public", APP_LOGOS.wide.src.replace(/^\//, ""))
  ).toString("base64")}`;

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
            aria-label={SITE_NAME}
            style={{
              width: "116px",
              height: "78px",
              backgroundImage: `url(${logoDataUrl})`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
            }}
          />
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
