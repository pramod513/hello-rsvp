import Link from "next/link";
import { formatShortDate, formatTime, isPastEvent } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { EventRow, GuestRow } from "@/lib/types";

type EventSummary = Pick<
  EventRow,
  "id" | "title" | "event_date" | "start_time" | "timezone" | "is_cancelled" | "location_name"
> & { guests: Pick<GuestRow, "status" | "party_size">[] };

function tally(guests: EventSummary["guests"]) {
  let coming = 0;
  let maybe = 0;
  let waiting = 0;
  for (const g of guests) {
    if (g.status === "yes") coming += g.party_size;
    else if (g.status === "maybe") maybe++;
    else if (g.status === "pending") waiting++;
  }
  return { coming, maybe, waiting, total: guests.length };
}

function DateChip({ date }: { date: string }) {
  const [y, m, d] = date.split("-").map(Number);
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  return (
    <span className="date-chip" aria-hidden="true">
      <span className="date-chip-month">{month}</span>
      <span className="date-chip-day">{d}</span>
    </span>
  );
}

function EventList({ events }: { events: EventSummary[] }) {
  const year = new Date().getFullYear();
  return (
    <ul className="event-list">
      {events.map((e) => {
        const t = tally(e.guests);
        return (
          <li key={e.id}>
            <Link href={`/dashboard/events/${e.id}`} className="event-item">
              <DateChip date={e.event_date} />
              <div>
                <h2>{e.title}</h2>
                <p className="event-meta">
                  {formatShortDate(e.event_date, year)}
                  {e.start_time ? `, ${formatTime(e.start_time)}` : ""}
                  {e.location_name ? ` at ${e.location_name}` : ""}
                </p>
              </div>
              <div className="event-counts">
                {e.is_cancelled ? <span className="status status-no">Cancelled</span> : null}
                {t.total === 0 ? (
                  <span className="status status-pending">No guests yet</span>
                ) : (
                  <>
                    <span className="status status-yes">{t.coming} coming</span>
                    {t.maybe ? <span className="status status-maybe">{t.maybe} maybe</span> : null}
                    {t.waiting ? <span className="status status-pending">{t.waiting} waiting</span> : null}
                  </>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, event_date, start_time, timezone, is_cancelled, location_name, guests(status, party_size)")
    .order("event_date", { ascending: true });

  const events = (data ?? []) as EventSummary[];
  const upcoming = events.filter((e) => !isPastEvent(e));
  const past = events.filter((e) => isPastEvent(e)).reverse();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Your events</h1>
          <p>Create an invite, then add guests and send it.</p>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary">
          Create an invite
        </Link>
      </div>

      {deleted ? (
        <p className="notice notice-success" role="status" style={{ marginBottom: 20 }}>
          Event deleted.
        </p>
      ) : null}
      {error ? (
        <p className="notice notice-error" role="alert" style={{ marginBottom: 20 }}>
          We couldn&rsquo;t load your events. Refresh the page to try again.
        </p>
      ) : null}

      {events.length === 0 && !error ? (
        <div className="empty-state">
          <h2>No events yet</h2>
          <p>Make your first invite. It takes about two minutes, and you can change anything later.</p>
          <Link href="/dashboard/new" className="btn btn-primary btn-lg">
            Create an invite
          </Link>
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <section aria-labelledby="upcoming-title">
          <h2 id="upcoming-title" className="sr-only">
            Upcoming events
          </h2>
          <EventList events={upcoming} />
        </section>
      ) : null}

      {past.length > 0 ? (
        <section aria-labelledby="past-title" style={{ marginTop: 40 }}>
          <h2 id="past-title" style={{ fontSize: 22, marginBottom: 14 }}>
            Past events
          </h2>
          <EventList events={past} />
        </section>
      ) : null}
    </>
  );
}
