import { NextResponse, type NextRequest } from "next/server";
import { getHostEvent } from "@/lib/data";
import { slugify } from "@/lib/ids";
import { inviteLink } from "@/lib/share";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { GuestRow } from "@/lib/types";

const STATUS_TEXT: Record<GuestRow["status"], string> = {
  yes: "Coming",
  maybe: "Maybe",
  no: "Can't come",
  pending: "No reply",
};

/** Quotes a CSV cell and neutralizes spreadsheet formulas (=, +, -, @). */
function cell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getHostEvent(id);
  if (!event) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("event_id", event.id)
    .order("created_at", { ascending: true });
  if (error) return new NextResponse("Could not load guests", { status: 500 });

  const guests = (data ?? []) as GuestRow[];
  const header = [
    "Name",
    "Reply",
    "Party size",
    "Email",
    "Phone",
    event.custom_question || "Answer",
    "Note to host",
    "Invited on",
    "Replied on",
    "Personal link",
  ];
  const rows = guests.map((g) => [
    g.name,
    STATUS_TEXT[g.status],
    g.status === "yes" || g.status === "maybe" ? g.party_size : 0,
    g.email,
    g.phone,
    g.answer,
    g.note,
    g.invited_at?.slice(0, 10) ?? "",
    g.responded_at?.slice(0, 10) ?? "",
    inviteLink(siteUrl(), event.slug, g.token),
  ]);

  // BOM so Excel opens accented names correctly.
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const filename = `${slugify(event.title) || "guests"}-guest-list.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
