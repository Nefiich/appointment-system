export interface Appointment {
  id: number;
  appointment_time: string;
  duration_minutes: number;
}

export function findOverlappingAppointments(
  existing: Appointment[],
  newStartIso: string,
  newDurationMinutes: number,
  ignoreId?: number,
): Appointment[] {
  const newStart = new Date(newStartIso).getTime();
  const newEnd = newStart + newDurationMinutes * 60_000;

  return existing.filter((a) => {
    if (ignoreId !== undefined && a.id === ignoreId) return false;
    const start = new Date(a.appointment_time).getTime();
    const end = start + a.duration_minutes * 60_000;
    return start < newEnd && end > newStart;
  });
}
