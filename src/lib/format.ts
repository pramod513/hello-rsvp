// Dates are stored as wall-clock values (date + time + IANA time zone), so
// formatting never shifts them. Formatting is fixed to en-US so server and
// browser render the same text.

const LOCALE = "en-US";

function parseDateParts(date: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** "2026-11-14" -> "Saturday, November 14, 2026" */
export function formatLongDate(date: string | null | undefined): string {
  if (!date) return "";
  const parts = parseDateParts(date);
  if (!parts) return date;
  const [y, m, d] = parts;
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "2026-11-14" -> "Sat, Nov 14" (adds the year when it differs from `currentYear`). */
export function formatShortDate(date: string | null | undefined, currentYear?: number): string {
  if (!date) return "";
  const parts = parseDateParts(date);
  if (!parts) return date;
  const [y, m, d] = parts;
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: currentYear !== undefined && currentYear !== y ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "18:30:00" -> "6:30 PM" */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return time;
  const h = Number(match[1]);
  const min = Number(match[2]);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(min).padStart(2, "0")} ${suffix}`;
}

/** "America/Chicago" -> "Chicago time" */
export function timeZoneLabel(timeZone: string | null | undefined): string {
  if (!timeZone || timeZone === "UTC" || timeZone === "Etc/UTC") return "UTC";
  const city = timeZone.split("/").pop() ?? timeZone;
  return `${city.replace(/_/g, " ")} time`;
}

/** "6:00 PM to 10:00 PM, Chicago time" or "" for all-day events. */
export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
  timeZone?: string | null,
): string {
  if (!start) return "";
  const range = end ? `${formatTime(start)} to ${formatTime(end)}` : formatTime(start);
  return timeZone ? `${range}, ${timeZoneLabel(timeZone)}` : range;
}

/** One-line date and time used in messages: "Saturday, November 14, 2026 at 6:00 PM". */
export function formatWhenOneLine(event: {
  event_date: string | null;
  start_time: string | null;
}): string {
  const date = formatLongDate(event.event_date);
  if (!date) return "";
  return event.start_time ? `${date} at ${formatTime(event.start_time)}` : date;
}

/** Today's date (YYYY-MM-DD) in the given time zone. */
export function todayIn(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** True when replies are closed because the RSVP-by date has passed. */
export function repliesClosed(event: { rsvp_by: string | null; timezone: string }): boolean {
  if (!event.rsvp_by) return false;
  return todayIn(event.timezone) > event.rsvp_by;
}

/** True when the event date is before today in the event's time zone. */
export function isPastEvent(event: { event_date: string; timezone: string }): boolean {
  return event.event_date < todayIn(event.timezone);
}

/** "2026-10-30T17:09:31Z" -> "Oct 30" (short, for "invited on" labels). */
export function formatStamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", timeZone: "UTC" }).format(d);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** "Sofia Martínez" -> "Sofia M." for the public guest list. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? name;
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

export function pluralize(count: number, one: string, many?: string): string {
  return `${count} ${count === 1 ? one : (many ?? `${one}s`)}`;
}
