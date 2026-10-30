// Builds an .ics calendar file (Apple Calendar, Outlook, Google and others).
// Times are converted to UTC so every calendar app places the event correctly.

import { eventEnd, nextDay } from "./share";

/** Milliseconds the time zone is ahead of UTC at the given instant. */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant.getTime();
}

/** Converts a wall-clock date and time in a time zone to the matching UTC instant. */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  let utc = wall;
  // Two passes settle the offset, including across daylight-saving changes.
  for (let i = 0; i < 2; i++) utc = wall - timeZoneOffsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** Folds lines longer than 75 octets, as the iCalendar format requires. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (currentBytes + size > limit) {
      out.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(event: {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  timezone: string;
  location_name: string | null;
  location_address: string | null;
  online_url: string | null;
  is_cancelled: boolean;
  updated_at: string;
  link: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hello RSVP//Invites//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@hellorsvp`,
    `DTSTAMP:${utcStamp(new Date(event.updated_at || Date.now()))}`,
  ];

  if (event.start_time) {
    const { endDate, endTime } = eventEnd(event.event_date, event.start_time, event.end_time);
    lines.push(`DTSTART:${utcStamp(zonedTimeToUtc(event.event_date, event.start_time, event.timezone))}`);
    lines.push(`DTEND:${utcStamp(zonedTimeToUtc(endDate, endTime, event.timezone))}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${event.event_date.replaceAll("-", "")}`);
    lines.push(`DTEND;VALUE=DATE:${nextDay(event.event_date).replaceAll("-", "")}`);
  }

  const location = [event.location_name, event.location_address].filter(Boolean).join(", ") || event.online_url;
  const details = [event.description, event.online_url ? `Join online: ${event.online_url}` : null, `Invite and RSVP: ${event.link}`]
    .filter(Boolean)
    .join("\n\n");

  lines.push(`SUMMARY:${escapeText(event.title)}`);
  lines.push(`DESCRIPTION:${escapeText(details)}`);
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  lines.push(`URL:${event.link}`);
  lines.push(`STATUS:${event.is_cancelled ? "CANCELLED" : "CONFIRMED"}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(fold).join("\r\n") + "\r\n";
}
