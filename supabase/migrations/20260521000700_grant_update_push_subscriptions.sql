-- supabase/migrations/20260521_0007_grant_update_push_subscriptions.sql
--
-- Postgres requires UPDATE privilege for ON CONFLICT ... DO UPDATE (upsert).
-- The subscribe route uses upsert keyed on endpoint to refresh existing
-- subscriptions, so authenticated users need UPDATE in addition to the
-- INSERT/SELECT/DELETE granted in 0004.

GRANT UPDATE ON push_subscriptions TO authenticated;
