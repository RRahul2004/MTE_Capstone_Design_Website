-- ==========================================================
-- DESTRUCTIVE: wipes every design log entry (all four kinds)
-- and every comment attached to them. There is no undo.
-- Run in the Supabase SQL editor.
-- ==========================================================

-- 1. Look before you leap — what is about to be deleted?
select kind, count(*) as entries
from public.activity_logs
group by kind
order by kind;

-- 2. Delete everything. entry_comments rows disappear automatically
--    via "on delete cascade", but we clear them first for older
--    tables that were created without the cascade.
delete from public.entry_comments;
delete from public.activity_logs;

-- 3. Confirm the table is empty (expect 0)
select count(*) as remaining_entries from public.activity_logs;
select count(*) as remaining_comments from public.entry_comments;


-- ----------------------------------------------------------
-- OPTIONAL: also wipe every uploaded file (pdf/cad/pcb/decks).
-- Skip this if you want to keep the files in storage.
-- ----------------------------------------------------------
-- delete from storage.objects where bucket_id = 'design-files';


-- ----------------------------------------------------------
-- OPTIONAL: delete only ONE stream instead of everything.
-- ----------------------------------------------------------
-- delete from public.activity_logs where kind = 'ideation';
-- delete from public.activity_logs where kind = 'research';
-- delete from public.activity_logs where kind = 'progress';
-- delete from public.activity_logs where kind = 'meeting';

-- ----------------------------------------------------------
-- OPTIONAL: delete only your own entries.
-- ----------------------------------------------------------
-- delete from public.activity_logs
-- where author_email = 'you@uwaterloo.ca';
