import { getServiceDuration } from './appointment-utils';

describe('getServiceDuration', () => {
  // Every known service must resolve to its real duration. Regression guard
  // for the bug where a stale, duplicated duration map omitted service 7
  // (Oblikovanje brade) and fell back to the 30-minute default, fabricating
  // phantom appointment overlaps at booking time.
  it.each([
    [0, 10],
    [1, 10],
    [2, 15],
    [3, 20],
    [4, 15],
    [5, 30],
    [6, 30],
    [7, 15],
  ])('service %i lasts %i minutes', (service, expected) => {
    expect(getServiceDuration(service)).toBe(expected);
  });

  it('accepts string service ids', () => {
    expect(getServiceDuration('7')).toBe(15);
  });

  it('falls back to 30 for unknown / null services', () => {
    expect(getServiceDuration(99)).toBe(30);
    expect(getServiceDuration(null)).toBe(30);
    expect(getServiceDuration(undefined)).toBe(30);
  });
});
