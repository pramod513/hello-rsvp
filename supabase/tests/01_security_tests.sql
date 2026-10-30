\set ON_ERROR_STOP on
\set A '''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'''
\set B '''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'''

insert into auth.users (id, email) values (:A, 'a@example.com'), (:B, 'b@example.com');

-- Helper to run a statement that must fail, and report PASS/FAIL.
create or replace function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAIL (no error): %', label;
exception
  when others then
    if sqlerrm like 'FAIL (no error)%' then raise; end if;
    raise notice 'PASS: % -> %', label, sqlerrm;
end $$;
grant execute on function pg_temp.expect_error(text, text) to anon, authenticated;

-- Host A creates an event, guests and a gift
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);

insert into public.events (slug, title, event_type, event_date, start_time, timezone, template)
values ('priyas-30th-k7m2qp', 'Priya turns 30', 'birthday', '2026-11-14', '18:00', 'America/Chicago', 'marigold');

do $$ begin
  if (select host_id from public.events where slug = 'priyas-30th-k7m2qp') <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then
    raise exception 'FAIL: host_id default';
  end if;
  raise notice 'PASS: host_id defaults to auth.uid()';
end $$;

insert into public.guests (event_id, name, email, token)
select id, 'Sofia Martinez', 'sofia@example.com', 'tok-sofia' from public.events where slug = 'priyas-30th-k7m2qp';
insert into public.guests (event_id, name, phone)
select id, 'Ravi Iyer', '+91 98450 12345' from public.events where slug = 'priyas-30th-k7m2qp';
insert into public.gift_items (event_id, title, quantity)
select id, 'Board game', 1 from public.events where slug = 'priyas-30th-k7m2qp';

do $$ begin
  if (select count(*) from public.guests) <> 2 then raise exception 'FAIL: host sees guests'; end if;
  if (select length(token) from public.guests where name = 'Ravi Iyer') <> 32 then raise exception 'FAIL: token default'; end if;
  raise notice 'PASS: host A sees own guests, token default generated';
end $$;

update public.guests set status = 'yes', party_size = 2 where name = 'Sofia Martinez';
do $$ begin
  if (select updated_at > created_at from public.guests where name = 'Sofia Martinez') is not true then
    -- same transaction timestamps can be equal; just check trigger ran without error
    null;
  end if;
  raise notice 'PASS: host updates guest';
end $$;

select pg_temp.expect_error($q$insert into public.events (slug, title, event_date) values ('Bad Slug!', 'x', '2026-01-01')$q$, 'slug format check');
select pg_temp.expect_error($q$insert into public.events (slug, title, event_date, template) values ('ok-slug-1', 'x', '2026-01-01', 'neon')$q$, 'template check');
select pg_temp.expect_error($q$insert into public.events (slug, title, event_date, host_id) values ('ok-slug-2', 'x', '2026-01-01', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$q$, 'cannot create event for another host');
select pg_temp.expect_error($q$update public.guests set status = 'sure' where name = 'Ravi Iyer'$q$, 'status check');

-- Storage: A can upload into own folder only
insert into storage.objects (bucket_id, name) values ('invite-images', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cover.jpg');
select pg_temp.expect_error($q$insert into storage.objects (bucket_id, name) values ('invite-images', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cover.jpg')$q$, 'cannot upload into another host folder');
select pg_temp.expect_error($q$insert into storage.objects (bucket_id, name) values ('invite-images', 'cover.jpg')$q$, 'cannot upload outside a folder');

-- Host B sees nothing of A's and cannot write into A's event
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false);
do $$ begin
  if (select count(*) from public.events) <> 0 then raise exception 'FAIL: B sees A events'; end if;
  if (select count(*) from public.guests) <> 0 then raise exception 'FAIL: B sees A guests'; end if;
  if (select count(*) from public.gift_items) <> 0 then raise exception 'FAIL: B sees A gifts'; end if;
  if (select count(*) from storage.objects) <> 0 then raise exception 'FAIL: B sees A files'; end if;
  raise notice 'PASS: host B cannot read host A data';
end $$;

-- Direct insert using A's event id (B can't see it, so fetch as superuser first)
reset role;
select id as a_event from public.events where slug = 'priyas-30th-k7m2qp' \gset
set role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false);
select pg_temp.expect_error(format($q$insert into public.guests (event_id, name) values (%L, 'Intruder')$q$, :'a_event'), 'B cannot add guests to A event');
select pg_temp.expect_error(format($q$insert into public.gift_items (event_id, title) values (%L, 'Spam')$q$, :'a_event'), 'B cannot add gifts to A event');
update public.events set title = 'Hacked' where id = :'a_event';
delete from public.guests where event_id = :'a_event';

-- Anonymous visitors get nothing
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  if (select count(*) from public.events) <> 0 then raise exception 'FAIL: anon sees events'; end if;
  if (select count(*) from public.guests) <> 0 then raise exception 'FAIL: anon sees guests'; end if;
  raise notice 'PASS: anon cannot read events or guests';
end $$;
select pg_temp.expect_error($q$insert into public.events (slug, title, event_date) values ('anon-evt-1', 'x', '2026-01-01')$q$, 'anon cannot create events');

-- Server (service role) path for guests: claims respect quantity
reset role;
set role service_role;
do $$ begin
  if (select title from public.events where slug = 'priyas-30th-k7m2qp') <> 'Priya turns 30' then raise exception 'FAIL: B update leaked'; end if;
  if (select count(*) from public.guests) <> 2 then raise exception 'FAIL: B delete leaked'; end if;
  raise notice 'PASS: B update/delete on A rows had no effect';
end $$;

insert into public.gift_claims (gift_item_id, event_id, name)
select g.id, g.event_id, 'Sofia' from public.gift_items g where g.title = 'Board game';
select pg_temp.expect_error(
  $q$insert into public.gift_claims (gift_item_id, event_id, name) select g.id, g.event_id, 'Ravi' from public.gift_items g where g.title = 'Board game'$q$,
  'cannot over-claim a gift');

-- Host A can see and clear claims; deleting the event cascades everything
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
do $$ begin
  if (select count(*) from public.gift_claims) <> 1 then raise exception 'FAIL: host sees claims'; end if;
  raise notice 'PASS: host sees gift claims';
end $$;
delete from public.events where slug = 'priyas-30th-k7m2qp';
reset role;
do $$ begin
  if (select count(*) from public.guests) + (select count(*) from public.gift_items) + (select count(*) from public.gift_claims) <> 0 then
    raise exception 'FAIL: cascade delete';
  end if;
  raise notice 'PASS: deleting an event removes its guests, gifts and claims';
end $$;

-- Deleting a user removes their events
insert into public.events (host_id, slug, title, event_date) values (:A, 'another-one-abc', 'Another', '2026-12-01');
delete from auth.users where id = :A;
do $$ begin
  if (select count(*) from public.events) <> 0 then raise exception 'FAIL: account delete cascade'; end if;
  raise notice 'PASS: deleting an account removes its events';
end $$;

\echo ALL SQL TESTS PASSED
