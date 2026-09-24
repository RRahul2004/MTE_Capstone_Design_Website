-- Adds the Deliverables stream (proposal, reports, design reviews, presentations).

alter table public.activity_logs add column if not exists deliverable_type text;
alter table public.activity_logs add column if not exists due_date date;
alter table public.activity_logs add column if not exists submitted_at timestamptz;

alter table public.activity_logs drop constraint if exists activity_logs_kind_check;
alter table public.activity_logs
  add constraint activity_logs_kind_check
  check (kind in ('ideation', 'research', 'progress', 'meeting', 'deliverable'));

create index if not exists activity_logs_due_idx
  on public.activity_logs (due_date) where kind = 'deliverable';
