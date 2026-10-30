import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy" };

// Starting-point policy written for how this app actually works.
// Have it reviewed before launch, especially for GDPR (EU/UK) and India's DPDP Act.

export default function PrivacyPage() {
  const email = contactEmail();
  return (
    <LegalPage title="Privacy policy" updated="October 30, 2026">
      <p>
        Hello RSVP helps hosts send invitations and collect replies. This page explains what information we keep, why,
        and the choices you have.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Hosts:</strong> your email address (to sign you in), and the events, guest lists, messages, photos and
          gift lists you create.
        </li>
        <li>
          <strong>Guests:</strong> only the name a host adds for you (or that you type when replying through a shared
          link), and your reply: whether you&rsquo;re coming, how many people, any answer to the host&rsquo;s question and
          any note you leave. We never collect or store guests&rsquo; phone numbers or email addresses. Hosts send invites
          from their own WhatsApp, messaging or email app and choose the contact there.
        </li>
        <li>
          <strong>Gift lists:</strong> the name you give when you mark a gift as yours.
        </li>
        <li>
          <strong>Technical data:</strong> a sign-in cookie for hosts, and a cookie that remembers your reply on an invite
          so you can change it later. We don&rsquo;t use advertising or tracking cookies.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        Only to run the service: showing invites, saving replies and letting hosts see who&rsquo;s coming. We don&rsquo;t
        sell personal information, we don&rsquo;t show ads, and we don&rsquo;t use anyone&rsquo;s data for marketing.
      </p>

      <h2>Who can see what</h2>
      <p>
        Hosts see the guest list and replies for their own events. Guests see the invite and, only if the host turns it
        on, the first names of people who said yes. Only the host sees who chose which gift.
      </p>

      <h2>Service providers</h2>
      <p>
        We store data with Supabase (database, sign-in and photo storage), host the website with our hosting provider,
        and send sign-in emails to hosts through an email provider. They process data on our behalf and only to
        provide their service.
      </p>

      <h2>Keeping and deleting data</h2>
      <p>
        Hosts can delete a guest, a whole guest list, an event or their entire account at any time from the dashboard.
        Deleting is immediate and permanent and removes the related replies, gift lists and photos. Guests can ask the
        host to remove them, or contact us and we will.
      </p>

      <h2>Children</h2>
      <p>Hello RSVP is meant for adults organizing events. Hosts must be at least 16 years old.</p>

      <h2>Contact</h2>
      <p>
        Questions or requests about your data: <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </LegalPage>
  );
}
