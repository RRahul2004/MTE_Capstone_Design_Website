-- ==========================================================
-- MTE Capstone design log — full schema
-- Run this whole file in the Supabase SQL editor (Run, not a selection).
-- Safe to re-run. It adapts to whatever type activity_logs.id already is.
-- ==========================================================

-- 1. Base table (only created if you don't already have one)
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  author_email text,
  text text not null default '',
  category text not null,
  status text default 'In progress',   -- legacy, no longer written by the app
  worked_with text[] default '{}',
  photo_url text,
  link_url text,
  created_at timestamptz not null default now()
);

-- 2. Columns for the ideation / research / progress / meeting streams
alter table public.activity_logs add column if not exists kind text not null default 'progress';
alter table public.activity_logs add column if not exists title text;
alter table public.activity_logs add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.activity_logs add column if not exists resource_type text;
alter table public.activity_logs add column if not exists resource_authors text;
alter table public.activity_logs add column if not exists resource_source text;
alter table public.activity_logs add column if not exists resource_year int;
alter table public.activity_logs add column if not exists meeting_date date;
alter table public.activity_logs add column if not exists action_items jsonb not null default '[]'::jsonb;
-- Deliverables: proposal, reports, design reviews, presentations
alter table public.activity_logs add column if not exists stage text;
alter table public.activity_logs add column if not exists edited_at timestamptz;
alter table public.activity_logs add column if not exists edit_count int not null default 0;
alter table public.activity_logs add column if not exists deliverable_type text;
alter table public.activity_logs add column if not exists due_date date;
alter table public.activity_logs add column if not exists submitted_at timestamptz;
alter table public.activity_logs add column if not exists source_message_id text; -- Discord message + attachment id for bot deduplication
alter table public.activity_logs add column if not exists user_id uuid references auth.users (id) on delete set null;

-- The app no longer sets a status, so make sure the column has a default
-- (or is nullable) on older tables that declared it NOT NULL.
alter table public.activity_logs alter column status drop not null;
alter table public.activity_logs alter column status set default 'In progress';

-- Ideation posts and meetings have no single discipline, so they store 'General'.
-- Widen (or create) the category check to allow it.
alter table public.activity_logs drop constraint if exists activity_logs_category_check;
alter table public.activity_logs
  add constraint activity_logs_category_check check (
    category is null or category in (
      'Mech',
      'EE',
      'Embedded/Firmware/Controls',
      'Autonomy / perception',
      'Systems',
      'Application SW',
      'General'
    )
  );

alter table public.activity_logs drop constraint if exists activity_logs_kind_check;
alter table public.activity_logs
  add constraint activity_logs_kind_check check (kind in ('ideation', 'research', 'progress', 'meeting', 'deliverable'));

create index if not exists activity_logs_kind_created_idx
  on public.activity_logs (kind, created_at desc);

create unique index if not exists activity_logs_source_message_uidx
  on public.activity_logs (source_message_id)
  where source_message_id is not null;

-- 3. Cross-stream link + comments table, typed to match your existing id column
--    (uuid, bigint, or int — whatever activity_logs.id happens to be).
do $outer$
declare
  id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into id_type
  from pg_attribute a
  where a.attrelid = 'public.activity_logs'::regclass
    and a.attname = 'id'
    and a.attnum > 0;

  execute format('alter table public.activity_logs add column if not exists linked_to %s', id_type);

  if not exists (
    select 1 from pg_constraint where conname = 'activity_logs_linked_to_fkey'
  ) then
    execute 'alter table public.activity_logs
               add constraint activity_logs_linked_to_fkey
               foreign key (linked_to) references public.activity_logs (id) on delete set null';
  end if;

  execute format(
    'create table if not exists public.entry_comments (
       id uuid primary key default gen_random_uuid(),
       entry_id %s not null references public.activity_logs (id) on delete cascade,
       user_id uuid references auth.users (id) on delete set null,
       author_name text not null,
       author_email text,
       text text not null default '''',
       attachments jsonb not null default ''[]''::jsonb,
       created_at timestamptz not null default now()
     )', id_type);
end
$outer$;

create index if not exists activity_logs_linked_to_idx on public.activity_logs (linked_to);
create index if not exists entry_comments_entry_idx on public.entry_comments (entry_id, created_at);

-- 4. Backfill user_id so legacy rows can be edited/deleted by their author
update public.activity_logs a
set user_id = u.id
from auth.users u
where a.user_id is null
  and a.author_email is not null
  and lower(a.author_email) = lower(u.email);

-- 5. Row level security on entries: public read, author-only write
alter table public.activity_logs enable row level security;

drop policy if exists "Design log is publicly readable" on public.activity_logs;
create policy "Design log is publicly readable"
  on public.activity_logs for select
  using (true);

drop policy if exists "Team members can post" on public.activity_logs;
create policy "Team members can post"
  on public.activity_logs for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Authors can edit their entries" on public.activity_logs;
create policy "Authors can edit their entries"
  on public.activity_logs for update to authenticated
  using (
    auth.uid() = user_id
    or (user_id is null and lower(author_email) = lower(auth.jwt() ->> 'email'))
  );

drop policy if exists "Authors can delete their entries" on public.activity_logs;
create policy "Authors can delete their entries"
  on public.activity_logs for delete to authenticated
  using (
    auth.uid() = user_id
    or (user_id is null and lower(author_email) = lower(auth.jwt() ->> 'email'))
  );

-- 6. Teammates close out action items through this function only, so they can
--    never overwrite the author's text. (id is cast to text so this works for
--    uuid or bigint primary keys.)
drop policy if exists "Team members can update meeting action items" on public.activity_logs;

create or replace function public.toggle_action_item(entry text, idx int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  items jsonb;
  is_done boolean;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to update action items.';
  end if;

  select action_items into items
  from public.activity_logs
  where id::text = entry and kind = 'meeting';

  if items is null then
    raise exception 'Meeting not found.';
  end if;

  is_done := coalesce((items -> idx ->> 'done')::boolean, false);
  items := jsonb_set(items, array[idx::text, 'done'], to_jsonb(not is_done), true);

  update public.activity_logs set action_items = items where id::text = entry;
  return items;
end;
$fn$;

grant execute on function public.toggle_action_item(text, int) to authenticated;

-- 7. Comments: public read, signed-in insert, author-only edit/delete
alter table public.entry_comments enable row level security;

drop policy if exists "Comments are publicly readable" on public.entry_comments;
create policy "Comments are publicly readable"
  on public.entry_comments for select
  using (true);

drop policy if exists "Team members can comment" on public.entry_comments;
create policy "Team members can comment"
  on public.entry_comments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Comment authors can edit their comment" on public.entry_comments;
create policy "Comment authors can edit their comment"
  on public.entry_comments for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Comment authors can delete their comment" on public.entry_comments;
create policy "Comment authors can delete their comment"
  on public.entry_comments for delete to authenticated
  using (auth.uid() = user_id);

-- 8. Storage bucket for every attachment type
insert into storage.buckets (id, name, public)
values ('design-files', 'design-files', true)
on conflict (id) do update set public = true;

drop policy if exists "Design files are publicly readable" on storage.objects;
create policy "Design files are publicly readable"
  on storage.objects for select
  using (bucket_id = 'design-files');

drop policy if exists "Team members can upload design files" on storage.objects;
create policy "Team members can upload design files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'design-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Team members can delete their design files" on storage.objects;
create policy "Team members can delete their design files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'design-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Team members can replace their design files" on storage.objects;
create policy "Team members can replace their design files"
  on storage.objects for update to authenticated
  using (bucket_id = 'design-files' and (storage.foldername(name))[1] = auth.uid()::text);


-- Workflow stage (see supabase/add-stage.sql for the standalone migration)
alter table public.activity_logs drop constraint if exists activity_logs_stage_check;
alter table public.activity_logs
  add constraint activity_logs_stage_check check (
    stage is null or stage in ('Backlog', 'In progress', 'Testing', 'Completed')
  );

create or replace function public.set_entry_stage(entry text, next_stage text)
returns text
language plpgsql
security definer
set search_path = public
as $stagefn$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to change the stage.';
  end if;
  if next_stage not in ('Backlog', 'In progress', 'Testing', 'Completed') then
    raise exception 'Unknown stage: %', next_stage;
  end if;
  update public.activity_logs set stage = next_stage where id::text = entry;
  if not found then
    raise exception 'Entry not found.';
  end if;
  return next_stage;
end;
$stagefn$;

grant execute on function public.set_entry_stage(text, text) to authenticated;


-- Edit history (see supabase/add-revisions.sql for the standalone migration)
do $revouter$
declare
  id_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into id_type
  from pg_attribute a
  where a.attrelid = 'public.activity_logs'::regclass and a.attname = 'id' and a.attnum > 0;

  execute format(
    'create table if not exists public.entry_revisions (
       id uuid primary key default gen_random_uuid(),
       entry_id %s not null references public.activity_logs (id) on delete cascade,
       revision int not null default 1,
       edited_by uuid references auth.users (id) on delete set null,
       editor_name text,
       title text,
       text text,
       created_at timestamptz not null default now()
     )', id_type);
end
$revouter$;

create index if not exists entry_revisions_entry_idx on public.entry_revisions (entry_id, created_at desc);
alter table public.entry_revisions enable row level security;

drop policy if exists "Revisions are publicly readable" on public.entry_revisions;
create policy "Revisions are publicly readable"
  on public.entry_revisions for select using (true);

drop policy if exists "Authors can snapshot their entry" on public.entry_revisions;
create policy "Authors can snapshot their entry"
  on public.entry_revisions for insert to authenticated
  with check (
    auth.uid() = edited_by
    and exists (select 1 from public.activity_logs a where a.id = entry_id and a.user_id = auth.uid())
  );
