-- The design log no longer tracks a status (In progress / Review / Complete).
-- Make the legacy column optional so inserts that omit it succeed.

alter table public.activity_logs alter column status drop not null;
alter table public.activity_logs alter column status set default 'In progress';

-- Optional: drop the column entirely once you're sure nothing else reads it.
-- alter table public.activity_logs drop column status;
