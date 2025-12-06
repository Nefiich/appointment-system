-- Migration: Add dynamic appointment settings table
-- This table stores configurable appointment system settings

-- Create the appointment_settings table
CREATE TABLE IF NOT EXISTS appointment_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO appointment_settings (setting_key, setting_value, description) VALUES
  ('business_start_time', '08:30', 'Business opening time in HH:MM format'),
  ('business_end_time', '18:30', 'Business closing time in HH:MM format'),
  ('time_slot_interval', '30', 'Time slot interval in minutes (e.g., 30 for half-hour slots)'),
  ('max_appointments_per_user', '3', 'Maximum number of active appointments per user'),
  ('booking_window_days', '7', 'Number of days in advance users can book (from today)'),
  ('allow_sunday_bookings', 'false', 'Allow appointments to be booked on Sundays')
ON CONFLICT (setting_key) DO NOTHING;

-- Create the services table for dynamic service management
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_bs VARCHAR(100) NOT NULL, -- Bosnian name
  duration_minutes INTEGER NOT NULL,
  color VARCHAR(50) DEFAULT 'blue',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default services (matching your current hardcoded services)
INSERT INTO services (id, name, name_bs, duration_minutes, color, display_order, is_active) VALUES
  (0, 'Shave', 'Brijanje', 10, 'blue', 0, true),
  (1, 'Buzz Cut', 'Šišanje do kože', 10, 'green', 1, true),
  (2, 'Haircut', 'Šišanje', 15, 'red', 2, true),
  (3, 'Fade', 'Fade', 20, 'yellow', 3, true),
  (4, 'Head Shave', 'Brijanje glave', 15, 'purple', 4, true),
  (5, 'Haircut + Shave', 'Šišanje + Brijanje', 30, 'orange', 5, true),
  (6, 'Fade + Shave', 'Fade + Brijanje', 30, 'teal', 6, true)
ON CONFLICT (id) DO NOTHING;

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for appointment_settings
DROP TRIGGER IF EXISTS update_appointment_settings_updated_at ON appointment_settings;
CREATE TRIGGER update_appointment_settings_updated_at
  BEFORE UPDATE ON appointment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for services
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE appointment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create policies for appointment_settings
-- Everyone can read settings
CREATE POLICY "Anyone can read appointment settings"
  ON appointment_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users with email can update settings (admins)
CREATE POLICY "Admins can update appointment settings"
  ON appointment_settings
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' IS NOT NULL AND auth.jwt() ->> 'email' != '')
  WITH CHECK (auth.jwt() ->> 'email' IS NOT NULL AND auth.jwt() ->> 'email' != '');

-- Create policies for services
-- Everyone can read services
CREATE POLICY "Anyone can read services"
  ON services
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users with email can insert/update/delete services (admins)
CREATE POLICY "Admins can insert services"
  ON services
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' IS NOT NULL AND auth.jwt() ->> 'email' != '');

CREATE POLICY "Admins can update services"
  ON services
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' IS NOT NULL AND auth.jwt() ->> 'email' != '')
  WITH CHECK (auth.jwt() ->> 'email' IS NOT NULL AND auth.jwt() ->> 'email' != '');

CREATE POLICY "Admins can delete services"
  ON services
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' IS NOT NULL AND auth.jwt() ->> 'email' != '');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointment_settings_key ON appointment_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order);

-- Grant permissions
GRANT SELECT ON appointment_settings TO authenticated;
GRANT SELECT ON services TO authenticated;
