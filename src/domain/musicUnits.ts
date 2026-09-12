/**
 * Catalog of schedulable Music units (choirs + worship).
 */
import type { MusicScheduleUnit } from './musicSchedule';

export const MUSIC_UNITS: readonly MusicScheduleUnit[] = [
  {
    id: 'mu-ijwi',
    kind: 'PRIMARY',
    name: "Ijwi ry' umwami Yesu",
    orgUnitId: 'ou-choir-ijwi',
    systemId: 'sys-choir',
  },
  {
    id: 'mu-elbethel',
    kind: 'PRIMARY',
    name: 'El bethel',
    orgUnitId: 'ou-choir-elbethel',
    systemId: 'sys-choir',
  },
  {
    id: 'mu-elim',
    kind: 'PRIMARY',
    name: 'Elim',
    orgUnitId: 'ou-choir-elim',
    systemId: 'sys-choir',
  },
  {
    id: 'mu-integuza',
    kind: 'PRIMARY',
    name: 'Integuza',
    orgUnitId: 'ou-choir-integuza',
    systemId: 'sys-choir',
  },
  {
    id: 'mu-beulah',
    kind: 'SECONDARY',
    name: 'Beulah',
    orgUnitId: 'ou-choir-beulah',
    systemId: 'sys-choir',
  },
  {
    id: 'mu-yerusalemu',
    kind: 'SECONDARY',
    name: 'Yerusalemu',
    orgUnitId: 'ou-choir-yerusalemu',
    systemId: 'sys-choir',
  },
  {
    id: 'mu-hope',
    kind: 'CHILDREN',
    name: 'Hope',
    orgUnitId: 'ou-choir-hope',
    systemId: 'sys-choir',
  },
  {
    id: 'mu-worship',
    kind: 'WORSHIP',
    name: 'Worship team',
    systemId: 'sys-worship',
  },
] as const;

export const PRIMARY_UNIT_IDS = MUSIC_UNITS.filter((u) => u.kind === 'PRIMARY').map(
  (u) => u.id,
);

export function musicUnitById(id: string): MusicScheduleUnit | undefined {
  return MUSIC_UNITS.find((u) => u.id === id);
}

export function musicUnitName(id: string): string {
  return musicUnitById(id)?.name ?? id;
}
