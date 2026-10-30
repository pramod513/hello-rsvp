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

/**
 * Parses a pasted guest list: one name per line. If a line also contains a
 * phone number or email address (copied from a spreadsheet, say), that part is
 * dropped so it is never sent to the server.
 *   Sofia Martinez
 *   Ravi Iyer, +91 98450 12345   ->  "Ravi Iyer"
 */
export function parseGuestList(input: string): { names: string[]; removedContactDetails: boolean } {
  const names: string[] = [];
  let removedContactDetails = false;
  for (const rawLine of input.split(/\r?\n/)) {
    const parts = rawLine
      .split(/[,;\t]/)
      .map((p) => p.trim())
      .filter(Boolean);
    const kept: string[] = [];
    for (const part of parts) {
      if (isEmail(part) || isPhone(part)) removedContactDetails = true;
      else kept.push(part);
    }
    const name = kept.join(" ").replace(/\s+/g, " ").slice(0, 100).trim();
    if (name) names.push(name);
  }
  return { names, removedContactDetails };
}
