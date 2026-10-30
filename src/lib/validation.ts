// Small helpers for reading and checking form input on the server.

export function text(form: FormData, key: string, maxLength = 500): string {
  const value = form.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function optionalText(form: FormData, key: string, maxLength = 500): string | null {
  const value = text(form, key, maxLength);
  return value === "" ? null : value;
}

export function checkbox(form: FormData, key: string): boolean {
  const value = form.get(key);
  return value === "on" || value === "true" || value === "1";
}

export function integer(form: FormData, key: string, min: number, max: number, fallback: number): number {
  const value = Number.parseInt(text(form, key, 10), 10);
  if (Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

export function isPhone(value: string): boolean {
  const digits = value.replace(/[^\d]/g, "");
  return /^[+\d\s().-]+$/.test(value) && digits.length >= 6 && digits.length <= 15;
}

/** Returns a normalized http(s) URL, or null if the value isn't one. Adds https:// when missing. */
export function normalizeUrl(value: string | null): string | null {
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export interface GuestInput {
  name: string;
  email: string | null;
  phone: string | null;
}

/**
 * Parses a pasted guest list. One guest per line, with name, email and phone in
 * any order separated by commas, tabs or semicolons:
 *   Sofia Martinez, sofia@example.com, +1 312 555 0182
 *   Ravi Iyer; +91 98450 12345
 */
export function parseGuestList(input: string): { guests: GuestInput[]; skipped: string[] } {
  const guests: GuestInput[] = [];
  const skipped: string[] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line
      .split(/[,;\t]/)
      .map((p) => p.trim())
      .filter(Boolean);
    let email: string | null = null;
    let phone: string | null = null;
    const nameParts: string[] = [];
    for (const part of parts) {
      if (!email && isEmail(part)) email = part.toLowerCase();
      else if (!phone && isPhone(part)) phone = part;
      else nameParts.push(part);
    }
    const name = nameParts.join(" ").slice(0, 100);
    if (!name) {
      skipped.push(line);
      continue;
    }
    guests.push({ name, email, phone });
  }
  return { guests, skipped };
}
