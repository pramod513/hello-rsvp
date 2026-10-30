# Hello RSVP

Free invitations and RSVP tracking for any event. Hosts design an invite, send it on WhatsApp, by text or by email, and see every reply in one place. Guests reply in one tap with no app or account.

**Stack:** Next.js 16 (App Router) · React 19 · Supabase (Postgres, Auth, Storage) · plain CSS, no UI framework.

## What's in version 1

| Area | Features |
|---|---|
| Invite builder | 6 designs, photo upload (auto-resized), event type, date/time with time zone, place + map link, online link, message, live preview |
| Guest RSVP page | Yes / Maybe / No, party size, host's custom question, note to host, change reply later, add to Google/Apple/Outlook calendar, link preview image for WhatsApp |
| Host dashboard | Add guests by first and last name (one at a time or a pasted list), per-guest WhatsApp / text / email / copy link, "send to the next guest" queue, reminders, editable messages, reply counts and filters, manual reply entry, CSV download, delete the whole guest list, cancel or delete event |
| Gift list | Gifts, gift cards and "bring along" items, store links, quantities, suggestions per event type with Amazon search links by country, guests claim items (only the host sees who), host can clear claims |
| Account | Email sign-in (link or 6-digit code), optional Google sign-in, delete account (needed for app stores) |
| Site | Homepage, privacy policy, terms, sitemap, PWA manifest and icons |

**Privacy by design:** Hello RSVP stores guests' names and replies only, never phone numbers or email addresses. Every send button opens the host's own WhatsApp, Messages or email app with the invite written, and the host picks the contact there. Each guest gets a private link, so their reply is matched to their name automatically; on a private link the name can't be changed. Hosts can delete a guest, a guest list, an event or their account at any time. Sending costs nothing.

---

## 1. Create the Supabase project (database, sign-in, photo storage)

1. Sign up at <https://supabase.com> and create a project (free tier is fine). Pick the region closest to most of your users.
2. **SQL Editor → New query**: run each file in `supabase/migrations/` in order (`20261030000000_init.sql`, then `20261030200000_guests_names_only.sql`). This creates the tables, security rules and the `invite-images` storage bucket.
3. **Project Settings → API Keys**: copy the **Project URL**, the **publishable** key (or legacy *anon* key) and the **secret** key (or legacy *service_role* key).
4. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` for now (change to your domain at launch).
   - Redirect URLs: add `http://localhost:3000/**` and later `https://yourdomain.com/**`.
5. **Authentication → Emails → Templates**: so sign-in links work across devices and the email includes a code, set both **Magic Link** and **Confirm signup** to:

   ```html
   <h2>Sign in to Hello RSVP</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">Sign in to Hello RSVP</a></p>
   <p>Or enter this code: <strong>{{ .Token }}</strong></p>
   <p>If you didn't ask to sign in, you can ignore this email.</p>
   ```

6. Supabase's built-in email sender is limited to a few emails per hour, which is fine for testing. Before launch, set up **Authentication → Emails → SMTP settings** with Resend (step 4 below) so other hosts can sign in.

**Optional, Google sign-in:** Authentication → Sign In / Providers → Google, follow Supabase's guide to create the Google OAuth client, then set `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true`.

## 2. Run it on your computer

Needs Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev
```

Open <http://localhost:3000>, sign in with your email, create an invite, add yourself as a guest with your phone number and try the WhatsApp button.

Other scripts: `npm run build` (production build), `npm run typecheck`.

## 3. Deploy on Vercel from GitHub

1. Push this repo to GitHub (private is fine).
2. At <https://vercel.com> → **Add New → Project** → import the repo. Vercel detects Next.js and runs `npm install` and `npm run build` for you.
3. Add the environment variables from `.env.example` (Settings → Environment Variables). Set `NEXT_PUBLIC_SITE_URL` to your live address.
4. Deploy. Every push to `main` redeploys automatically.

**Custom domain:** buy the domain (Cloudflare Registrar, Porkbun and Namecheap are inexpensive), then Vercel → Project → Settings → Domains → add it and follow the DNS instructions. After it works, update `NEXT_PUBLIC_SITE_URL`, the Supabase **Site URL** and **Redirect URLs**, and redeploy.

## 4. Before launch: your own sender for sign-in emails

Supabase's built-in sender only delivers to members of your Supabase organization, 2 emails an hour, so other hosts can't sign in until you add your own.

1. Sign up at <https://resend.com> (free: 3,000 emails/month, 100/day) and verify your domain (a few DNS records).
2. Create an API key.
3. Supabase → Authentication → Emails → SMTP settings → host `smtp.resend.com`, port `465`, user `resend`, password = your API key.
4. Then edit the Magic Link and Confirm signup templates as shown in step 1.5.

Guest invites never go through this sender: hosts send them from their own apps.

## Environment variables

| Name | Required | What it's for |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | Public address used in invite links and emails |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable (or anon) key |
| `SUPABASE_SECRET_KEY` | Yes | Supabase secret (or service_role) key. Server only. |
| `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH` | No | `true` shows "Continue with Google" |
| `NEXT_PUBLIC_CONTACT_EMAIL` | No | Shown on the privacy and terms pages |

## How it's built

```
src/
  app/
    page.tsx                     Homepage
    login/                       Email link / code sign-in, optional Google
    auth/callback, auth/confirm  Finish sign-in
    dashboard/
      actions.ts                 All host actions (events, guests, sending, gifts, account)
      page.tsx                   Your events
      new/                       Create an invite
      events/[id]/               Guests and replies (default tab)
        edit/                    Edit invite, cancel, delete
        gifts/                   Gift list
        guests.csv/              CSV download
      account/                   Sign out, delete account
    i/[slug]/                    Guest invite page, RSVP, gift claiming
      actions.ts                 Guest actions (reply, claim gift)
      calendar.ics/              Calendar file
      opengraph-image.tsx        Link preview image for WhatsApp and others
    privacy/, terms/
  components/                    InviteCard, EventForm, GuestManager, GiftManager, RsvpForm, GiftList …
  lib/                           Supabase clients, formatting, share links, email, validation, gift ideas
  proxy.ts                       Keeps sign-in fresh and protects /dashboard
supabase/
  migrations/                    Database schema and security rules
  tests/                         Security tests for the schema (see below)
```

**Security model.** Hosts sign in with Supabase Auth; row level security limits every query to their own events, guests and gift lists. Guests never sign in. The guest page reads an invite by its unguessable link and saves replies by each guest's personal token, on the server, using the secret key. Guests get no direct database access, so one guest can't read another's details.

**Dates.** Events store the wall-clock date and time plus an IANA time zone (e.g. `America/Chicago`), so an invite always shows the time the host meant. Calendar files convert to UTC.

### Database tests

`supabase/tests` holds 20 checks for the schema: guests are names only, hosts can't see or change each other's data, signed-out visitors get nothing, uploads stay in the host's own folder, gifts can't be over-claimed, deletes cascade. They run against plain PostgreSQL 16 with small stand-ins for Supabase's `auth` and `storage` schemas:

```bash
createdb rsvp_test
psql -d rsvp_test -f supabase/tests/00_supabase_stubs.sql
psql -d rsvp_test -f supabase/migrations/20261030000000_init.sql
psql -d rsvp_test -f supabase/migrations/20261030200000_guests_names_only.sql
psql -d rsvp_test -f supabase/tests/01_security_tests.sql   # ends with "ALL SQL TESTS PASSED"
```

## Before launch

- [ ] Point Supabase SMTP at Resend so sign-in emails aren't rate-limited
- [ ] Set the production Site URL and Redirect URLs in Supabase
- [ ] Have the privacy policy and terms reviewed (GDPR for EU/UK guests, India's DPDP Act)
- [ ] Set `NEXT_PUBLIC_CONTACT_EMAIL`
- [ ] Send a test invite to yourself on WhatsApp and check the link preview image

## Mobile apps (next phase)

The site already installs to a phone's home screen (PWA manifest and icons). For the Play Store and App Store, the planned route is an Expo (React Native) app that signs in with the same Supabase project and reuses the same database and security rules, so no backend changes are needed. Account deletion, which both stores require, is already in the web app.
