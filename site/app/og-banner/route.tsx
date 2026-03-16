import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
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
          position: "relative",
        }}
      >
        {/* Subtle gradient */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(ellipse at center, rgba(0,255,255,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 40 40"
          fill="none"
          style={{ marginBottom: 20 }}
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
            fontSize: 56,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-1.5px",
            marginBottom: 8,
          }}
        >
          tidal-cli
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "#888",
            marginBottom: 32,
          }}
        >
          Control Tidal from your terminal
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 12 }}>
          {["Search", "Playlists", "Playback", "Discovery"].map((f) => (
            <div
              key={f}
              style={{
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 14,
                color: "#aaa",
              }}
            >
              {f}
            </div>
          ))}
          <div
            style={{
              background: "rgba(244,114,182,0.1)",
              border: "1px solid rgba(244,114,182,0.3)",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 14,
              color: "#f472b6",
            }}
          >
            AI Agent Ready
          </div>
        </div>
      </div>
    ),
    { width: 1280, height: 640 }
  );
}
