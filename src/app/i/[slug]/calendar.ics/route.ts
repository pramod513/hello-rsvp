import { NextResponse, type NextRequest } from "next/server";
import { buildIcs } from "@/lib/ics";
import { slugify } from "@/lib/ids";
import { getPublicEvent } from "@/lib/public-data";
import { inviteLink } from "@/lib/share";
import { siteUrl } from "@/lib/site";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) return new NextResponse("Not found", { status: 404 });

  const ics = buildIcs({ ...event, link: inviteLink(siteUrl(), event.slug) });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(event.title) || "event"}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
