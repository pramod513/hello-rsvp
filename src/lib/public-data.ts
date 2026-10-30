// Data for the guest-facing invite page. Guests have no account, so this runs
// on the server with the secret key and only ever filters by slug or token.

import { cache } from "react";
import { createAdminClient } from "./supabase/admin";
import {
  PUBLIC_EVENT_COLUMNS,
  type GiftClaimRow,
  type GiftItemRow,
  type GuestRow,
  type PublicEvent,
} from "./types";

export const SLUG_PATTERN = /^[a-z0-9-]{4,80}$/;
const TOKEN_PATTERN = /^[a-z0-9]{8,64}$/i;

export function isValidToken(token: string | null | undefined): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

export function guestCookieName(slug: string): string {
  return `hr_${slug.replace(/-/g, "_")}`;
}

export const getPublicEvent = cache(async (slug: string): Promise<PublicEvent | null> => {
  if (!SLUG_PATTERN.test(slug)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("events").select(PUBLIC_EVENT_COLUMNS).eq("slug", slug).maybeSingle();
  return (data as PublicEvent | null) ?? null;
});

export type PublicGuest = Pick<GuestRow, "id" | "name" | "status" | "party_size" | "note" | "answer" | "token" | "responded_at" | "source">;

export const getGuestByToken = cache(async (eventId: string, token: string | null): Promise<PublicGuest | null> => {
  if (!isValidToken(token)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("guests")
    .select("id, name, status, party_size, note, answer, token, responded_at, source")
    .eq("event_id", eventId)
    .eq("token", token)
    .maybeSingle();
  return (data as PublicGuest | null) ?? null;
});

/** Names of people who said yes, for events that show the guest list. */
export async function getAttendees(eventId: string): Promise<{ name: string; party_size: number }[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("guests")
    .select("name, party_size")
    .eq("event_id", eventId)
    .eq("status", "yes")
    .order("responded_at", { ascending: true })
    .limit(300);
  return (data ?? []) as { name: string; party_size: number }[];
}

export type PublicGift = Pick<GiftItemRow, "id" | "kind" | "title" | "note" | "url" | "price_text" | "quantity"> & {
  claimed: number;
  myClaimIds: string[];
};

export async function getPublicGifts(eventId: string, guestId: string | null): Promise<PublicGift[]> {
  const admin = createAdminClient();
  const [{ data: items }, { data: claims }] = await Promise.all([
    admin
      .from("gift_items")
      .select("id, kind, title, note, url, price_text, quantity, sort_order, created_at")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    admin.from("gift_claims").select("id, gift_item_id, quantity, guest_id").eq("event_id", eventId),
  ]);

  const claimRows = (claims ?? []) as Pick<GiftClaimRow, "id" | "gift_item_id" | "quantity" | "guest_id">[];
  return ((items ?? []) as GiftItemRow[]).map((item) => {
    const forItem = claimRows.filter((c) => c.gift_item_id === item.id);
    return {
      id: item.id,
      kind: item.kind,
      title: item.title,
      note: item.note,
      url: item.url,
      price_text: item.price_text,
      quantity: item.quantity,
      claimed: forItem.reduce((sum, c) => sum + c.quantity, 0),
      myClaimIds: guestId ? forItem.filter((c) => c.guest_id === guestId).map((c) => c.id) : [],
    };
  });
}
