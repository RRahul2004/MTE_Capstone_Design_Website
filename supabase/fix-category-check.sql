-- Quick fix: allow 'General' as a category.
-- Ideation posts and meeting minutes span every discipline, so they no longer
-- carry one — they store 'General' instead.

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

-- Check what your constraint allows now:
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.activity_logs'::regclass and contype = 'c';
