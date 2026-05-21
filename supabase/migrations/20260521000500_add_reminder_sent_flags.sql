-- supabase/migrations/20260521_0005_add_reminder_sent_flags.sql

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_24h BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_sent_1h  BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION reset_reminder_flags_on_reschedule()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.appointment_time IS DISTINCT FROM OLD.appointment_time THEN
    NEW.reminder_sent_24h := FALSE;
    NEW.reminder_sent_1h  := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointments_reset_reminder_flags ON appointments;

CREATE TRIGGER appointments_reset_reminder_flags
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION reset_reminder_flags_on_reschedule();
