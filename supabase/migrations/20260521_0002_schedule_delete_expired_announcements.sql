-- supabase/migrations/20260521_0002_schedule_delete_expired_announcements.sql

-- pg_cron should already be enabled in Supabase. If not:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'delete-expired-announcements',
  '0 3 * * *',
  $$DELETE FROM announcements WHERE end_date < CURRENT_DATE$$
);
