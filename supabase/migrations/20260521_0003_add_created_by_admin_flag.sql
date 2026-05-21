-- supabase/migrations/20260521_0003_add_created_by_admin_flag.sql

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN NOT NULL DEFAULT FALSE;
