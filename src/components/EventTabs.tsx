"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalIcon } from "./Icons";

export function EventTabs({ eventId, inviteUrl }: { eventId: string; inviteUrl: string }) {
  const pathname = usePathname();
  const base = `/dashboard/events/${eventId}`;
  const tabs = [
    { href: base, label: "Guests and replies" },
    { href: `${base}/edit`, label: "Edit invite" },
    { href: `${base}/gifts`, label: "Gift list" },
  ];

  return (
    <nav className="tabs" aria-label="Event sections">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className="tab" aria-current={pathname === t.href ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
      <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="tab tab-external">
        View invite <ExternalIcon size={16} title="opens in a new tab" />
      </a>
    </nav>
  );
}
