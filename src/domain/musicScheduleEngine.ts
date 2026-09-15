/**
 * Music service calendar builder + choir/worship schedule generator.
 */
import type {
  MusicAssignment,
  MusicHorizon,
  MusicServiceKind,
  MusicServiceSlot,
} from './musicSchedule';
import { MUSIC_SERVICE_LABELS } from './musicSchedule';
import { PRIMARY_UNIT_IDS } from './musicUnits';

export type MusicEngineHistory = {
  /** Ordered oldest→newest Tuesday primary unit ids (recent last). */
  tuesdayHistory: string[];
  fridayHistory: string[];
  /** Last Igaburo primary pairs (most recent last), each length 2 sorted. */
  igaburoPairs: string[][];
  /** Last Igaburo appearances per primary (most recent dates). */
  igaburoByUnit: Record<string, string[]>;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function periodKeysForHorizon(
  startMonthKey: string,
  horizon: MusicHorizon,
): string[] {
  const [ys, ms] = startMonthKey.split('-').map(Number);
  let count = 1;
  if (horizon === 'QUARTER') count = 3;
  else if (horizon === 'HALF') count = 6;
  else if (horizon === 'YEAR') count = 12;
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(ys, ms - 1 + i, 1));
    keys.push(`${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`);
  }
  return keys;
}

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function weekdayUtc(year: number, month1: number, day: number): number {
  return new Date(Date.UTC(year, month1 - 1, day)).getUTCDay(); // 0=Sun
}

function isoDate(year: number, month1: number, day: number): string {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

function nid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Build empty service slots for one or more months. */
export function buildMusicCalendar(
  startMonthKey: string,
  horizon: MusicHorizon = 'MONTH',
): MusicServiceSlot[] {
  const services: MusicServiceSlot[] = [];
  for (const periodKey of periodKeysForHorizon(startMonthKey, horizon)) {
    const [y, m] = periodKey.split('-').map(Number);
    const dim = daysInMonth(y, m);
    const sundays: number[] = [];
    const tuesdays: number[] = [];
    const fridays: number[] = [];
    let lastSaturday = 0;
    for (let d = 1; d <= dim; d++) {
      const wd = weekdayUtc(y, m, d);
      if (wd === 0) sundays.push(d);
      if (wd === 2) tuesdays.push(d);
      if (wd === 5) fridays.push(d);
      if (wd === 6) lastSaturday = d;
    }
    for (const d of sundays) {
      const date = isoDate(y, m, d);
      services.push({
        id: nid('msvc'),
        periodKey,
        date,
        kind: 'SS1',
        label: `${MUSIC_SERVICE_LABELS.SS1} · ${date}`,
      });
      services.push({
        id: nid('msvc'),
        periodKey,
        date,
        kind: 'SS2',
        label: `${MUSIC_SERVICE_LABELS.SS2} · ${date}`,
      });
    }
    for (const d of tuesdays) {
      const date = isoDate(y, m, d);
      services.push({
        id: nid('msvc'),
        periodKey,
        date,
        kind: 'TUESDAY',
        label: `${MUSIC_SERVICE_LABELS.TUESDAY} · ${date}`,
      });
    }
    for (const d of fridays) {
      const date = isoDate(y, m, d);
      services.push({
        id: nid('msvc'),
        periodKey,
        date,
        kind: 'FRIDAY',
        label: `${MUSIC_SERVICE_LABELS.FRIDAY} · ${date}`,
      });
    }
    if (lastSaturday > 0) {
      const date = isoDate(y, m, lastSaturday);
      services.push({
        id: nid('msvc'),
        periodKey,
        date,
        kind: 'IGABURO',
        label: `${MUSIC_SERVICE_LABELS.IGABURO} · ${date}`,
      });
    }
  }
  return services.sort((a, b) =>
    a.date === b.date
      ? kindOrder(a.kind) - kindOrder(b.kind)
      : a.date.localeCompare(b.date),
  );
}

function kindOrder(k: MusicServiceKind): number {
  const o: Record<MusicServiceKind, number> = {
    SS1: 0,
    SS2: 1,
    TUESDAY: 2,
    FRIDAY: 3,
    IGABURO: 4,
  };
  return o[k];
}

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function recordPairs(units: string[], pairCounts: Map<string, number>) {
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const k = pairKey(units[i], units[j]);
      pairCounts.set(k, (pairCounts.get(k) ?? 0) + 1);
    }
  }
}

function assign(
  serviceId: string,
  unitId: string,
  source: 'ENGINE' | 'MANUAL' = 'ENGINE',
): MusicAssignment {
  return { id: nid('masg'), serviceId, unitId, source };
}

export type GenerateMusicScheduleResult = {
  ok: boolean;
  assignments: MusicAssignment[];
  warnings: string[];
  reason?: string;
};

/**
 * Fill calendar with Hope, Worship, secondaries, primaries per locked rules.
 * Retries with different seeds until valid or attempts exhausted.
 */
export function generateMusicChoirSchedule(input: {
  services: MusicServiceSlot[];
  history?: MusicEngineHistory;
  attempts?: number;
  seed?: number;
}): GenerateMusicScheduleResult {
  const attempts = input.attempts ?? 48;
  const baseSeed = input.seed ?? Date.now();
  let best: GenerateMusicScheduleResult | null = null;

  for (let i = 0; i < attempts; i++) {
    const rnd = mulberry32((baseSeed + i * 9973) >>> 0);
    const result = tryGenerateOnce(input.services, input.history, rnd);
    if (result.ok) return result;
    if (!best || result.warnings.length < best.warnings.length) best = result;
  }
  return (
    best ?? {
      ok: false,
      assignments: [],
      warnings: [],
      reason: 'Could not build a valid schedule',
    }
  );
}

function tryGenerateOnce(
  services: MusicServiceSlot[],
  history: MusicEngineHistory | undefined,
  rnd: Rng,
): GenerateMusicScheduleResult {
  const warnings: string[] = [];
  const assignments: MusicAssignment[] = [];
  const byPeriod = groupBy(services, (s) => s.periodKey);
  const hist: MusicEngineHistory = history ?? {
    tuesdayHistory: [],
    fridayHistory: [],
    igaburoPairs: [],
    igaburoByUnit: {},
  };

  const tueQueue = [...PRIMARY_UNIT_IDS];
  rotateQueueFromHistory(tueQueue, hist.tuesdayHistory);
  const friQueue = [...PRIMARY_UNIT_IDS];
  rotateQueueFromHistory(friQueue, hist.fridayHistory);

  for (const periodKey of Object.keys(byPeriod).sort()) {
    const monthServices = byPeriod[periodKey];
    const monthResult = fillOneMonth(
      monthServices,
      assignments,
      warnings,
      rnd,
      tueQueue,
      friQueue,
      hist,
    );
    if (!monthResult.ok) {
      return {
        ok: false,
        assignments: [],
        warnings,
        reason: monthResult.reason,
      };
    }
  }

  const validation = validateSchedule(services, assignments);
  if (!validation.ok) {
    return {
      ok: false,
      assignments,
      warnings: [...warnings, ...validation.warnings],
      reason: validation.reason,
    };
  }
  return {
    ok: true,
    assignments,
    warnings: [...warnings, ...validation.warnings],
  };
}

function rotateQueueFromHistory(queue: string[], history: string[]) {
  // Move units that served more recently to the end.
  const lastIndex = new Map<string, number>();
  history.forEach((id, i) => lastIndex.set(id, i));
  queue.sort((a, b) => (lastIndex.get(a) ?? -1) - (lastIndex.get(b) ?? -1));
}

function fillOneMonth(
  services: MusicServiceSlot[],
  assignments: MusicAssignment[],
  warnings: string[],
  rnd: Rng,
  tueQueue: string[],
  friQueue: string[],
  hist: MusicEngineHistory,
): { ok: boolean; reason?: string } {
  const sundays = unique(
    services.filter((s) => s.kind === 'SS1').map((s) => s.date),
  ).sort();
  const ss1 = new Map(
    services.filter((s) => s.kind === 'SS1').map((s) => [s.date, s]),
  );
  const ss2 = new Map(
    services.filter((s) => s.kind === 'SS2').map((s) => [s.date, s]),
  );

  // Fixed: Hope on every SS1
  for (const s of services.filter((x) => x.kind === 'SS1')) {
    assignments.push(assign(s.id, 'mu-hope'));
  }
  // Fixed: Worship on every Tuesday
  for (const s of services.filter((x) => x.kind === 'TUESDAY')) {
    assignments.push(assign(s.id, 'mu-worship'));
  }

  // Secondary Sundays: two distinct Sundays
  if (sundays.length < 2) {
    return { ok: false, reason: 'Need at least 2 Sundays for secondary choirs' };
  }
  const secondarySundays = shuffle(sundays, rnd).slice(0, 2);
  const beulahSunday = secondarySundays[0];
  const yeruSunday = secondarySundays[1];
  const beulahSide: 'SS1' | 'SS2' = rnd() < 0.5 ? 'SS1' : 'SS2';
  const yeruSide: 'SS1' | 'SS2' = rnd() < 0.5 ? 'SS1' : 'SS2';

  const unusual = new Map<string, { unitId: string; side: 'SS1' | 'SS2' }>();
  unusual.set(beulahSunday, { unitId: 'mu-beulah', side: beulahSide });
  unusual.set(yeruSunday, { unitId: 'mu-yerusalemu', side: yeruSide });

  for (const [date, u] of unusual) {
    const svc = u.side === 'SS1' ? ss1.get(date) : ss2.get(date);
    if (!svc) return { ok: false, reason: 'Missing service for secondary' };
    assignments.push(assign(svc.id, u.unitId));
  }

  // Primary Sunday fills
  const sundayFill = fillPrimarySundays(
    sundays,
    ss1,
    ss2,
    unusual,
    assignments,
    rnd,
  );
  if (!sundayFill.ok) return sundayFill;

  // Tuesday / Friday round-robin
  const tuesdays = services
    .filter((s) => s.kind === 'TUESDAY')
    .sort((a, b) => a.date.localeCompare(b.date));
  const fridays = services
    .filter((s) => s.kind === 'FRIDAY')
    .sort((a, b) => a.date.localeCompare(b.date));

  const tueAssigned = new Map<string, string>(); // tuesday date -> primary
  for (const t of tuesdays) {
    const unit = tueQueue.shift()!;
    tueQueue.push(unit);
    assignments.push(assign(t.id, unit));
    tueAssigned.set(t.date, unit);
    hist.tuesdayHistory.push(unit);
  }
  for (const f of fridays) {
    const tueUnit = [...tueAssigned.entries()].find(([td]) =>
      sameIsoWeek(td, f.date),
    )?.[1];
    let unit =
      friQueue.find((id) => id !== tueUnit) ?? friQueue[0];
    const idx = friQueue.indexOf(unit);
    friQueue.splice(idx, 1);
    friQueue.push(unit);
    if (tueUnit && unit === tueUnit) {
      warnings.push(
        `Could not avoid double midweek for a primary around ${f.date}`,
      );
    }
    assignments.push(assign(f.id, unit));
    hist.fridayHistory.push(unit);
  }

  // Igaburo: exactly 2 primaries
  const igaburo = services.find((s) => s.kind === 'IGABURO');
  if (igaburo) {
    const ig = pickIgaburoPair(rnd, hist, warnings);
    if (!ig) return { ok: false, reason: 'Could not pick Igaburo pair' };
    assignments.push(assign(igaburo.id, ig[0]));
    assignments.push(assign(igaburo.id, ig[1]));
    const pair = [...ig].sort();
    hist.igaburoPairs.push(pair);
    for (const u of ig) {
      hist.igaburoByUnit[u] = [...(hist.igaburoByUnit[u] ?? []), igaburo.date];
    }
  }

  return { ok: true };
}

function sameIsoWeek(a: string, b: string): boolean {
  // Simple: same year-month and dates within 6 days, Tue before Fri typically
  const da = new Date(a + 'T12:00:00Z');
  const db = new Date(b + 'T12:00:00Z');
  const diff = Math.abs(da.getTime() - db.getTime()) / 86400000;
  return diff <= 5;
}

function fillPrimarySundays(
  sundays: string[],
  ss1: Map<string, MusicServiceSlot>,
  ss2: Map<string, MusicServiceSlot>,
  unusual: Map<string, { unitId: string; side: 'SS1' | 'SS2' }>,
  assignments: MusicAssignment[],
  rnd: Rng,
): { ok: boolean; reason?: string } {
  const primaries = [...PRIMARY_UNIT_IDS];
  const n = sundays.length;
  const needSs1 = new Map(primaries.map((p) => [p, n === 5 ? 0 : 2]));
  const needSs2 = new Map(primaries.map((p) => [p, n === 5 ? 0 : 2]));

  // For 5 Sundays: each primary gets 5 total, split (3,2) or (2,3)
  if (n === 5) {
    const shuffled = shuffle(primaries, rnd);
    for (let i = 0; i < shuffled.length; i++) {
      const p = shuffled[i];
      if (i % 2 === 0) {
        needSs1.set(p, 3);
        needSs2.set(p, 2);
      } else {
        needSs1.set(p, 2);
        needSs2.set(p, 3);
      }
    }
  }

  const ss1SlotsPerDay = sundays.map((d) => {
    const u = unusual.get(d);
    if (u?.side === 'SS1') return 1;
    return 2;
  });
  const ss2SlotsPerDay = sundays.map((d) => {
    const u = unusual.get(d);
    if (u?.side === 'SS1') return 3;
    if (u?.side === 'SS2') return 2;
    return 2;
  });

  // Attempt assignment matrices
  for (let attempt = 0; attempt < 80; attempt++) {
    const ss1Pick: string[][] = sundays.map(() => []);
    const ss2Pick: string[][] = sundays.map(() => []);
    const rem1 = new Map(needSs1);
    const rem2 = new Map(needSs2);
    const pairCounts = new Map<string, number>();
    let failed = false;

    for (let di = 0; di < sundays.length; di++) {
      const need1 = ss1SlotsPerDay[di];
      const need2 = ss2SlotsPerDay[di];
      const pool = shuffle(primaries, rnd);

      // Pick SS1
      const chosen1: string[] = [];
      const scored1 = pool
        .filter((p) => (rem1.get(p) ?? 0) > 0)
        .sort((a, b) => {
          const ra = rem1.get(a)! - rem1.get(b)!;
          if (ra !== 0) return ra > 0 ? -1 : 1;
          return rnd() - 0.5;
        });
      for (const p of scored1) {
        if (chosen1.length >= need1) break;
        chosen1.push(p);
      }
      if (chosen1.length < need1) {
        failed = true;
        break;
      }

      // Pick SS2 from remaining rem2, excluding chosen1
      const chosen2: string[] = [];
      const scored2 = pool
        .filter((p) => (rem2.get(p) ?? 0) > 0 && !chosen1.includes(p))
        .sort((a, b) => {
          const pairPenalty = (p: string) =>
            chosen1.reduce(
              (s, c) => s + (pairCounts.get(pairKey(p, c)) ?? 0),
              0,
            );
          const pa = pairPenalty(a) - pairPenalty(b);
          if (pa !== 0) return pa;
          const ra = rem2.get(a)! - rem2.get(b)!;
          if (ra !== 0) return ra > 0 ? -1 : 1;
          return rnd() - 0.5;
        });
      for (const p of scored2) {
        if (chosen2.length >= need2) break;
        // Prefer not reusing pairs already used
        const wouldDouble = chosen1.some(
          (c) => (pairCounts.get(pairKey(p, c)) ?? 0) >= 1,
        );
        if (wouldDouble && chosen2.length + (scored2.length - scored2.indexOf(p)) > need2) {
          // soft skip if enough others remain — keep simple: allow if needed
        }
        chosen2.push(p);
      }
      if (chosen2.length < need2) {
        failed = true;
        break;
      }

      // Soft pair uniqueness: reject if any pair repeats
      const dayUnits = [...chosen1, ...chosen2];
      let pairBad = false;
      for (let i = 0; i < dayUnits.length; i++) {
        for (let j = i + 1; j < dayUnits.length; j++) {
          if ((pairCounts.get(pairKey(dayUnits[i], dayUnits[j])) ?? 0) >= 1) {
            // same day pairs are new; check cross-day: if already counted from prior days
            pairBad = true;
          }
        }
      }
      // Only reject if pair already appeared in a previous Sunday (count>=1 before recording)
      for (const a of chosen1) {
        for (const b of chosen1) {
          if (a >= b) continue;
          if ((pairCounts.get(pairKey(a, b)) ?? 0) >= 1) pairBad = true;
        }
      }
      for (const a of chosen2) {
        for (const b of chosen2) {
          if (a >= b) continue;
          if ((pairCounts.get(pairKey(a, b)) ?? 0) >= 1) pairBad = true;
        }
      }
      for (const a of chosen1) {
        for (const b of chosen2) {
          if ((pairCounts.get(pairKey(a, b)) ?? 0) >= 1) pairBad = true;
        }
      }
      if (pairBad && attempt < 60) {
        failed = true;
        break;
      }

      for (const p of chosen1) rem1.set(p, rem1.get(p)! - 1);
      for (const p of chosen2) rem2.set(p, rem2.get(p)! - 1);
      recordPairs(chosen1, pairCounts);
      recordPairs(chosen2, pairCounts);
      // Also count cross-service same Sunday as "serving together"? User said same or different sunday service — co-appearance on same Sunday different services still "together" that day? They said never SS1+SS2 same sunday for one choir (already enforced). Pairing is about serving with another choir — typically same service. I'll only count within-service pairs.

      ss1Pick[di] = chosen1;
      ss2Pick[di] = chosen2;
    }

    if (failed) continue;
    if ([...rem1.values()].some((v) => v !== 0)) continue;
    if ([...rem2.values()].some((v) => v !== 0)) continue;

    // 5-Sunday: no 3 consecutive Sundays for a choir with 3 assignments
    if (n === 5) {
      let streakBad = false;
      for (const p of primaries) {
        const days: number[] = [];
        for (let di = 0; di < n; di++) {
          if (ss1Pick[di].includes(p) || ss2Pick[di].includes(p)) days.push(di);
        }
        if (days.length === 3) {
          days.sort((a, b) => a - b);
          if (days[2] - days[0] === 2 && days[1] - days[0] === 1) {
            streakBad = true;
          }
        }
      }
      if (streakBad) continue;
    }

    // Commit
    for (let di = 0; di < sundays.length; di++) {
      const d = sundays[di];
      const s1 = ss1.get(d)!;
      const s2 = ss2.get(d)!;
      for (const p of ss1Pick[di]) assignments.push(assign(s1.id, p));
      for (const p of ss2Pick[di]) assignments.push(assign(s2.id, p));
    }
    return { ok: true };
  }

  return { ok: false, reason: 'Could not place primary choirs on Sundays' };
}

function pickIgaburoPair(
  rnd: Rng,
  hist: MusicEngineHistory,
  warnings: string[],
): [string, string] | null {
  const primaries = shuffle([...PRIMARY_UNIT_IDS], rnd);
  const recentPairs = hist.igaburoPairs.slice(-2);
  const streakCount = (u: string) => {
    const dates = hist.igaburoByUnit[u] ?? [];
    return dates.length; // simplified; consecutive months handled by preferring low count
  };

  let best: [string, string] | null = null;
  let bestScore = Infinity;
  for (let i = 0; i < primaries.length; i++) {
    for (let j = i + 1; j < primaries.length; j++) {
      const a = primaries[i];
      const b = primaries[j];
      const pair = [a, b].sort();
      let score = streakCount(a) + streakCount(b);
      // Penalize same pair as last two Igaburos
      const sameStreak = recentPairs.filter(
        (p) => p[0] === pair[0] && p[1] === pair[1],
      ).length;
      if (sameStreak >= 2) score += 100;
      else score += sameStreak * 10;
      // Prefer not repeating last pair
      if (
        recentPairs[recentPairs.length - 1] &&
        recentPairs[recentPairs.length - 1][0] === pair[0] &&
        recentPairs[recentPairs.length - 1][1] === pair[1]
      ) {
        score += 5;
      }
      if (score < bestScore) {
        bestScore = score;
        best = [a, b];
      }
    }
  }
  if (bestScore >= 100) {
    warnings.push('Igaburo pair mixing soft-constraint strained');
  }
  return best;
}

export function validateSchedule(
  services: MusicServiceSlot[],
  assignments: MusicAssignment[],
  mode: 'strict' | 'manual' = 'strict',
): { ok: boolean; warnings: string[]; reason?: string } {
  const warnings: string[] = [];
  const byService = groupBy(assignments, (a) => a.serviceId);
  const serviceById = new Map(services.map((s) => [s.id, s]));
  const soft = mode === 'manual';

  // Max 3 choirs on main
  for (const s of services) {
    const units = byService[s.id] ?? [];
    if (s.kind === 'SS1' || s.kind === 'SS2') {
      if (units.length > 3) {
        return {
          ok: false,
          warnings,
          reason: `${s.label} has more than 3 choirs`,
        };
      }
    }
    if (s.kind === 'TUESDAY') {
      const choirs = units.filter((u) => u.unitId !== 'mu-worship');
      const hasWorship = units.some((u) => u.unitId === 'mu-worship');
      if (
        !hasWorship ||
        choirs.length !== 1 ||
        !PRIMARY_UNIT_IDS.includes(choirs[0]!.unitId as (typeof PRIMARY_UNIT_IDS)[number])
      ) {
        const msg = 'Tuesday should have Worship + exactly 1 primary';
        if (soft) warnings.push(`${s.date}: ${msg}`);
        else
          return {
            ok: false,
            warnings,
            reason: hasWorship ? msg : 'Tuesday missing Worship team',
          };
      }
    }
    if (s.kind === 'FRIDAY') {
      if (
        units.length !== 1 ||
        !PRIMARY_UNIT_IDS.includes(units[0]!.unitId as (typeof PRIMARY_UNIT_IDS)[number])
      ) {
        const msg = 'Friday should have exactly 1 primary';
        if (soft) warnings.push(`${s.date}: ${msg}`);
        else return { ok: false, warnings, reason: msg };
      }
    }
    if (s.kind === 'IGABURO') {
      if (
        units.length !== 2 ||
        units.some(
          (u) =>
            !PRIMARY_UNIT_IDS.includes(u.unitId as (typeof PRIMARY_UNIT_IDS)[number]),
        )
      ) {
        const msg = 'Igaburo should have exactly 2 primaries';
        if (soft) warnings.push(`${s.date}: ${msg}`);
        else return { ok: false, warnings, reason: msg };
      }
    }
  }

  // Hope only SS1
  for (const a of assignments.filter((x) => x.unitId === 'mu-hope')) {
    const s = serviceById.get(a.serviceId);
    if (!s || s.kind !== 'SS1') {
      return { ok: false, warnings, reason: 'Hope must only serve SS1' };
    }
  }
  // Worship only Tuesday
  for (const a of assignments.filter((x) => x.unitId === 'mu-worship')) {
    const s = serviceById.get(a.serviceId);
    if (!s || s.kind !== 'TUESDAY') {
      return { ok: false, warnings, reason: 'Worship must only serve Tuesday' };
    }
  }

  // No unit on SS1 and SS2 same date
  const byDateUnit = new Map<string, Set<MusicServiceKind>>();
  for (const a of assignments) {
    const s = serviceById.get(a.serviceId);
    if (!s) continue;
    if (s.kind !== 'SS1' && s.kind !== 'SS2') continue;
    const key = `${s.date}|${a.unitId}`;
    const set = byDateUnit.get(key) ?? new Set();
    set.add(s.kind);
    byDateUnit.set(key, set);
    if (set.has('SS1') && set.has('SS2')) {
      return {
        ok: false,
        warnings,
        reason: `Unit on both SS1 and SS2 on ${s.date}`,
      };
    }
  }

  // Beulah / Yerusalemu — soft count in manual; hard same-Sunday
  const periods = unique(services.map((s) => s.periodKey));
  for (const periodKey of periods) {
    const monthServices = new Set(
      services.filter((s) => s.periodKey === periodKey).map((s) => s.id),
    );
    for (const sec of ['mu-beulah', 'mu-yerusalemu'] as const) {
      const dates = assignments
        .filter((a) => a.unitId === sec && monthServices.has(a.serviceId))
        .map((a) => serviceById.get(a.serviceId)?.date)
        .filter(Boolean) as string[];
      if (dates.length !== 1) {
        const msg = `${sec} should appear once in ${periodKey} (got ${dates.length})`;
        if (soft) warnings.push(msg);
        else return { ok: false, warnings, reason: msg };
      }
    }
    const bDate = assignments
      .filter(
        (a) => a.unitId === 'mu-beulah' && monthServices.has(a.serviceId),
      )
      .map((a) => serviceById.get(a.serviceId)?.date)[0];
    const yDate = assignments
      .filter(
        (a) => a.unitId === 'mu-yerusalemu' && monthServices.has(a.serviceId),
      )
      .map((a) => serviceById.get(a.serviceId)?.date)[0];
    if (bDate && yDate && bDate === yDate) {
      return {
        ok: false,
        warnings,
        reason: `Beulah and Yerusalemu on the same Sunday in ${periodKey}`,
      };
    }
  }

  return { ok: true, warnings };
}

function groupBy<T>(items: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
