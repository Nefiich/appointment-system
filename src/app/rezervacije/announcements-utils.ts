export interface Announcement {
  id: number;
  start_date: string;
  end_date: string;
  description: string;
}

export function filterActiveAnnouncements(
  announcements: Announcement[],
  today: Date,
): Announcement[] {
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);

  return announcements.filter((a) => {
    const start = new Date(a.start_date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(a.end_date);
    end.setHours(23, 59, 59, 999);
    return dayStart >= start && dayStart <= end;
  });
}
