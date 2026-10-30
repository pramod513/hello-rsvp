export type RsvpStatus = "pending" | "yes" | "no" | "maybe";

export const EVENT_TYPES = [
  { id: "birthday", label: "Birthday" },
  { id: "wedding", label: "Wedding or engagement" },
  { id: "baby_shower", label: "Baby shower" },
  { id: "housewarming", label: "Housewarming" },
  { id: "dinner", label: "Dinner or get-together" },
  { id: "party", label: "Party" },
  { id: "festival", label: "Festival or holiday" },
  { id: "graduation", label: "Graduation" },
  { id: "work", label: "Work or team event" },
  { id: "other", label: "Something else" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["id"];

export const TEMPLATE_IDS = ["classic", "marigold", "midnight", "confetti", "garden", "minimal"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface EventRow {
  id: string;
  host_id: string;
  slug: string;
  title: string;
  event_type: EventType;
  host_name: string | null;
  description: string | null;
  event_date: string; // YYYY-MM-DD, wall-clock date in `timezone`
  start_time: string | null; // HH:MM[:SS]
  end_time: string | null;
  timezone: string; // IANA name, e.g. America/Chicago
  location_name: string | null;
  location_address: string | null;
  online_url: string | null;
  cover_image_url: string | null;
  template: TemplateId;
  rsvp_by: string | null; // YYYY-MM-DD
  allow_plus_ones: boolean;
  max_party_size: number;
  open_link: boolean;
  show_guest_list: boolean;
  show_gifts: boolean;
  custom_question: string | null;
  invite_message: string | null;
  reminder_message: string | null;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
}

/** The parts of an event a guest may see. */
export type PublicEvent = Omit<EventRow, "host_id" | "invite_message" | "reminder_message">;

export const PUBLIC_EVENT_COLUMNS =
  "id, slug, title, event_type, host_name, description, event_date, start_time, end_time, timezone, location_name, location_address, online_url, cover_image_url, template, rsvp_by, allow_plus_ones, max_party_size, open_link, show_guest_list, show_gifts, custom_question, is_cancelled, created_at, updated_at";

/** Fields the invite card needs to draw itself. */
export type InviteCardData = Pick<
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
  | "is_cancelled"
>;

export interface GuestRow {
  id: string;
  event_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  token: string;
  status: RsvpStatus;
  party_size: number;
  note: string | null;
  answer: string | null;
  source: "host" | "link";
  invited_at: string | null;
  invite_channel: string | null;
  reminded_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GiftKind = "item" | "gift_card" | "idea";

export interface GiftItemRow {
  id: string;
  event_id: string;
  kind: GiftKind;
  title: string;
  note: string | null;
  url: string | null;
  price_text: string | null;
  quantity: number;
  sort_order: number;
  created_at: string;
}

export interface GiftClaimRow {
  id: string;
  gift_item_id: string;
  event_id: string;
  guest_id: string | null;
  name: string;
  quantity: number;
  created_at: string;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
