import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of use" };

// Starting-point terms. Have them reviewed before launch.

export default function TermsPage() {
  const email = contactEmail();
  return (
    <LegalPage title="Terms of use" updated="October 30, 2026">
      <p>By using Hello RSVP you agree to these terms. If you don&rsquo;t agree, please don&rsquo;t use the service.</p>

      <h2>The service</h2>
      <p>
        Hello RSVP lets hosts create invitations, share them and collect replies, free of charge. We may change or stop
        features over time and will try to give notice of significant changes.
      </p>

      <h2>Your account</h2>
      <p>
        You need to be at least 16 to create an account. Keep access to your email secure, since it&rsquo;s how you sign
        in. You&rsquo;re responsible for what you create and send with your account.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Only invite people who would expect to hear from you, and only add contact details you&rsquo;re allowed to use.</li>
        <li>Don&rsquo;t use Hello RSVP for spam, advertising, fraud, harassment or anything illegal.</li>
        <li>Don&rsquo;t upload photos or text you don&rsquo;t have the right to share.</li>
      </ul>
      <p>We may remove content or close accounts that break these rules.</p>

      <h2>Your content</h2>
      <p>
        You keep ownership of what you upload. You give us permission to store and display it only as needed to run the
        service, for example showing your invite to the people you send it to.
      </p>

      <h2>Gift links</h2>
      <p>
        Gift lists can link to other stores. Purchases happen on those sites under their terms; Hello RSVP doesn&rsquo;t
        sell anything or handle payments.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided as is. We work to keep it reliable, but we can&rsquo;t promise it will always be available
        or error-free, and we aren&rsquo;t liable for indirect losses such as a missed reply.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${email}`}>{email}</a>
      </p>
    </LegalPage>
  );
}
