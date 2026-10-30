import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { EventTabs } from "@/components/EventTabs";
import { getHostEvent } from "@/lib/data";
import { formatLongDate, formatTime } from "@/lib/format";
import { inviteLink } from "@/lib/share";
import { siteUrl } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getHostEvent(id);
  return { title: event?.title ?? "Event" };
}

export default async function EventLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getHostEvent(id);
  if (!event) notFound();

  return (
    <>
      <Link href="/dashboard" className="back-link">
        Back to your events
      </Link>
      <div className="page-head">
        <div>
          <h1>{event.title}</h1>
          <p>
            {formatLongDate(event.event_date)}
            {event.start_time ? ` at ${formatTime(event.start_time)}` : ""}
            {event.is_cancelled ? " (cancelled)" : ""}
          </p>
        </div>
      </div>
      <EventTabs eventId={event.id} inviteUrl={inviteLink(siteUrl(), event.slug)} />
      {children}
    </>
  );
}
