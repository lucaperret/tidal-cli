import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "tidal-cli — Control Tidal from your terminal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#000",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 40 40"
          fill="none"
          style={{ marginBottom: 24 }}
        >
          <path d="M20 4L28 12L20 20L12 12L20 4Z" fill="#00ffff" />
          <path
            d="M12 12L20 20L12 28L4 20L12 12Z"
            fill="#00ffff"
            opacity="0.7"
          />
          <path
            d="M28 12L36 20L28 28L20 20L28 12Z"
            fill="#00ffff"
            opacity="0.7"
          />
          <path
            d="M20 20L28 28L20 36L12 28L20 20Z"
            fill="#00ffff"
            opacity="0.4"
          />
        </svg>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-2px",
            marginBottom: 12,
          }}
        >
          tidal-cli
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#888",
            marginBottom: 40,
          }}
        >
          Control Tidal from your terminal
        </div>

        {/* Terminal preview */}
        <div
          style={{
            display: "flex",
            background: "#111",
            border: "1px solid #333",
            borderRadius: 12,
            padding: "20px 32px",
            fontFamily: "monospace",
            fontSize: 22,
            color: "#fff",
          }}
        >
          <span style={{ color: "rgba(0,255,255,0.5)", marginRight: 8 }}>
            $
          </span>
          <span>tidal-cli search track &quot;Around the World&quot;</span>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 18,
            color: "#555",
          }}
        >
          Built for developers and AI agents
        </div>
      </div>
    ),
    { ...size }
  );
}
