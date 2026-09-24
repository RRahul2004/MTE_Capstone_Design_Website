-- Run this ONLY AFTER schema.sql has completed successfully.

-- a) Which columns does the table actually have now?
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'activity_logs'
order by ordinal_position;

-- b) Are the policies in place? Expect SELECT / INSERT / UPDATE / DELETE rows.
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'activity_logs'
order by cmd;

-- c) Any rows whose author cannot delete them? This should return nothing.
select id, kind, title, user_id, author_email
from public.activity_logs
where user_id is null;
