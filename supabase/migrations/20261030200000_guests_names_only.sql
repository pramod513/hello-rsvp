-- Hello RSVP: keep guests to names only
--
-- Hosts send invites from their own WhatsApp, messages or email app and pick
-- the contact there, so the app never needs (or stores) a guest's phone number
-- or email address. Each guest is a name plus a private reply link.

alter table public.guests drop column if exists email;
alter table public.guests drop column if exists phone;

comment on table public.guests is
  'Guest names and replies only. No phone numbers or email addresses are stored.';
