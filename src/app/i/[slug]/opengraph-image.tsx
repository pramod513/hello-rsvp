import { ImageResponse } from "next/og";
import { formatLongDate, formatTime } from "@/lib/format";
import { getPublicEvent } from "@/lib/public-data";
import { getTemplate } from "@/lib/templates";

// The picture WhatsApp, iMessage, Slack and others show when an invite link is shared.

export const alt = "Invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  const template = getTemplate(event?.template);
  const [bg, ink, accent] = template.swatch;

  const title = event?.title ?? "You're invited";
  const when = event
    ? `${formatLongDate(event.event_date)}${event.start_time ? ` at ${formatTime(event.start_time)}` : ""}`
    : "";
  const place = event?.location_name || (event?.online_url ? "Online" : "");
  const photo = event?.cover_image_url ?? null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: template.pageBackground }}>
        {photo ? (
          <img src={photo} alt="" width={540} height={630} style={{ width: 540, height: 630, objectFit: "cover" }} />
        ) : null}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: photo ? "flex-start" : "center",
            textAlign: photo ? "left" : "center",
            margin: 40,
            padding: "48px 56px",
            background: bg,
            color: ink,
            borderRadius: 24,
            borderBottom: `12px solid ${accent}`,
          }}
        >
          <div style={{ fontSize: 34, opacity: 0.8, display: "flex" }}>{event?.is_cancelled ? "Cancelled" : "You're invited to"}</div>
          <div
            style={{
              fontSize: title.length > 40 ? 64 : 84,
              lineHeight: 1.05,
              marginTop: 18,
              fontWeight: 700,
              display: "flex",
              color: event?.template === "midnight" ? "#e6c77d" : ink,
            }}
          >
            {title}
          </div>
          {when ? <div style={{ fontSize: 36, marginTop: 30, display: "flex" }}>{when}</div> : null}
          {place ? <div style={{ fontSize: 32, marginTop: 8, opacity: 0.8, display: "flex" }}>{place}</div> : null}
        </div>
      </div>
    ),
    size,
  );
}
