import { filterActiveAnnouncements } from './announcements-utils';

describe('filterActiveAnnouncements', () => {
  const today = new Date('2026-05-21T12:00:00');

  it('includes an announcement whose range contains today', () => {
    expect(
      filterActiveAnnouncements(
        [{ id: 1, start_date: '2026-05-20', end_date: '2026-05-22', description: 'x' }],
        today,
      ),
    ).toHaveLength(1);
  });

  it('excludes announcements that ended yesterday', () => {
    expect(
      filterActiveAnnouncements(
        [{ id: 1, start_date: '2026-05-10', end_date: '2026-05-20', description: 'x' }],
        today,
      ),
    ).toHaveLength(0);
  });

  it('excludes announcements that start tomorrow', () => {
    expect(
      filterActiveAnnouncements(
        [{ id: 1, start_date: '2026-05-22', end_date: '2026-05-25', description: 'x' }],
        today,
      ),
    ).toHaveLength(0);
  });

  it('includes announcement on its start_date', () => {
    expect(
      filterActiveAnnouncements(
        [{ id: 1, start_date: '2026-05-21', end_date: '2026-05-25', description: 'x' }],
        today,
      ),
    ).toHaveLength(1);
  });

  it('includes announcement on its end_date', () => {
    expect(
      filterActiveAnnouncements(
        [{ id: 1, start_date: '2026-05-15', end_date: '2026-05-21', description: 'x' }],
        today,
      ),
    ).toHaveLength(1);
  });
});
