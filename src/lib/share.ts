// Builds the share links hosts use to send invites from their own phone or
// computer. Nothing here sends a message by itself, so it costs nothing to run.

export const DEFAULT_INVITE_MESSAGE =
  "Hi {name}! You're invited to {event} on {date}. Tap the link to see the details and let us know if you can make it: {link}";

export const DEFAULT_REMINDER_MESSAGE =
  "Hi {name}, a friendly reminder about {event} on {date}. Could you let us know if you're coming? {link}";

export const DEFAULT_GROUP_MESSAGE =
  "You're invited to {event} on {date}! See the details and reply here: {link}";

export const MESSAGE_PLACEHOLDERS = ["{name}", "{event}", "{date}", "{link}"] as const;

export function inviteLink(baseUrl: string, slug: string, token?: string | null): string {
  const url = `${baseUrl.replace(/\/+$/, "")}/i/${slug}`;
  return token ? `${url}?g=${encodeURIComponent(token)}` : url;
}

export function fillMessage(
  template: string,
  values: { name?: string; event: string; date: string; link: string },
): string {
  const name = values.name?.trim() || "there";
  let text = template
    .replaceAll("{name}", name)
    .replaceAll("{event}", values.event)
    .replaceAll("{date}", values.date || "the day")
    .replaceAll("{link}", values.link);
  // Hosts sometimes delete {link}; the message is useless without it.
  if (!template.includes("{link}")) text = `${text.trim()} ${values.link}`;
  return text;
}

/** Digits only, with a leading country code if the host typed one. "+1 (312) 555-0182" -> "13125550182" */
export function phoneDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  let digits = phone.replace(/[^\d]/g, "");
  if (phone.trim().startsWith("00")) digits = digits.replace(/^00/, "");
  return digits;
}

/** WhatsApp needs the full international number. Fewer than 10 digits almost always means it's missing. */
export function looksInternational(phone: string | null | undefined): boolean {
  const trimmed = (phone ?? "").trim();
  return trimmed.startsWith("+") || trimmed.startsWith("00") || phoneDigits(trimmed).length >= 11;
}

export function whatsappUrl(phone: string | null | undefined, text: string): string {
  const digits = phoneDigits(phone);
  const encoded = encodeURIComponent(text);
  return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

/** `sms:<number>?&body=` works on both iOS and Android. */
export function smsUrl(phone: string | null | undefined, text: string): string {
  const cleaned = (phone ?? "").replace(/[^\d+]/g, "");
  return `sms:${cleaned}?&body=${encodeURIComponent(text)}`;
}

export function mailtoUrl(email: string | null | undefined, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Google Calendar "add event" link using the event's own time zone. */
export function googleCalendarUrl(event: {
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  timezone: string;
  location_name: string | null;
  location_address: string | null;
  online_url: string | null;
  link: string;
}): string {
  const date = event.event_date.replaceAll("-", "");
  let dates: string;
  if (event.start_time) {
    const { endDate, endTime } = eventEnd(event.event_date, event.start_time, event.end_time);
    const start = `${date}T${toCompactTime(event.start_time)}`;
    const end = `${endDate.replaceAll("-", "")}T${toCompactTime(endTime)}`;
    dates = `${start}/${end}`;
  } else {
    dates = `${date}/${nextDay(event.event_date).replaceAll("-", "")}`;
  }
  const location = [event.location_name, event.location_address].filter(Boolean).join(", ") || event.online_url || "";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    ctz: event.timezone,
    details: `RSVP and details: ${event.link}`,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * End of a timed event. With no end time it lasts two hours; an end time at or
 * before the start (7 PM to 1 AM) means it finishes the next day.
 */
export function eventEnd(
  date: string,
  start: string,
  end: string | null,
): { endDate: string; endTime: string } {
  if (!end) return { endDate: date, endTime: addHours(start, 2) };
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  return { endDate: endMinutes <= startMinutes ? nextDay(date) : date, endTime: end };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toCompactTime(time: string): string {
  const [h = "00", m = "00", s = "00"] = time.split(":");
  return `${h.padStart(2, "0")}${m.padStart(2, "0")}${(s || "00").slice(0, 2).padStart(2, "0")}`;
}

/** "18:00" + 2 -> "20:00", capped at 23:59 so the event stays on one day. */
export function addHours(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min((h || 0) * 60 + (m || 0) + hours * 60, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}:00`;
}

export function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}
