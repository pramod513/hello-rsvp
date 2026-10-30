const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no 0/o/1/l to avoid misreading

/** Random, URL-safe identifier using the Web Crypto API (Node 20+ and browsers). */
export function randomId(length = 12): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** "Priya's 30th Birthday!" -> "priyas-30th-birthday" */
export function slugify(text: string, maxLength = 40): string {
  const base = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return base;
}

/** Public invite slug: readable prefix plus a random suffix, e.g. "priyas-30th-k7m2qp". */
export function makeEventSlug(title: string): string {
  const prefix = slugify(title);
  const suffix = randomId(6);
  return prefix ? `${prefix}-${suffix}` : `invite-${suffix}`;
}

/** Personal guest token used in RSVP links. */
export function makeGuestToken(): string {
  return randomId(14);
}
