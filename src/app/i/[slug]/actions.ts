"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { firstName, formatLongDate, repliesClosed } from "@/lib/format";
import { makeGuestToken } from "@/lib/ids";
import { getGuestByToken, getPublicEvent, guestCookieName, isValidToken } from "@/lib/public-data";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";
import { integer, optionalText, text } from "@/lib/validation";

const MAX_GUESTS_PER_EVENT = 2000;
const YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

function fail(error: string): ActionResult {
  return { ok: false, error };
}

/** The guest's personal token: from the form, or remembered in a cookie from an earlier reply. */
async function resolveToken(slug: string, provided: string | null): Promise<string | null> {
  if (isValidToken(provided)) return provided;
  const cookieStore = await cookies();
  const remembered = cookieStore.get(guestCookieName(slug))?.value ?? null;
  return isValidToken(remembered) ? remembered : null;
}

async function rememberGuest(slug: string, token: string) {
  const cookieStore = await cookies();
  cookieStore.set(guestCookieName(slug), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/i/${slug}`,
    maxAge: YEAR_IN_SECONDS,
  });
}

/** Saves a guest's reply. Personal links update that guest; the shared link adds a new guest. */
export async function submitRsvp(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const slug = text(form, "slug", 80);
  const event = await getPublicEvent(slug);
  if (!event) return fail("This invite no longer exists.");
  if (event.is_cancelled) return fail("This event has been cancelled, so replies are closed.");
  if (repliesClosed(event)) {
    return fail(`Replies closed on ${formatLongDate(event.rsvp_by)}. Contact your host if your plans have changed.`);
  }

  const status = text(form, "status", 10);
  if (status !== "yes" && status !== "no" && status !== "maybe") return fail("Choose Yes, Maybe or No.");

  const typedName = text(form, "name", 100).replace(/\s+/g, " ");

  const partySize =
    status === "no" ? 0 : event.allow_plus_ones ? integer(form, "party_size", 1, event.max_party_size, 1) : 1;
  const answer = event.custom_question ? optionalText(form, "answer", 1000) : null;
  const note = optionalText(form, "note", 1000);
  const now = new Date().toISOString();

  const admin = createAdminClient();
  const token = await resolveToken(slug, text(form, "token", 64) || null);
  const existing = token ? await getGuestByToken(event.id, token) : null;
  let guestToken: string;

  if (existing) {
    // The host set this guest's name; it isn't changed from the reply form, so
    // the reply is always recorded against the right person.
    const patch = { status, party_size: partySize, answer, note, responded_at: now };
    const { error } = await admin.from("guests").update(patch).eq("id", existing.id).eq("event_id", event.id);
    if (error) {
      console.error("RSVP update failed", error);
      return fail("Your reply didn't save. Please try again.");
    }
    guestToken = existing.token;
  } else {
    if (!event.open_link) {
      return fail("This invite is personal. Open the link your host sent you to reply.");
    }
    if (!typedName) return fail("Enter your first and last name so your host knows who replied.");
    const { count } = await admin.from("guests").select("id", { count: "exact", head: true }).eq("event_id", event.id);
    if ((count ?? 0) >= MAX_GUESTS_PER_EVENT) return fail("This event's guest list is full. Contact your host.");

    guestToken = makeGuestToken();
    const { error } = await admin.from("guests").insert({
      event_id: event.id,
      name: typedName,
      status,
      party_size: partySize,
      answer,
      note,
      source: "link",
      token: guestToken,
      responded_at: now,
    });
    if (error) {
      console.error("RSVP insert failed", error);
      return fail("Your reply didn't save. Please try again.");
    }
  }

  await rememberGuest(slug, guestToken);
  redirect(`/i/${slug}?g=${guestToken}&replied=1#reply`);
}

/** Marks one unit of a gift as claimed, so other guests don't buy the same thing. */
export async function claimGift(input: { slug: string; giftId: string; name: string; token: string | null }): Promise<ActionResult> {
  const event = await getPublicEvent(input.slug);
  if (!event || !event.show_gifts) return fail("This gift list isn't available.");
  if (event.is_cancelled) return fail("This event has been cancelled.");

  const name = (input.name ?? "").trim().slice(0, 100);
  if (!name) return fail("Enter your name so the host knows who's bringing it.");

  const token = await resolveToken(input.slug, input.token);
  const guest = token ? await getGuestByToken(event.id, token) : null;

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("gift_items")
    .select("id, title")
    .eq("id", input.giftId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!item) return fail("That gift was removed from the list.");

  const { error } = await admin.from("gift_claims").insert({
    gift_item_id: item.id,
    event_id: event.id,
    guest_id: guest?.id ?? null,
    name,
    quantity: 1,
  });
  if (error) {
    if (error.message?.includes("already been claimed")) return fail("Someone just claimed that one. Pick another gift.");
    console.error("Gift claim failed", error);
    return fail("That didn't save. Please try again.");
  }

  revalidatePath(`/i/${input.slug}`);
  return { ok: true, message: `Thanks, ${firstName(name)}! "${item.title}" is marked as yours.` };
}

/** Lets a guest who claimed a gift with their personal link change their mind. */
export async function releaseGift(input: { slug: string; claimId: string; token: string | null }): Promise<ActionResult> {
  const event = await getPublicEvent(input.slug);
  if (!event) return fail("This invite no longer exists.");
  const token = await resolveToken(input.slug, input.token);
  const guest = token ? await getGuestByToken(event.id, token) : null;
  if (!guest) return fail("Open your personal invite link to change a gift you claimed.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("gift_claims")
    .delete()
    .eq("id", input.claimId)
    .eq("event_id", event.id)
    .eq("guest_id", guest.id);
  if (error) return fail("That didn't save. Please try again.");

  revalidatePath(`/i/${input.slug}`);
  return { ok: true, message: "Done. That gift is available again." };
}
