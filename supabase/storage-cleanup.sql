-- Let people delete their own uploads, so removing an entry also removes its
-- files instead of orphaning them in the design-files bucket.

drop policy if exists "Team members can delete their design files" on storage.objects;
create policy "Team members can delete their design files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'design-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ----------------------------------------------------------
-- One-off sweep: delete files that no entry or comment references.
-- Review the SELECT first, then run the DELETE.
-- ----------------------------------------------------------

-- What is currently orphaned?
-- with referenced as (
--   select jsonb_array_elements(attachments) ->> 'url' as url from public.activity_logs
--   union all
--   select jsonb_array_elements(attachments) ->> 'url' as url from public.entry_comments
-- )
-- select o.name, round(((o.metadata ->> 'size')::numeric / 1024), 1) as kb, o.created_at
-- from storage.objects o
-- where o.bucket_id = 'design-files'
--   and not exists (select 1 from referenced r where r.url like '%' || o.name);

-- Delete them:
-- with referenced as (
--   select jsonb_array_elements(attachments) ->> 'url' as url from public.activity_logs
--   union all
--   select jsonb_array_elements(attachments) ->> 'url' as url from public.entry_comments
-- )
-- delete from storage.objects o
-- where o.bucket_id = 'design-files'
--   and not exists (select 1 from referenced r where r.url like '%' || o.name);
