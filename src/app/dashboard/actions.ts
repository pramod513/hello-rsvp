"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidTimeZone } from "@/lib/format";
import { makeEventSlug, makeGuestToken } from "@/lib/ids";
import { DEFAULT_INVITE_MESSAGE, DEFAULT_REMINDER_MESSAGE } from "@/lib/share";
import { createAdminClient } from "@/lib/supabase/admin";
import { IMAGE_BUCKET, supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  EVENT_TYPES,
  TEMPLATE_IDS,
  type ActionResult,
  type EventRow,
  type GiftKind,
  type GuestRow,
  type RsvpStatus,
} from "@/lib/types";
import { checkbox, integer, isDate, isTime, normalizeUrl, optionalText, text } from "@/lib/validation";

const MAX_GUESTS_PER_EVENT = 2000;
const MAX_GIFTS_PER_EVENT = 200;

async function requireHost() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function dbFail(error: { message: string; code?: string } | null): ActionResult {
  console.error("Database error", error);
  return fail("Something went wrong saving that. Please try again.");
}

function imagePrefix(): string {
  return `${supabaseUrl()}/storage/v1/object/public/${IMAGE_BUCKET}/`;
}

/** Storage path for one of our uploaded invite images, or null for anything else. */
function storagePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = imagePrefix();
  return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length).split("?")[0]) : null;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

type EventInput = Pick<
  EventRow,
  | "title"
  | "event_type"
  | "host_name"
  | "description"
  | "event_date"
  | "start_time"
  | "end_time"
  | "timezone"
  | "location_name"
  | "location_address"
  | "online_url"
  | "cover_image_url"
  | "template"
  | "rsvp_by"
  | "allow_plus_ones"
  | "max_party_size"
  | "open_link"
  | "show_guest_list"
  | "custom_question"
>;

function parseEventForm(form: FormData): { ok: true; values: EventInput } | { ok: false; error: string } {
  const title = text(form, "title", 120);
  if (!title) return { ok: false, error: "Give your event a name." };

  const eventType = text(form, "event_type", 20);
  const type = EVENT_TYPES.find((t) => t.id === eventType);
  if (!type) return { ok: false, error: "Choose what kind of event this is." };

  const eventDate = text(form, "event_date", 10);
  if (!isDate(eventDate)) return { ok: false, error: "Choose the date of your event." };

  const startTime = optionalText(form, "start_time", 8);
  if (startTime && !isTime(startTime)) return { ok: false, error: "Enter a start time, like 6:30 PM." };
  const endTime = optionalText(form, "end_time", 8);
  if (endTime && !isTime(endTime)) return { ok: false, error: "Enter an end time, like 10:00 PM." };
  if (endTime && !startTime) return { ok: false, error: "Add a start time, or clear the end time." };

  const timezone = text(form, "timezone", 64) || "UTC";
  if (!isValidTimeZone(timezone)) return { ok: false, error: "Choose the event's time zone from the list." };

  const onlineRaw = optionalText(form, "online_url", 500);
  const onlineUrl = normalizeUrl(onlineRaw);
  if (onlineRaw && !onlineUrl) return { ok: false, error: "The online link should be a web address, like https://meet.google.com/abc-defg-hij." };

  const coverRaw = optionalText(form, "cover_image_url", 1000);
  if (coverRaw && !coverRaw.startsWith(imagePrefix())) {
    return { ok: false, error: "Upload the photo again; that image link isn't one of yours." };
  }

  const template = text(form, "template", 20);
  if (!(TEMPLATE_IDS as readonly string[]).includes(template)) return { ok: false, error: "Choose a design." };

  const rsvpBy = optionalText(form, "rsvp_by", 10);
  if (rsvpBy && !isDate(rsvpBy)) return { ok: false, error: "Choose a valid reply-by date." };
  if (rsvpBy && rsvpBy > eventDate) return { ok: false, error: "The reply-by date should be on or before the event date." };

  const allowPlusOnes = checkbox(form, "allow_plus_ones");

  return {
    ok: true,
    values: {
      title,
      event_type: type.id,
      host_name: optionalText(form, "host_name", 80),
      description: optionalText(form, "description", 2000),
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      timezone,
      location_name: optionalText(form, "location_name", 120),
      location_address: optionalText(form, "location_address", 300),
      online_url: onlineUrl,
      cover_image_url: coverRaw,
      template: template as EventInput["template"],
      rsvp_by: rsvpBy,
      allow_plus_ones: allowPlusOnes,
      max_party_size: allowPlusOnes ? integer(form, "max_party_size", 2, 20, 4) : 1,
      open_link: checkbox(form, "open_link"),
      show_guest_list: checkbox(form, "show_guest_list"),
      custom_question: optionalText(form, "custom_question", 200),
    },
  };
}

/** Creates or updates an event from the invite builder form. */
export async function saveEvent(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireHost();
  const parsed = parseEventForm(form);
  if (!parsed.ok) return fail(parsed.error);

  const id = text(form, "id", 40);
  let eventId: string | null = null;

  if (id) {
    const { data: existing } = await supabase.from("events").select("id, cover_image_url").eq("id", id).maybeSingle();
    if (!existing) return fail("We couldn't find that event. It may have been deleted.");

    const { error } = await supabase.from("events").update(parsed.values).eq("id", id);
    if (error) return dbFail(error);
    eventId = id;

    const oldPath = storagePath(existing.cover_image_url);
    if (oldPath && existing.cover_image_url !== parsed.values.cover_image_url) {
      await supabase.storage.from(IMAGE_BUCKET).remove([oldPath]);
    }
  } else {
    for (let attempt = 0; attempt < 3 && !eventId; attempt++) {
      const { data, error } = await supabase
        .from("events")
        .insert({
          ...parsed.values,
          host_id: user.id,
          slug: makeEventSlug(parsed.values.title),
          invite_message: DEFAULT_INVITE_MESSAGE,
          reminder_message: DEFAULT_REMINDER_MESSAGE,
        })
        .select("id")
        .single();
      if (!error && data) eventId = data.id as string;
      else if (error && error.code !== "23505") return dbFail(error);
    }
    if (!eventId) return fail("We couldn't create a link for this event. Please try again.");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  redirect(`/dashboard/events/${eventId}?${id ? "saved" : "created"}=1`);
}

export async function setEventCancelled(eventId: string, cancelled: boolean): Promise<ActionResult> {
  const { supabase } = await requireHost();
  const { error } = await supabase.from("events").update({ is_cancelled: cancelled }).eq("id", eventId);
  if (error) return dbFail(error);
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  revalidatePath("/dashboard");
  return { ok: true, message: cancelled ? "Event marked as cancelled." : "Event is back on." };
}

export async function deleteEvent(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireHost();
  const eventId = text(form, "id", 40);
  const confirmation = text(form, "confirm", 20);
  if (confirmation.toLowerCase() !== "delete") return fail('Type "delete" to confirm.');

  const { data: event } = await supabase.from("events").select("id, cover_image_url").eq("id", eventId).maybeSingle();
  if (!event) return fail("We couldn't find that event.");

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return dbFail(error);

  const path = storagePath(event.cover_image_url);
  if (path) await supabase.storage.from(IMAGE_BUCKET).remove([path]);

  revalidatePath("/dashboard");
  redirect("/dashboard?deleted=1");
}

export async function saveMessages(
  eventId: string,
  messages: { invite_message: string; reminder_message: string },
): Promise<ActionResult> {
  const { supabase } = await requireHost();
  const invite = messages.invite_message.trim().slice(0, 1000) || DEFAULT_INVITE_MESSAGE;
  const reminder = messages.reminder_message.trim().slice(0, 1000) || DEFAULT_REMINDER_MESSAGE;
  const { error } = await supabase
    .from("events")
    .update({ invite_message: invite, reminder_message: reminder })
    .eq("id", eventId);
  if (error) return dbFail(error);
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  return { ok: true, message: "Messages saved." };
}

// ---------------------------------------------------------------------------
// Guests
// ---------------------------------------------------------------------------

function cleanName(input: unknown): string {
  return typeof input === "string" ? input.replace(/\s+/g, " ").trim().slice(0, 100) : "";
}

/** Same person, same spelling: "sofia  martinez" matches "Sofia Martinez". */
function nameKey(name: string): string {
  return name.toLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
}

/**
 * Adds guests by name only. Hosts send each guest their private link from their
 * own WhatsApp, Messages or email app, so no phone numbers or emails are stored.
 */
export async function addGuests(eventId: string, names: string[]): Promise<ActionResult> {
  const { supabase } = await requireHost();
  if (!Array.isArray(names) || names.length === 0) return fail("Add at least one guest.");
  if (names.length > 500) return fail("Add up to 500 guests at a time.");

  const cleaned = names.map(cleanName);
  if (cleaned.some((n) => !n)) return fail("Every guest needs a name.");

  const { data: existing, error: readError } = await supabase.from("guests").select("name").eq("event_id", eventId);
  if (readError) return dbFail(readError);
  const rows = (existing ?? []) as Pick<GuestRow, "name">[];
  if (rows.length + cleaned.length > MAX_GUESTS_PER_EVENT) {
    return fail(`An event can have up to ${MAX_GUESTS_PER_EVENT} guests.`);
  }

  // Each name gets its own private link, so the same name twice would be confusing.
  const seen = new Set(rows.map((r) => nameKey(r.name)));
  const toInsert = [];
  const duplicates: string[] = [];
  for (const name of cleaned) {
    const key = nameKey(name);
    if (seen.has(key)) {
      duplicates.push(name);
      continue;
    }
    seen.add(key);
    toInsert.push({ event_id: eventId, name, token: makeGuestToken() });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("guests").insert(toInsert);
    if (error) return dbFail(error);
  }

  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  const added = toInsert.length;
  const parts = [`Added ${added} ${added === 1 ? "guest" : "guests"}.`];
  if (duplicates.length) {
    parts.push(
      `${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? " and others" : ""} ${duplicates.length === 1 ? "is" : "are"} already on the list. To add two people with the same name, add a detail, like "Sam Lee (Dallas)".`,
    );
  }
  return { ok: true, message: parts.join(" ") };
}

export async function updateGuest(
  guestId: string,
  input: { name: string; status: RsvpStatus; party_size: number },
): Promise<ActionResult> {
  const { supabase } = await requireHost();
  const name = cleanName(input.name);
  if (!name) return fail("Every guest needs a name.");
  if (!["pending", "yes", "no", "maybe"].includes(input.status)) return fail("Choose a reply.");
  const partySize = input.status === "no" ? 0 : Math.min(20, Math.max(1, Math.round(Number(input.party_size) || 1)));

  const { data, error } = await supabase
    .from("guests")
    .update({
      name,
      status: input.status,
      party_size: partySize,
      responded_at: input.status === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", guestId)
    .select("event_id")
    .maybeSingle();
  if (error) return dbFail(error);
  if (!data) return fail("We couldn't find that guest.");
  revalidatePath(`/dashboard/events/${data.event_id}`, "layout");
  return { ok: true, message: "Guest updated." };
}

export async function deleteGuest(guestId: string): Promise<ActionResult> {
  const { supabase } = await requireHost();
  const { data, error } = await supabase.from("guests").delete().eq("id", guestId).select("event_id").maybeSingle();
  if (error) return dbFail(error);
  if (data) revalidatePath(`/dashboard/events/${data.event_id}`, "layout");
  return { ok: true, message: "Guest removed." };
}

/** Deletes every guest and reply for one event. The invite itself stays. */
export async function deleteAllGuests(eventId: string): Promise<ActionResult> {
  const { supabase } = await requireHost();
  const { data, error } = await supabase.from("guests").delete().eq("event_id", eventId).select("id");
  if (error) return dbFail(error);
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  const removed = (data ?? []).length;
  return { ok: true, message: `Deleted ${removed} ${removed === 1 ? "guest" : "guests"} and their replies.` };
}

export async function markInvited(
  guestIds: string[],
  channel: "whatsapp" | "sms" | "email" | "link",
  kind: "invite" | "reminder",
): Promise<ActionResult> {
  const { supabase } = await requireHost();
  if (guestIds.length === 0) return { ok: true };
  const now = new Date().toISOString();
  const patch = kind === "reminder" ? { reminded_at: now, invite_channel: channel } : { invited_at: now, invite_channel: channel };
  const { data, error } = await supabase.from("guests").update(patch).in("id", guestIds.slice(0, 500)).select("event_id");
  if (error) return dbFail(error);
  const eventId = (data as { event_id: string }[] | null)?.[0]?.event_id;
  if (eventId) revalidatePath(`/dashboard/events/${eventId}`, "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Gift list
// ---------------------------------------------------------------------------

export async function addGift(
  eventId: string,
  input: { kind: GiftKind; title: string; url?: string | null; price_text?: string | null; quantity?: number; note?: string | null },
): Promise<ActionResult> {
  const { supabase } = await requireHost();
  const title = (input.title ?? "").trim().slice(0, 120);
  if (!title) return fail("Give the gift a name.");
  const kind: GiftKind = ["item", "gift_card", "idea"].includes(input.kind) ? input.kind : "item";
  const urlRaw = input.url?.trim() || null;
  const url = normalizeUrl(urlRaw);
  if (urlRaw && !url) return fail("The link should be a web address, like https://www.amazon.com/…");
  const quantity = Math.min(99, Math.max(1, Math.round(Number(input.quantity) || 1)));

  const { count } = await supabase.from("gift_items").select("id", { count: "exact", head: true }).eq("event_id", eventId);
  if ((count ?? 0) >= MAX_GIFTS_PER_EVENT) return fail(`A gift list can have up to ${MAX_GIFTS_PER_EVENT} items.`);

  const { error } = await supabase.from("gift_items").insert({
    event_id: eventId,
    kind,
    title,
    url,
    price_text: input.price_text?.trim().slice(0, 40) || null,
    note: input.note?.trim().slice(0, 500) || null,
    quantity,
    sort_order: count ?? 0,
  });
  if (error) return dbFail(error);
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  return { ok: true, message: `Added "${title}".` };
}

export async function deleteGift(giftId: string): Promise<ActionResult> {
  const { supabase } = await requireHost();
  const { data, error } = await supabase.from("gift_items").delete().eq("id", giftId).select("event_id").maybeSingle();
  if (error) return dbFail(error);
  if (data) revalidatePath(`/dashboard/events/${data.event_id}`, "layout");
  return { ok: true, message: "Gift removed." };
}

export async function removeGiftClaim(claimId: string): Promise<ActionResult> {
  const { supabase } = await requireHost();
  const { data, error } = await supabase.from("gift_claims").delete().eq("id", claimId).select("event_id").maybeSingle();
  if (error) return dbFail(error);
  if (data) revalidatePath(`/dashboard/events/${data.event_id}`, "layout");
  return { ok: true, message: "Claim cleared. The gift is available again." };
}

export async function setShowGifts(eventId: string, show: boolean): Promise<ActionResult> {
  const { supabase } = await requireHost();
  const { error } = await supabase.from("events").update({ show_gifts: show }).eq("id", eventId);
  if (error) return dbFail(error);
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  return { ok: true, message: show ? "Gift list is showing on the invite." : "Gift list is hidden from guests." };
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/** Permanently deletes the host's account, events, guests, gift lists and photos. */
export async function deleteAccount(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireHost();
  if (text(form, "confirm", 20).toLowerCase() !== "delete") return fail('Type "delete" to confirm.');

  const admin = createAdminClient();

  // Remove uploaded photos first; database rows go with the user (on delete cascade).
  const { data: files } = await admin.storage.from(IMAGE_BUCKET).list(user.id, { limit: 1000 });
  const paths = ((files ?? []) as { name: string }[]).map((f) => `${user.id}/${f.name}`);
  if (paths.length > 0) await admin.storage.from(IMAGE_BUCKET).remove(paths);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Account deletion failed", error);
    return fail("We couldn't delete your account. Please try again, or contact us.");
  }

  await supabase.auth.signOut();
  redirect("/?account-deleted=1");
}
