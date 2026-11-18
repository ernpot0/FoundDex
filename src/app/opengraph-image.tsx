import { ImageResponse } from "next/og";

export const alt = "FoundDex — Find. Verify. Return.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background:
            "linear-gradient(135deg, #020617 0%, #0f172a 55%, #064e3b 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: 800,
                color: "#022c22",
              }}
            >
              F
            </div>
            <div
              style={{
                fontSize: "34px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#ffffff",
              }}
            >
              FoundDex
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: "9999px",
              background: "rgba(16, 185, 129, 0.16)",
              border: "1px solid rgba(52, 211, 153, 0.45)",
              color: "#6ee7b7",
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            Global Lost & Found Network
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: "68px",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            Find. Verify. Return.
          </div>
          <div
            style={{
              fontSize: "28px",
              lineHeight: 1.4,
              color: "#cbd5e1",
              maxWidth: "920px",
            }}
          >
            Report lost or found items, match with AI-assisted discovery,
            verify ownership privately, and coordinate safe returns.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(148, 163, 184, 0.25)",
            paddingTop: "28px",
          }}
        >
          <div style={{ display: "flex", gap: "16px" }}>
            {[
              "Two-Way Recovery",
              "Private Claim Verification",
              "Verified Return Certificates",
            ].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  padding: "10px 18px",
                  borderRadius: "9999px",
                  background: "rgba(30, 41, 59, 0.85)",
                  border: "1px solid rgba(148, 163, 184, 0.25)",
                  fontSize: "19px",
                  color: "#e2e8f0",
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div style={{ fontSize: "20px", color: "#34d399", fontWeight: 600 }}>
            founddex.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

