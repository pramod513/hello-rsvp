import Link from "next/link";
import { ChatIcon, LinkIcon, MailIcon, TextIcon } from "@/components/Icons";
import { InviteCard } from "@/components/InviteCard";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import type { InviteCardData } from "@/lib/types";

const SAMPLE_INVITE: InviteCardData = {
  title: "Anita turns 40",
  event_type: "birthday",
  host_name: "Rahul and the kids",
  description: null,
  event_date: "2026-12-12",
  start_time: "19:00",
  end_time: "23:00",
  timezone: "America/Chicago",
  location_name: "The Garden Room",
  location_address: "1520 W Fulton St, Chicago",
  online_url: null,
  cover_image_url: null,
  template: "marigold",
  is_cancelled: false,
};

const REPLIES = [
  { name: "Sofia M.", reply: "Coming, party of 2", tone: "yes" },
  { name: "Kemi A.", reply: "Coming", tone: "yes" },
  { name: "Tom B.", reply: "Maybe, will confirm Friday", tone: "maybe" },
  { name: "Ravi I.", reply: "Can't make it, sends love", tone: "no" },
] as const;

const OCCASIONS = [
  "Birthdays",
  "Weddings and engagements",
  "Baby showers",
  "Housewarmings",
  "Dinner parties",
  "Festivals and holidays",
  "Graduations",
  "Team offsites",
  "Game nights",
  "Reunions",
];

const FAQS = [
  {
    q: "Is Hello RSVP really free?",
    a: "Yes. Creating invites, sending them, tracking replies and making a gift list are all free, for as many events and guests as you need. There's nothing to upgrade to.",
  },
  {
    q: "Do my guests need to download an app or make an account?",
    a: "No. Guests open the link on any phone or computer, tap their answer and they're done. Only hosts sign in, with just an email address.",
  },
  {
    q: "Can I change the invite after I've sent it?",
    a: "Yes. Edit the details any time and everyone who opens their link sees the latest version. You can also send a reminder or mark the event as cancelled.",
  },
  {
    q: "Can guests change their reply?",
    a: "Yes. Each guest's personal link remembers their answer, so plans can change right up to your RSVP date.",
  },
  {
    q: "Will guests see each other's names?",
    a: "Only if you turn on the guest list for that event. Then guests see the first names of people who are coming. Contact details are never shown to guests.",
  },
  {
    q: "Does it work outside the US?",
    a: "Yes. Hello RSVP works anywhere WhatsApp, text messages or email do, and every event shows its time in the event's own time zone.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <h1>Send the invite. Watch the yeses roll in.</h1>
              <p className="lead">
                Hello RSVP turns your event into a beautiful invite you can send on WhatsApp, by text or by
                email. Guests reply in one tap, with no app or account, and you see every answer in one place.
              </p>
              <div className="hero-actions">
                <Link href="/dashboard/new" className="btn btn-primary btn-lg">
                  Create your invite
                </Link>
                <Link href="#how-it-works" className="btn btn-lg">
                  See how it works
                </Link>
              </div>
              <p className="hero-footnote">Free for hosts and guests. No credit card, no paid plans.</p>
            </div>

            <div className="hero-stage" aria-label="Example invite with replies coming in">
              <div className="hero-card">
                <InviteCard event={SAMPLE_INVITE} headingLevel="h2" />
              </div>
              <ul className="reply-stack" aria-label="Example replies">
                {REPLIES.map((r) => (
                  <li key={r.name} className="reply-slip">
                    <span className={`reply-dot reply-dot-${r.tone}`} aria-hidden="true" />
                    <strong>{r.name}</strong>
                    <span>{r.reply}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works" aria-labelledby="how-title">
          <div className="container">
            <div className="section-head">
              <h2 id="how-title">From idea to headcount in three steps</h2>
              <p>Most hosts send their first invite in about two minutes.</p>
            </div>
            <ol className="steps">
              <li>
                <h3>Design your invite</h3>
                <p>
                  Pick a design, add a photo and fill in the when and where. You see the invite exactly as your
                  guests will while you type.
                </p>
              </li>
              <li>
                <h3>Send it your way</h3>
                <p>
                  Share personal links on WhatsApp, by text or by email, or drop one link into the group chat.
                </p>
              </li>
              <li>
                <h3>Watch the replies</h3>
                <p>
                  Guests answer in one tap. You see who&rsquo;s coming, how many they&rsquo;re bringing and who
                  still hasn&rsquo;t replied.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="section section-paper" aria-labelledby="send-title">
          <div className="container split">
            <div>
              <h2 id="send-title">Send it where your guests already are</h2>
              <p className="lead" style={{ marginTop: 14 }}>
                No one has to install anything. The invite travels as a link, so it works in any chat app or
                inbox, on any phone.
              </p>
              <ul className="channel-list">
                <li>
                  <span className="channel-icon">
                    <ChatIcon />
                  </span>
                  <div>
                    <strong>WhatsApp</strong>
                    <span>Send each guest their own link from your phone, or post one link in a group.</span>
                  </div>
                </li>
                <li>
                  <span className="channel-icon">
                    <TextIcon />
                  </span>
                  <div>
                    <strong>Text message</strong>
                    <span>Open a ready-written text with the guest&rsquo;s link already filled in.</span>
                  </div>
                </li>
                <li>
                  <span className="channel-icon">
                    <MailIcon />
                  </span>
                  <div>
                    <strong>Email</strong>
                    <span>Send a designed email invite to your whole list from the dashboard.</span>
                  </div>
                </li>
                <li>
                  <span className="channel-icon">
                    <LinkIcon />
                  </span>
                  <div>
                    <strong>One link for everyone</strong>
                    <span>Anyone with the link can reply, which is ideal for big groups and open houses.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="chat" aria-label="Example of an invite shared in a chat">
              <span className="chat-day">Today</span>
              <div className="bubble bubble-out">
                <div className="link-preview">
                  <div className="link-preview-art">Anita turns 40</div>
                  <div className="link-preview-text">
                    <strong>You&rsquo;re invited: Anita turns 40</strong>
                    Saturday, December 12 at 7:00 PM
                  </div>
                </div>
                Hi Sofia! You&rsquo;re invited to Anita&rsquo;s 40th on Saturday, December 12. Tap the link to let
                us know if you can make it.
                <span className="bubble-time">6:42 PM</span>
              </div>
              <div className="bubble bubble-in">
                Just replied. We&rsquo;ll be there, both of us!
                <span className="bubble-time">6:51 PM</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="track-title">
          <div className="container split">
            <div>
              <div className="tally" aria-label="Example reply summary">
                <div className="tally-cell tally-yes">
                  <div className="tally-number">18</div>
                  <div className="tally-label">Coming</div>
                </div>
                <div className="tally-cell tally-maybe">
                  <div className="tally-number">4</div>
                  <div className="tally-label">Maybe</div>
                </div>
                <div className="tally-cell tally-no">
                  <div className="tally-number">3</div>
                  <div className="tally-label">Can&rsquo;t come</div>
                </div>
                <div className="tally-cell tally-pending">
                  <div className="tally-number">6</div>
                  <div className="tally-label">No reply yet</div>
                </div>
              </div>
              <div className="mini-guests">
                <ul>
                  <li>
                    <span>Sofia Martínez</span>
                    <span className="status status-yes">Coming, 2</span>
                  </li>
                  <li>
                    <span>Tom Becker</span>
                    <span className="status status-maybe">Maybe</span>
                  </li>
                  <li>
                    <span>Mei Lin</span>
                    <span className="status status-pending">No reply yet</span>
                  </li>
                </ul>
              </div>
            </div>
            <div>
              <h2 id="track-title">Every reply, counted for you</h2>
              <p className="lead" style={{ marginTop: 14 }}>
                See the headcount at a glance, including plus-ones. Nudge everyone who hasn&rsquo;t answered with
                a ready-made reminder, and download the list for the caterer when you&rsquo;re done.
              </p>
            </div>
          </div>
        </section>

        <section className="section section-paper" aria-labelledby="gifts-title">
          <div className="container split">
            <div>
              <h2 id="gifts-title">A gift list that saves everyone a guess</h2>
              <p className="lead" style={{ marginTop: 14 }}>
                Add things you&rsquo;d love, store links and gift cards, or ask people to bring a dish. Guests mark
                what they&rsquo;re bringing, so nothing gets doubled up. Start from suggestions for your kind of
                event.
              </p>
            </div>
            <ul className="wish" aria-label="Example gift list">
              <li className="wish-claimed">
                <span className="wish-title">Board game for game nights</span>
                <span className="small">Claimed</span>
              </li>
              <li>
                <span className="wish-title">Scented candle set</span>
                <span className="small muted">Available</span>
              </li>
              <li className="wish-claimed">
                <span className="wish-title">Cooking class for two</span>
                <span className="small">Claimed</span>
              </li>
              <li>
                <span className="wish-title">Bookstore gift card</span>
                <span className="small muted">Available</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="section" aria-labelledby="occasions-title">
          <div className="container">
            <div className="section-head">
              <h2 id="occasions-title">Made for every kind of get-together</h2>
              <p>Six designs that suit a backyard barbecue as well as a wedding, plus your own photo.</p>
            </div>
            <ul className="occasions">
              {OCCASIONS.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section-paper" aria-labelledby="faq-title">
          <div className="container-narrow">
            <h2 id="faq-title" style={{ marginBottom: 24 }}>
              Questions hosts ask
            </h2>
            <div className="faq">
              {FAQS.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="cta-band">
              <div>
                <h2>Your next invite is two minutes away.</h2>
                <p>Pick a design, add your guests and send. It&rsquo;s free.</p>
              </div>
              <Link href="/dashboard/new" className="btn btn-celebrate btn-lg">
                Create your invite
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
