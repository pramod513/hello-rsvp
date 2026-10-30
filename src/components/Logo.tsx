import Link from "next/link";

/** The Hello RSVP mark: a reply card with a check, in teal and marigold. */
export function LogoMark({ className = "logo-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="2" y="6" width="28" height="20" rx="4" fill="#0f6e6a" />
      <path d="M2.8 8.2 16 17.5l13.2-9.3" fill="none" stroke="#e2f0ed" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="25" cy="24" r="6.5" fill="#f4b400" stroke="#ffffff" strokeWidth="1.5" />
      <path d="m22.2 24 1.9 1.9 3.6-3.8" fill="none" stroke="#12302f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Hello RSVP home">
      <LogoMark />
      <span>Hello RSVP</span>
    </Link>
  );
}
