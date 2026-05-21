import { findOverlappingAppointments, Appointment } from './appointment-conflicts';

const make = (timeIso: string, duration: number, id = 1): Appointment => ({
  id,
  appointment_time: timeIso,
  duration_minutes: duration,
});

describe('findOverlappingAppointments', () => {
  it('finds an appointment whose range overlaps the new range', () => {
    const existing = [make('2026-05-21T09:00:00Z', 30)];
    const result = findOverlappingAppointments(existing, '2026-05-21T09:10:00Z', 15);
    expect(result).toHaveLength(1);
  });

  it('ignores non-overlapping appointments', () => {
    const existing = [make('2026-05-21T09:00:00Z', 30)];
    const result = findOverlappingAppointments(existing, '2026-05-21T09:30:00Z', 15);
    expect(result).toHaveLength(0);
  });

  it('treats back-to-back appointments as non-overlapping', () => {
    const existing = [make('2026-05-21T09:00:00Z', 30)];
    // existing ends at 09:30; new starts at exactly 09:30 -> no overlap
    const result = findOverlappingAppointments(existing, '2026-05-21T09:30:00Z', 15);
    expect(result).toHaveLength(0);
  });

  it('detects when the new appointment fully contains an existing one', () => {
    const existing = [make('2026-05-21T09:05:00Z', 10)];
    const result = findOverlappingAppointments(existing, '2026-05-21T09:00:00Z', 30);
    expect(result).toHaveLength(1);
  });

  it('detects when the new appointment is fully inside an existing one', () => {
    const existing = [make('2026-05-21T09:00:00Z', 60)];
    const result = findOverlappingAppointments(existing, '2026-05-21T09:20:00Z', 10);
    expect(result).toHaveLength(1);
  });

  it('excludes the appointment being edited when an ignoreId is given', () => {
    const existing = [make('2026-05-21T09:00:00Z', 30, 42)];
    const result = findOverlappingAppointments(
      existing,
      '2026-05-21T09:10:00Z',
      15,
      42,
    );
    expect(result).toHaveLength(0);
  });
});
