-- supabase/migrations/20260521_0001_add_oblikovanje_brade.sql

INSERT INTO services (id, name, name_bs, duration_minutes, color, display_order, is_active)
VALUES (
  7,
  'Beard styling',
  'Oblikovanje brade',
  15,
  'teal',
  (SELECT COALESCE(MAX(display_order), -1) + 1 FROM services),
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Make sure auto-increment continues past the explicit id we just inserted
SELECT setval(
  pg_get_serial_sequence('services', 'id'),
  GREATEST((SELECT MAX(id) FROM services), 7)
);
