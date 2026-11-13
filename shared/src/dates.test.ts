import { describe, expect, it } from 'vitest';
import { addDays, dateRange, formatDate, parseDateLocal, todayLocal } from './dates';
import { dateSchema } from './schemas';

describe('dates', () => {
  it('formats local dates, not UTC', () => {
    // 00:30 local would be the previous day in UTC east of Greenwich
    expect(formatDate(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05');
  });

  it('parses back to local midnight', () => {
    const d = parseDateLocal('2026-03-09');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 9, 0]);
    expect(formatDate(parseDateLocal('2026-12-31'))).toBe('2026-12-31');
  });

  it('adds days across months and years without changing the input', () => {
    const d = parseDateLocal('2026-12-31');
    expect(formatDate(addDays(d, 1))).toBe('2027-01-01');
    expect(formatDate(addDays(d, -31))).toBe('2026-11-30');
    expect(formatDate(d)).toBe('2026-12-31');
  });

  it('todayLocal is today at midnight', () => {
    const t = todayLocal();
    expect(formatDate(t)).toBe(formatDate(new Date()));
    expect(t.getHours() + t.getMinutes()).toBe(0);
  });

  it('dateRange is inclusive; empty when from > to', () => {
    expect(dateRange('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
    expect(dateRange('2026-03-02', '2026-03-01')).toEqual([]);
  });

  it('dateSchema accepts only YYYY-MM-DD', () => {
    expect(dateSchema.safeParse('2026-11-13').success).toBe(true);
    for (const bad of ['2026-1-13', '13.11.2026', '2026-11-13T00:00:00Z', ''])
      expect(dateSchema.safeParse(bad).success).toBe(false);
  });
});
