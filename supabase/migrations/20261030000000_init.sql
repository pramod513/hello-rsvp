-- Hello RSVP: initial schema
-- Run this once in the Supabase SQL editor (or with `supabase db push`).
--
-- Access model
--   * Hosts sign in with Supabase Auth and can only see and change their own
--     events, guests and gift lists (row level security below).
--   * Guests never sign in. The app's server reads invites by slug and saves
--     replies by personal token using the secret key, so guests get no direct
--     database access at all.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  host_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug             text not null unique check (slug ~ '^[a-z0-9-]{4,80}$'),
  title            text not null check (char_length(title) between 1 and 120),
  event_type       text not null default 'party' check (event_type in (
                     'birthday', 'wedding', 'baby_shower', 'housewarming', 'dinner',
                     'party', 'festival', 'graduation', 'work', 'other')),
  host_name        text check (char_length(host_name) <= 80),
  description      text check (char_length(description) <= 2000),
  event_date       date not null,
  start_time       time,
  end_time         time,
  timezone         text not null default 'UTC' check (char_length(timezone) <= 64),
  location_name    text check (char_length(location_name) <= 120),
  location_address text check (char_length(location_address) <= 300),
  online_url       text check (char_length(online_url) <= 500),
  cover_image_url  text check (char_length(cover_image_url) <= 1000),
  template         text not null default 'classic' check (template in (
                     'classic', 'marigold', 'midnight', 'confetti', 'garden', 'minimal')),
  rsvp_by          date,
  allow_plus_ones  boolean not null default true,
  max_party_size   integer not null default 4 check (max_party_size between 1 and 20),
  open_link        boolean not null default true,
  show_guest_list  boolean not null default false,
  show_gifts       boolean not null default true,
  custom_question  text check (char_length(custom_question) <= 200),
  invite_message   text check (char_length(invite_message) <= 1000),
  reminder_message text check (char_length(reminder_message) <= 1000),
  is_cancelled     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.events.event_date is 'Wall-clock date in events.timezone';
comment on column public.events.open_link is 'Anyone with the invite link can reply, not only invited guests';

create index events_host_date_idx on public.events (host_id, event_date desc);

create table public.guests (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 100),
  email         text check (char_length(email) <= 254),
  phone         text check (char_length(phone) <= 32),
  token         text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status        text not null default 'pending' check (status in ('pending', 'yes', 'no', 'maybe')),
  party_size    integer not null default 1 check (party_size between 0 and 20),
  note          text check (char_length(note) <= 1000),
  answer        text check (char_length(answer) <= 1000),
  source        text not null default 'host' check (source in ('host', 'link')),
  invited_at    timestamptz,
  invite_channel text check (invite_channel in ('whatsapp', 'sms', 'email', 'link')),
  reminded_at   timestamptz,
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index guests_event_status_idx on public.guests (event_id, status);

create table public.gift_items (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  kind        text not null default 'item' check (kind in ('item', 'gift_card', 'idea')),
  title       text not null check (char_length(title) between 1 and 120),
  note        text check (char_length(note) <= 500),
  url         text check (char_length(url) <= 2000),
  price_text  text check (char_length(price_text) <= 40),
  quantity    integer not null default 1 check (quantity between 1 and 99),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index gift_items_event_idx on public.gift_items (event_id, sort_order, created_at);

create table public.gift_claims (
  id            uuid primary key default gen_random_uuid(),
  gift_item_id  uuid not null references public.gift_items (id) on delete cascade,
  event_id      uuid not null references public.events (id) on delete cascade,
  guest_id      uuid references public.guests (id) on delete set null,
  name          text not null check (char_length(name) between 1 and 100),
  quantity      integer not null default 1 check (quantity between 1 and 99),
  created_at    timestamptz not null default now()
);

create index gift_claims_item_idx on public.gift_claims (gift_item_id);
create index gift_claims_event_idx on public.gift_claims (event_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger guests_set_updated_at
  before update on public.guests
  for each row execute function public.set_updated_at();

-- A claim must belong to the same event as its gift, and cannot exceed what's left.
create or replace function public.check_gift_claim()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  item_event uuid;
  item_quantity integer;
  already_claimed integer;
begin
  select event_id, quantity into item_event, item_quantity
  from public.gift_items
  where id = new.gift_item_id
  for update;

  if item_event is null then
    raise exception 'Gift not found';
  end if;
  if item_event <> new.event_id then
    raise exception 'Gift belongs to a different event';
  end if;

  select coalesce(sum(quantity), 0) into already_claimed
  from public.gift_claims
  where gift_item_id = new.gift_item_id;

  if already_claimed + new.quantity > item_quantity then
    raise exception 'This gift has already been claimed' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger gift_claims_check
  before insert on public.gift_claims
  for each row execute function public.check_gift_claim();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.events      enable row level security;
alter table public.guests      enable row level security;
alter table public.gift_items  enable row level security;
alter table public.gift_claims enable row level security;

-- Security definer so the policies on child tables don't recurse through events' RLS.
create or replace function public.is_event_host(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events
    where id = target_event and host_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_event_host(uuid) from public, anon;
grant execute on function public.is_event_host(uuid) to authenticated;

-- events
create policy "Hosts can view their events"
  on public.events for select to authenticated
  using (host_id = (select auth.uid()));

create policy "Hosts can create events"
  on public.events for insert to authenticated
  with check (host_id = (select auth.uid()));

create policy "Hosts can update their events"
  on public.events for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

create policy "Hosts can delete their events"
  on public.events for delete to authenticated
  using (host_id = (select auth.uid()));

-- guests
create policy "Hosts can view guests of their events"
  on public.guests for select to authenticated
  using (public.is_event_host(event_id));

create policy "Hosts can add guests to their events"
  on public.guests for insert to authenticated
  with check (public.is_event_host(event_id));

create policy "Hosts can update guests of their events"
  on public.guests for update to authenticated
  using (public.is_event_host(event_id))
  with check (public.is_event_host(event_id));

create policy "Hosts can remove guests from their events"
  on public.guests for delete to authenticated
  using (public.is_event_host(event_id));

-- gift_items
create policy "Hosts can view their gift lists"
  on public.gift_items for select to authenticated
  using (public.is_event_host(event_id));

create policy "Hosts can add gifts"
  on public.gift_items for insert to authenticated
  with check (public.is_event_host(event_id));

create policy "Hosts can update gifts"
  on public.gift_items for update to authenticated
  using (public.is_event_host(event_id))
  with check (public.is_event_host(event_id));

create policy "Hosts can remove gifts"
  on public.gift_items for delete to authenticated
  using (public.is_event_host(event_id));

-- gift_claims: guests claim through the server; hosts can see and clear claims.
create policy "Hosts can view gift claims"
  on public.gift_claims for select to authenticated
  using (public.is_event_host(event_id));

create policy "Hosts can remove gift claims"
  on public.gift_claims for delete to authenticated
  using (public.is_event_host(event_id));

-- ---------------------------------------------------------------------------
-- Storage: invite images
-- Public bucket so invite pages, emails and WhatsApp previews can show the
-- image. Hosts can only write inside a folder named with their user id.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invite-images',
  'invite-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "Hosts can upload invite images to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'invite-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Hosts can view their invite image files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'invite-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Hosts can replace their invite images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'invite-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Hosts can delete their invite images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'invite-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
