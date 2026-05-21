-- supabase/migrations/20260521_0006_schedule_send_reminders_cron.sql
--
-- Requires pg_cron and pg_net extensions (both enabled by default in Supabase).
--
-- BEFORE applying this migration, you must set two database settings so the cron job
-- can call the Edge Function with the service-role key. Run these once via the
-- Supabase SQL editor (replacing the placeholders with your project's values):
--
--   ALTER DATABASE postgres SET app.settings.service_role_key = '<service-role-key>';
--   ALTER DATABASE postgres SET app.settings.functions_url     = 'https://<project>.supabase.co/functions/v1';

SELECT cron.schedule(
  'send-appointment-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.functions_url') || '/send-appointment-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);
