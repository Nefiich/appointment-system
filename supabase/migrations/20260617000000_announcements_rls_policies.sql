-- supabase/migrations/20260617000000_announcements_rls_policies.sql
--
-- RLS for the announcements table.
--
-- The app's admin model (see src/middleware.ts): an authenticated user is an
-- admin if their account has an email. Phone-PIN customers have no email.
-- We mirror that here via auth.email():
--   * any authenticated user (admins + phone customers) may READ announcements
--   * only admins (email users) may INSERT / UPDATE / DELETE
--
-- Enabling RLS with no permissive policy denies every operation, which is why
-- adding/deleting started failing once RLS was turned on.

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Read: every authenticated user (the customer banner + the admin list).
DROP POLICY IF EXISTS "Authenticated can read announcements" ON announcements;
CREATE POLICY "Authenticated can read announcements"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (true);

-- Write: admins only (email users; phone customers have an empty/null email claim).
DROP POLICY IF EXISTS "Admins can insert announcements" ON announcements;
CREATE POLICY "Admins can insert announcements"
  ON announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (coalesce(auth.email(), '') <> '');

DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;
CREATE POLICY "Admins can update announcements"
  ON announcements
  FOR UPDATE
  TO authenticated
  USING (coalesce(auth.email(), '') <> '')
  WITH CHECK (coalesce(auth.email(), '') <> '');

DROP POLICY IF EXISTS "Admins can delete announcements" ON announcements;
CREATE POLICY "Admins can delete announcements"
  ON announcements
  FOR DELETE
  TO authenticated
  USING (coalesce(auth.email(), '') <> '');

GRANT SELECT, INSERT, UPDATE, DELETE ON announcements TO authenticated;
