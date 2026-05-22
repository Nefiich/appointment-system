-- supabase/migrations/20260521000600_schedule_send_reminders_cron.sql
--
-- Schedule the send-appointment-reminders Edge Function to run every 5 minutes.
--
-- Prerequisites (apply once, in this order):
--   1. pg_cron and pg_net extensions enabled
--        CREATE EXTENSION IF NOT EXISTS pg_cron;
--        CREATE EXTENSION IF NOT EXISTS pg_net;
--   2. The Edge Function is deployed:
--        supabase functions deploy send-appointment-reminders --no-verify-jwt
--      (or omit --no-verify-jwt if you keep JWT verification on; we send a
--       service-role bearer below so either mode works)
--   3. The service-role (secret) API key is stored in Supabase Vault as a
--      secret named 'service_role_key':
--        SELECT vault.create_secret('<secret API key>', 'service_role_key');
--      (or via Dashboard → Project Settings → Vault → New Secret)

SELECT cron.schedule(
  'send-appointment-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ptmytvuxdskdecnxcoak.supabase.co/functions/v1/send-appointment-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
          FROM vault.decrypted_secrets
         WHERE name = 'service_role_key'
      ),
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);
