import type {
  ProtocolRosterMember,
  ProtocolSchedulingRules,
  ProtocolService,
  ProtocolServiceKind,
  ProtocolTeamSlot,
} from './types';

export type ChoirBusyByPerson = Map<string, Set<string>>;

function canServeKind(
  member: ProtocolRosterMember,
  kind: ProtocolServiceKind,
): boolean {
  if (kind === 'TUESDAY') {
    return member.serveDays === 'TUESDAY' || member.serveDays === 'BOTH';
  }
  return member.serveDays === 'SUNDAY' || member.serveDays === 'BOTH';
}

function isUnavailable(member: ProtocolRosterMember, date: string): boolean {
  return member.unavailableDates.includes(date);
}

function dutyCount(
  personId: string,
  slots: ProtocolTeamSlot[],
  serviceById: Map<string, ProtocolService>,
  monthKey: string,
): number {
  return slots.filter((s) => {
    if (s.personId !== personId) return false;
    return serviceById.get(s.serviceId)?.monthKey === monthKey;
  }).length;
}

/**
 * Fair protocol team builder.
 * Prefer duty load toward preferTarget, then softMax; never exceed hardMax.
 * Tuesday-only + no SS1+SS2 same Sunday; choir conflicts deprioritized.
 */
export function buildProtocolTeams(input: {
  services: ProtocolService[];
  roster: ProtocolRosterMember[];
  rules: ProtocolSchedulingRules;
  choirBusy: ChoirBusyByPerson;
  nowIso?: string;
}): { slots: ProtocolTeamSlot[]; warnings: string[] } {
  const { services, roster, rules, choirBusy } = input;
  const warnings: string[] = [];
  const slots: ProtocolTeamSlot[] = [];
  const serviceById = new Map(services.map((s) => [s.id, s]));
  const ordered = [...services].sort((a, b) =>
    a.date === b.date
      ? a.kind.localeCompare(b.kind)
      : a.date.localeCompare(b.date),
  );

  let slotSeq = 0;

  for (const service of ordered) {
    const sameDaySs1 = new Set(
      slots
        .filter((s) => {
          const svc = serviceById.get(s.serviceId);
          return (
            svc &&
            svc.date === service.date &&
            svc.kind === 'SS1' &&
            service.kind === 'SS2'
          );
        })
        .map((s) => s.personId),
    );

    const alreadyOnThisService = new Set(
      slots.filter((s) => s.serviceId === service.id).map((s) => s.personId),
    );

    const eligible = roster.filter((m) => {
      if (m.status !== 'ACTIVE') return false;
      if (!canServeKind(m, service.kind)) return false;
      if (isUnavailable(m, service.date)) return false;
      if (alreadyOnThisService.has(m.personId)) return false;
      if (service.kind === 'SS2' && sameDaySs1.has(m.personId)) return false;
      const load = dutyCount(m.personId, slots, serviceById, service.monthKey);
      if (load >= rules.hardMax) return false;
      return true;
    });

    eligible.sort((a, b) => {
      const loadA = dutyCount(a.personId, slots, serviceById, service.monthKey);
      const loadB = dutyCount(b.personId, slots, serviceById, service.monthKey);
      const band = (n: number) =>
        n < rules.preferTarget ? 0 : n < rules.softMax ? 1 : 2;
      const bandDiff = band(loadA) - band(loadB);
      if (bandDiff !== 0) return bandDiff;
      if (loadA !== loadB) return loadA - loadB;

      if (rules.avoidChoirConflicts) {
        const busyA = choirBusy.get(a.personId)?.has(service.date) ? 1 : 0;
        const busyB = choirBusy.get(b.personId)?.has(service.date) ? 1 : 0;
        if (busyA !== busyB) return busyA - busyB;
      }
      return a.personId.localeCompare(b.personId);
    });

    const need = service.targetTeamSize || rules.defaultTeamSize;
    const picked = eligible.slice(0, need);

    if (picked.length < need) {
      warnings.push(
        `${service.label} (${service.date}): only ${picked.length}/${need} eligible`,
      );
    }

    for (const m of picked) {
      if (
        rules.avoidChoirConflicts &&
        choirBusy.get(m.personId)?.has(service.date)
      ) {
        warnings.push(
          `${service.label}: ${m.personId} has choir conflict — used as last resort`,
        );
      }
      slotSeq += 1;
      slots.push({
        id: `pts-${service.monthKey}-${slotSeq}`,
        serviceId: service.id,
        personId: m.personId,
        source: 'ENGINE',
      });
    }
  }

  return { slots, warnings };
}

export function validateProtocolTeams(input: {
  services: ProtocolService[];
  roster: ProtocolRosterMember[];
  slots: ProtocolTeamSlot[];
  rules: ProtocolSchedulingRules;
}): string[] {
  const issues: string[] = [];
  const serviceById = new Map(input.services.map((s) => [s.id, s]));
  const rosterByPerson = new Map(input.roster.map((m) => [m.personId, m]));

  for (const service of input.services) {
    const team = input.slots.filter((s) => s.serviceId === service.id);
    if (team.length < service.targetTeamSize) {
      issues.push(
        `${service.label}: team size ${team.length} < target ${service.targetTeamSize}`,
      );
    }
    for (const slot of team) {
      const member = rosterByPerson.get(slot.personId);
      if (!member) {
        issues.push(`${service.label}: unknown person ${slot.personId}`);
        continue;
      }
      if (member.status !== 'ACTIVE') {
        issues.push(`${service.label}: ${slot.personId} not ACTIVE`);
      }
      if (!canServeKind(member, service.kind)) {
        issues.push(
          `${service.label}: ${slot.personId} cannot serve ${service.kind}`,
        );
      }
      if (isUnavailable(member, service.date)) {
        issues.push(
          `${service.label}: ${slot.personId} marked unavailable`,
        );
      }
    }
  }

  const byDateKind = new Map<string, Set<string>>();
  for (const slot of input.slots) {
    const svc = serviceById.get(slot.serviceId);
    if (!svc) continue;
    const key = `${svc.date}:${svc.kind}`;
    const set = byDateKind.get(key) ?? new Set();
    if (set.has(slot.personId)) {
      issues.push(`${svc.label}: duplicate ${slot.personId}`);
    }
    set.add(slot.personId);
    byDateKind.set(key, set);
  }

  for (const svc of input.services.filter((s) => s.kind === 'SS2')) {
    const ss1 = input.services.find(
      (s) => s.date === svc.date && s.kind === 'SS1',
    );
    if (!ss1) continue;
    const a = new Set(
      input.slots.filter((s) => s.serviceId === ss1.id).map((s) => s.personId),
    );
    for (const slot of input.slots.filter((s) => s.serviceId === svc.id)) {
      if (a.has(slot.personId)) {
        issues.push(
          `${svc.date}: ${slot.personId} on both SS1 and SS2`,
        );
      }
    }
  }

  const monthKeys = [...new Set(input.services.map((s) => s.monthKey))];
  for (const monthKey of monthKeys) {
    for (const member of input.roster) {
      const load = dutyCount(
        member.personId,
        input.slots,
        serviceById,
        monthKey,
      );
      if (load > input.rules.hardMax) {
        issues.push(
          `${monthKey}: ${member.personId} has ${load} duties (hard max ${input.rules.hardMax})`,
        );
      }
    }
  }

  return issues;
}
