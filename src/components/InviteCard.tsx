import { formatLongDate, formatTimeRange } from "@/lib/format";
import type { InviteCardData } from "@/lib/types";

/**
 * The invitation itself. Pure presentation: used in the builder's live
 * preview, on the guest's invite page and on the homepage.
 */
export function InviteCard({
  event,
  headingLevel = "h1",
}: {
  event: InviteCardData;
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;
  const date = formatLongDate(event.event_date);
  const time = formatTimeRange(event.start_time, event.end_time, event.timezone);
  const hasPlace = Boolean(event.location_name || event.location_address);

  return (
    <div className="invite-frame">
      <article className={`invite invite--${event.template}`}>
        {event.cover_image_url ? (
          <div className="invite-cover">
            <img src={event.cover_image_url} alt="" />
          </div>
        ) : null}
        <div className="invite-body">
          {event.is_cancelled ? <p className="invite-cancelled">This event has been cancelled</p> : null}
          <p className="invite-intro">You&rsquo;re invited to</p>
          <Heading className="invite-title">{event.title || "Your event"}</Heading>
          {event.host_name ? <p className="invite-host">Hosted by {event.host_name}</p> : null}
          <div className="invite-ornament" aria-hidden="true" />
          <p className="invite-date">{date || "Date to be announced"}</p>
          {time ? <p className="invite-time">{time}</p> : null}
          {hasPlace ? (
            <p className="invite-place">
              {event.location_name || event.location_address}
              {event.location_name && event.location_address ? <span>{event.location_address}</span> : null}
            </p>
          ) : event.online_url ? (
            <p className="invite-place">Online</p>
          ) : null}
          {event.description ? <p className="invite-message">{event.description}</p> : null}
        </div>
      </article>
    </div>
  );
}
