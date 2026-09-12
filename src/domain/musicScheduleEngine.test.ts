import { describe, expect, it } from 'vitest';
import {
  buildMusicCalendar,
  generateMusicChoirSchedule,
  validateSchedule,
} from './musicScheduleEngine';
import { PRIMARY_UNIT_IDS } from './musicUnits';

describe('musicScheduleEngine', () => {
  it('builds SS1/SS2, midweek, and Igaburo for a month', () => {
    const services = buildMusicCalendar('2026-03', 'MONTH');
    expect(services.some((s) => s.kind === 'SS1')).toBe(true);
    expect(services.some((s) => s.kind === 'SS2')).toBe(true);
    expect(services.some((s) => s.kind === 'TUESDAY')).toBe(true);
    expect(services.some((s) => s.kind === 'FRIDAY')).toBe(true);
    expect(services.filter((s) => s.kind === 'IGABURO')).toHaveLength(1);
    // March 2026 has 5 Sundays
    expect(services.filter((s) => s.kind === 'SS1')).toHaveLength(5);
  });

  it('generates a valid choir schedule for a 4-Sunday month', () => {
    const services = buildMusicCalendar('2026-04', 'MONTH');
    expect(services.filter((s) => s.kind === 'SS1')).toHaveLength(4);
    const result = generateMusicChoirSchedule({
      services,
      seed: 42,
      attempts: 80,
    });
    expect(result.ok).toBe(true);
    const v = validateSchedule(services, result.assignments);
    expect(v.ok).toBe(true);

    // Hope on every SS1
    const ss1 = services.filter((s) => s.kind === 'SS1');
    for (const s of ss1) {
      expect(
        result.assignments.some(
          (a) => a.serviceId === s.id && a.unitId === 'mu-hope',
        ),
      ).toBe(true);
    }
    // Worship on every Tuesday
    for (const s of services.filter((x) => x.kind === 'TUESDAY')) {
      expect(
        result.assignments.some(
          (a) => a.serviceId === s.id && a.unitId === 'mu-worship',
        ),
      ).toBe(true);
      const primaries = result.assignments.filter(
        (a) => a.serviceId === s.id && PRIMARY_UNIT_IDS.includes(a.unitId),
      );
      expect(primaries).toHaveLength(1);
    }
  });

  it('generates a valid choir schedule for a 5-Sunday month', () => {
    const services = buildMusicCalendar('2026-03', 'MONTH');
    const result = generateMusicChoirSchedule({
      services,
      seed: 7,
      attempts: 100,
    });
    expect(result.ok).toBe(true);
    expect(validateSchedule(services, result.assignments).ok).toBe(true);
  });
});
