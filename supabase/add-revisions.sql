-- Edit history: every time an author edits an entry, the previous version is
-- snapshotted here first. Revisions are public to read and cannot be altered
-- or deleted by anyone, so the record of what changed is tamper-evident.

alter table public.activity_logs add column if not exists edited_at timestamptz;
alter table public.activity_logs add column if not exists edit_count int not null default 0;

do $outer$
declare
  id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into id_type
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
$outer$;

create index if not exists entry_revisions_entry_idx
  on public.entry_revisions (entry_id, created_at desc);

alter table public.entry_revisions enable row level security;

drop policy if exists "Revisions are publicly readable" on public.entry_revisions;
create policy "Revisions are publicly readable"
  on public.entry_revisions for select
  using (true);

-- Authors may append a snapshot of their own entry. There is deliberately no
-- update or delete policy: history is append-only.
drop policy if exists "Authors can snapshot their entry" on public.entry_revisions;
create policy "Authors can snapshot their entry"
  on public.entry_revisions for insert to authenticated
  with check (
    auth.uid() = edited_by
    and exists (
      select 1 from public.activity_logs a
      where a.id = entry_id and a.user_id = auth.uid()
    )
  );
