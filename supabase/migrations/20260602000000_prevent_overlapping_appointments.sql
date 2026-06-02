-- Prevent overlapping appointments at the database level.
--
-- This is a single-chair barbershop, so "overlap" is global: any two
-- appointments whose [start, start + duration) time ranges intersect conflict.
-- The constraint is the authoritative guard against races that the app-layer
-- check-then-insert cannot win (two clients booking the same slot at once).
--
-- Admin "Slobodan unos" (custom time) inserts set allow_overlap = TRUE to
-- intentionally double-book (walk-ins, etc). Customer bookings and admin
-- "slots" mode insert with allow_overlap = FALSE and are hard-blocked.
--
-- NOTE: appointments.appointment_time is `timestamp without time zone`. The
-- app stores local wall-clock time as a fake-UTC ISO string (see localToUTC()
-- in src/lib/appointment-utils.ts), so the column carries no tz semantics. We
-- therefore use tsrange(...) below, NOT tstzrange(...): wrapping a `timestamp`
-- column in tstzrange() forces a timestamp->timestamptz cast that depends on
-- the session TimeZone and is only STABLE, which an index/EXCLUDE expression
-- rejects (ERROR 42P17: functions in index expression must be marked IMMUTABLE).

-- 1. Per-appointment duration snapshot + intentional-overlap flag.
--    duration_minutes is denormalized so a later change to a service's
--    duration never retroactively shifts already-booked appointments.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS allow_overlap     BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Keep duration_minutes in sync with the booked service via the services
--    table (authoritative source of durations). Falls back to 30 minutes for
--    an unknown service id, matching getServiceDuration() in the app.
CREATE OR REPLACE FUNCTION set_appointment_duration()
RETURNS TRIGGER AS $$
BEGIN
  SELECT s.duration_minutes
    INTO NEW.duration_minutes
    FROM services s
   WHERE s.id = NEW.service;

  IF NEW.duration_minutes IS NULL THEN
    NEW.duration_minutes := 30;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointments_set_duration ON appointments;
CREATE TRIGGER appointments_set_duration
  BEFORE INSERT OR UPDATE OF service ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION set_appointment_duration();

-- 3. Backfill duration for existing rows so the constraint can be evaluated.
UPDATE appointments a
SET duration_minutes = COALESCE(
  (SELECT s.duration_minutes FROM services s WHERE s.id = a.service),
  30
);

-- 4. Grandfather any pre-existing overlaps so adding the constraint does not
--    fail on historical data. For each overlapping pair we exempt the later
--    row (by start time, tie-broken by id); the remaining non-exempt rows are
--    guaranteed conflict-free. New bookings are still protected by the app
--    layer against overlapping these grandfathered rows.
UPDATE appointments a
SET allow_overlap = TRUE
WHERE EXISTS (
  SELECT 1
  FROM appointments b
  WHERE b.id <> a.id
    AND tsrange(b.appointment_time,
                b.appointment_time + make_interval(mins => b.duration_minutes)) &&
        tsrange(a.appointment_time,
                a.appointment_time + make_interval(mins => a.duration_minutes))
    AND (b.appointment_time, b.id) < (a.appointment_time, a.id)
);

-- 5. Reject overlapping appointments. Partial constraint: rows flagged
--    allow_overlap are exempt (and do not block others).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_overlap'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_no_overlap
      EXCLUDE USING gist (
        tsrange(appointment_time,
                appointment_time + make_interval(mins => duration_minutes)) WITH &&
      )
      WHERE (allow_overlap IS NOT TRUE);
  END IF;
END $$;
