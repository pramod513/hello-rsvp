export const SITE_NAME = "Hello RSVP";
export const SITE_TAGLINE = "Free invitations and RSVP tracking for any event";

/** The public base URL, without a trailing slash. */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function contactEmail(): string {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@example.com";
}

/** Only allow same-site relative paths as post-login destinations. */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
