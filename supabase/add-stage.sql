-- Workflow stage for progress entries: Backlog → In progress → Testing → Completed.
-- Any signed-in teammate can move an entry; only the author can edit its text.

alter table public.activity_logs add column if not exists stage text;

alter table public.activity_logs drop constraint if exists activity_logs_stage_check;
alter table public.activity_logs
  add constraint activity_logs_stage_check check (
    stage is null or stage in ('Backlog', 'In progress', 'Testing', 'Completed')
  );

-- Give existing progress entries a starting stage
update public.activity_logs
set stage = 'In progress'
where kind = 'progress' and stage is null;

create index if not exists activity_logs_stage_idx
  on public.activity_logs (stage) where kind = 'progress';

-- Stage changes go through this function so a teammate can move the card
-- without being able to overwrite the author's text.
create or replace function public.set_entry_stage(entry text, next_stage text)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to change the stage.';
  end if;

  if next_stage not in ('Backlog', 'In progress', 'Testing', 'Completed') then
    raise exception 'Unknown stage: %', next_stage;
  end if;

  update public.activity_logs
  set stage = next_stage
  where id::text = entry;

  if not found then
    raise exception 'Entry not found.';
  end if;

  return next_stage;
end;
$fn$;

grant execute on function public.set_entry_stage(text, text) to authenticated;
