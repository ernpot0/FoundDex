import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryLabel, getItemPhotoUrl } from "@/lib/items";

export const alt = "FoundDex Item Preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${type};base64,${base64}`;
  } catch {
    return null;
  }
}

function truncate(value: string, maxLength: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trimEnd()}…`;
}

export default async function ItemOpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: item } = supabase
    ? await supabase
        .from("items")
        .select(
          "id, report_type, status, title, category, description, location_name, photo_path, created_at"
        )
        .eq("id", id)
        .maybeSingle()
    : { data: null };

  if (!item) {
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
            background: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
            color: "#ffffff",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: "34px", fontWeight: 800 }}>FoundDex</div>
          <div style={{ fontSize: "52px", fontWeight: 800 }}>
            Find. Verify. Return.
          </div>
          <div style={{ fontSize: "22px", color: "#34d399" }}>
            founddex.vercel.app
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const isLost = item.report_type === "lost";
  const photoUrl = getItemPhotoUrl(item.photo_path);
  const embeddedPhoto = photoUrl ? await loadImageAsDataUrl(photoUrl) : null;
  const categoryLabel = getCategoryLabel(item.category);
  const titleText = truncate(item.title, 68);
  const descriptionText = truncate(item.description || "", 150);
  const locationText = truncate(item.location_name || "Location reported", 52);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
          background:
            "linear-gradient(135deg, #020617 0%, #0f172a 65%, #064e3b 100%)",
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
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: 800,
                color: "#022c22",
              }}
            >
              F
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff" }}>
              FoundDex
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                padding: "8px 18px",
                borderRadius: "9999px",
                background: isLost
                  ? "rgba(245, 158, 11, 0.2)"
                  : "rgba(16, 185, 129, 0.2)",
                border: isLost
                  ? "1px solid rgba(251, 191, 36, 0.5)"
                  : "1px solid rgba(52, 211, 153, 0.5)",
                color: isLost ? "#fcd34d" : "#6ee7b7",
                fontSize: "19px",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {isLost ? "Lost Item" : "Found Item"}
            </div>
            <div
              style={{
                display: "flex",
                padding: "8px 18px",
                borderRadius: "9999px",
                background: "rgba(30, 41, 59, 0.9)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                color: "#e2e8f0",
                fontSize: "18px",
                fontWeight: 600,
              }}
            >
              {categoryLabel}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: embeddedPhoto ? "46px" : "56px",
                fontWeight: 800,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                color: "#ffffff",
              }}
            >
              {titleText}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "22px",
                color: "#34d399",
                fontWeight: 600,
              }}
            >
              <span>Location: {locationText}</span>
            </div>

            {descriptionText && (
              <div
                style={{
                  fontSize: "22px",
                  lineHeight: 1.45,
                  color: "#cbd5e1",
                }}
              >
                {descriptionText}
              </div>
            )}
          </div>

          {embeddedPhoto && (
            <div
              style={{
                width: "340px",
                height: "340px",
                borderRadius: "24px",
                overflow: "hidden",
                border: "2px solid rgba(148, 163, 184, 0.3)",
                background: "#0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={embeddedPhoto}
                alt={item.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(148, 163, 184, 0.25)",
            paddingTop: "22px",
            fontSize: "19px",
            color: "#94a3b8",
          }}
        >
          <span>
            Status: {item.status.toUpperCase()} • Reported{" "}
            {new Date(item.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span style={{ color: "#34d399", fontWeight: 600 }}>
            founddex.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

