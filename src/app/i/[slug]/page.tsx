import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { GiftList } from "@/components/GiftList";
import { CalendarIcon, GiftIcon, PeopleIcon, PinIcon, VideoIcon } from "@/components/Icons";
import { InviteCard } from "@/components/InviteCard";
import { RsvpForm } from "@/components/RsvpForm";
import { firstName, formatLongDate, formatTimeRange, formatWhenOneLine, repliesClosed, shortName } from "@/lib/format";
import {
  getAttendees,
  getGuestByToken,
  getPublicEvent,
  getPublicGifts,
  guestCookieName,
  isValidToken,
  type PublicGuest,
} from "@/lib/public-data";
import { googleCalendarUrl, inviteLink, mapsUrl } from "@/lib/share";
import { siteUrl } from "@/lib/site";
import { getTemplate } from "@/lib/templates";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ g?: string; replied?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) return { title: "Invite not found", robots: { index: false } };

  const place = event.location_name || (event.online_url ? "Online" : "");
  const description = `${formatWhenOneLine(event)}${place ? `, ${place}` : ""}. Tap to see the details and reply.`;
  return {
    title: `You're invited: ${event.title}`,
    description,
    robots: { index: false, follow: false },
    openGraph: { title: `You're invited: ${event.title}`, description, type: "website", url: `/i/${slug}` },
    twitter: { card: "summary_large_image", title: `You're invited: ${event.title}`, description },
  };
}

function replySummary(guest: PublicGuest): string {
  switch (guest.status) {
    case "yes":
      return guest.party_size > 1 ? `you're coming, party of ${guest.party_size}` : "you're coming";
    case "maybe":
      return "maybe";
    case "no":
      return "you can't make it";
    default:
      return "no reply yet";
  }
}

export default async function InvitePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  const cookieStore = await cookies();
  const token = isValidToken(query.g) ? query.g : (cookieStore.get(guestCookieName(slug))?.value ?? null);
  const guest = await getGuestByToken(event.id, token);

  const [attendees, gifts] = await Promise.all([
    event.show_guest_list ? getAttendees(event.id) : Promise.resolve([]),
    event.show_gifts ? getPublicGifts(event.id, guest?.id ?? null) : Promise.resolve([]),
  ]);

  const template = getTemplate(event.template);
  const darkPage = event.template === "midnight";
  const closed = repliesClosed(event);
  const justReplied = query.replied === "1" && guest && guest.status !== "pending";
  const link = inviteLink(siteUrl(), event.slug);
  const time = formatTimeRange(event.start_time, event.end_time, event.timezone);
  const place = [event.location_name, event.location_address].filter(Boolean);
  const mapQuery = event.location_address || event.location_name;
  const headcount = attendees.reduce((sum, a) => sum + a.party_size, 0);

  let replyBlock: ReactNode;
  if (event.is_cancelled) {
    replyBlock = <p className="notice notice-warning">This event has been cancelled, so replies are closed.</p>;
  } else if (closed) {
    replyBlock = (
      <p className="notice">
        Replies closed on {formatLongDate(event.rsvp_by)}.
        {guest && guest.status !== "pending" ? ` Your reply: ${replySummary(guest)}.` : ""} Contact your host if your plans
        have changed.
      </p>
    );
  } else if (!guest && !event.open_link) {
    replyBlock = (
      <p className="notice">This invite is personal. Open the link your host sent you to reply.</p>
    );
  } else {
    replyBlock = (
      <RsvpForm
        slug={event.slug}
        token={guest?.token ?? null}
        isKnownGuest={Boolean(guest)}
        initialName={guest?.name ?? ""}
        initialStatus={guest?.status ?? "pending"}
        initialPartySize={guest?.party_size ?? 1}
        initialAnswer={guest?.answer ?? ""}
        initialNote={guest?.note ?? ""}
        allowPlusOnes={event.allow_plus_ones}
        maxPartySize={event.max_party_size}
        customQuestion={event.custom_question}
      />
    );
  }

  return (
    <div className="invite-page" style={{ background: template.pageBackground }}>
      <main id="main" className="invite-page-inner">
        <InviteCard event={event} />

        <section className="invite-panel" aria-labelledby="details-title">
          <h2 id="details-title">Details</h2>
          <dl className="detail-list" style={{ marginTop: 16 }}>
            <div>
              <dt>
                <CalendarIcon title="When" />
              </dt>
              <dd>
                {formatLongDate(event.event_date)}
                {time ? <span>{time}</span> : null}
                <span style={{ marginTop: 6 }}>
                  <a href={googleCalendarUrl({ ...event, link })} target="_blank" rel="noopener noreferrer">
                    Add to Google Calendar
                  </a>
                  {" or "}
                  <a href={`/i/${event.slug}/calendar.ics`}>download for Apple or Outlook</a>
                </span>
              </dd>
            </div>
            {place.length > 0 ? (
              <div>
                <dt>
                  <PinIcon title="Where" />
                </dt>
                <dd>
                  {place[0]}
                  {place[1] ? <span>{place[1]}</span> : null}
                  {mapQuery ? (
                    <span style={{ marginTop: 6 }}>
                      <a href={mapsUrl(mapQuery)} target="_blank" rel="noopener noreferrer">
                        Open in Maps
                      </a>
                    </span>
                  ) : null}
                </dd>
              </div>
            ) : null}
            {event.online_url ? (
              <div>
                <dt>
                  <VideoIcon title="Online" />
                </dt>
                <dd>
                  Join online
                  <span>
                    <a href={event.online_url} target="_blank" rel="noopener noreferrer nofollow" style={{ overflowWrap: "anywhere" }}>
                      {event.online_url}
                    </a>
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="invite-panel" id="reply" aria-labelledby="reply-title">
          <h2 id="reply-title">{guest && guest.status !== "pending" ? "Your reply" : "Will you come?"}</h2>
          {guest ? (
            <p className="muted" style={{ marginBottom: 18 }}>
              {guest.status === "pending"
                ? `Hi ${firstName(guest.name)}! Let ${event.host_name || "your host"} know if you can make it.`
                : `Hi ${firstName(guest.name)}. You said ${replySummary(guest)}. You can change your answer below.`}
            </p>
          ) : (
            <p className="muted" style={{ marginBottom: 18 }}>
              {event.rsvp_by && !closed
                ? `Please reply by ${formatLongDate(event.rsvp_by)}.`
                : `Let ${event.host_name || "your host"} know if you can make it.`}
            </p>
          )}
          {guest && justReplied ? (
            <div className="notice notice-success" role="status" style={{ marginBottom: 20 }}>
              <strong>Thanks, {firstName(guest.name)}! Your reply is saved.</strong> Keep this page&rsquo;s link to change your
              answer later.
              {guest.status === "yes" ? (
                <>
                  {" "}
                  <a href={googleCalendarUrl({ ...event, link })} target="_blank" rel="noopener noreferrer">
                    Add it to your calendar
                  </a>
                  .
                </>
              ) : null}
            </div>
          ) : null}
          {replyBlock}
        </section>

        {event.show_guest_list && attendees.length > 0 ? (
          <section className="invite-panel" aria-labelledby="coming-title">
            <div className="row">
              <PeopleIcon />
              <h2 id="coming-title" style={{ marginBottom: 0 }}>
                Who&rsquo;s coming
              </h2>
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              {headcount} {headcount === 1 ? "person has" : "people have"} said yes so far.
            </p>
            <ul className="attendees">
              {attendees.map((a, i) => (
                <li key={`${a.name}-${i}`}>
                  {shortName(a.name)}
                  {a.party_size > 1 ? ` +${a.party_size - 1}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {event.show_gifts && gifts.length > 0 ? (
          <section className="invite-panel" aria-labelledby="gifts-title">
            <div className="row">
              <GiftIcon />
              <h2 id="gifts-title" style={{ marginBottom: 0 }}>
                Gift list
              </h2>
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              Mark what you&rsquo;re bringing so nothing gets doubled up. Only the host sees who chose what.
            </p>
            <GiftList
              slug={event.slug}
              gifts={gifts}
              guestName={guest?.name ?? null}
              token={guest?.token ?? null}
              canClaim={!event.is_cancelled}
            />
          </section>
        ) : null}

        <p className="made-with" style={{ color: darkPage ? "#c9bfa6" : "var(--ink-soft)" }}>
          Sent with{" "}
          <Link href="/" style={{ color: darkPage ? "#e6c77d" : undefined }}>
            Hello RSVP
          </Link>
          . Make your own invite, free.
        </p>
      </main>
    </div>
  );
}
