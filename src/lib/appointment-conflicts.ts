export interface Appointment {
  id: number;
  appointment_time: string;
  duration_minutes: number;
}

/**
 * Parse an appointment timestamp into epoch millis using a SINGLE, consistent
 * frame regardless of whether the string carries a zone designator.
 *
 * `appointment_time` is a Postgres `timestamp without time zone`, so Supabase
 * returns existing rows WITHOUT a trailing `Z` ("2026-06-08T13:15:00"), which
 * `new Date()` parses as LOCAL time. New bookings arrive from `toISOString()`
 * WITH a `Z`, parsed as UTC. Mixing the two shifts one set by the runtime's UTC
 * offset and fabricates (or hides) overlaps. The whole app stores wall-clock
 * time as fake-UTC, so we interpret every timestamp's wall-clock components as
 * UTC: strip any zone designator, then append `Z`.
 */
function wallClockMillis(iso: string): number {
  const bare = iso.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
  return new Date(`${bare}Z`).getTime();
}

export function findOverlappingAppointments(
  existing: Appointment[],
  newStartIso: string,
  newDurationMinutes: number,
  ignoreId?: number,
): Appointment[] {
  const newStart = wallClockMillis(newStartIso);
  const newEnd = newStart + newDurationMinutes * 60_000;

  return existing.filter((a) => {
    if (ignoreId !== undefined && a.id === ignoreId) return false;
    const start = wallClockMillis(a.appointment_time);
    const end = start + a.duration_minutes * 60_000;
    return start < newEnd && end > newStart;
  });
}
