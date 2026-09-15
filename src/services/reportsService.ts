/**
 * Church-wide mission / events / leadership reports (W5).
 */
import { computeMissionHealth, type HealthTone } from '../domain/missionHealth';
import {
  formatImpactPerFranc,
  impactPerFranc,
} from '../domain/impact';
import {
  confirmedFundingTotal,
  formatRwf,
  fundingGap,
} from '../domain/stewardship';
import type { ChurchEvent, ChurchProject, Program } from '../domain/types';
import { EVENTS, PROGRAMS, PROJECTS } from '../data/seed';
import { missionService } from './missionService';
import { financeService } from './financeService';

export type CloseoutArchiveRow = {
  kind: 'PROGRAM' | 'PROJECT';
  id: string;
  name: string;
  ownerSystemId: string;
  status: string;
  closedAt: string;
  workSummary: string;
  moneySummary: string;
  plannedCost: number;
  usedCost: number;
  participantsServed?: number;
  impactPerFranc: number | null;
  href: string;
};

export type LeadershipPack = {
  health: { green: number; amber: number; red: number; neutral: number };
  peopleServed: number;
  programsActive: number;
  projectsActive: number;
  eventsUpcoming: number;
  money: {
    plannedCost: number;
    confirmedFunding: number;
    usedCost: number;
    gap: number;
    churchFundsBalance: number;
    /** @deprecated Always 0 — Leader must not see ministry vault totals. */
    ministryVaultBalance: number;
    designatedPending: number;
  };
  impactPerFranc: number | null;
  exceptions: string[];
};

function participantsForProgram(programId: string): number {
  return missionService
    .listEnrollments(programId)
    .filter((e) => e.status === 'ACTIVE' || e.status === 'COMPLETED').length;
}

function programImpact(p: Program) {
  const snapshot = p.closeout?.participantsServedSnapshot;
  const served =
    snapshot != null ? snapshot : participantsForProgram(p.id);
  const used =
    p.closeout?.usedCostSnapshot != null
      ? p.closeout.usedCostSnapshot
      : Number(p.usedCost) || 0;
  return { served, ipf: impactPerFranc(served, used) };
}

export const reportsService = {
  participantsServed(programId: string): number {
    return participantsForProgram(programId);
  },

  impactMetrics(entity: {
    usedCost?: number;
    id?: string;
    kind?: 'PROGRAM' | 'PROJECT';
  }) {
    const served =
      entity.kind === 'PROGRAM' && entity.id
        ? participantsForProgram(entity.id)
        : 0;
    const used = Number(entity.usedCost) || 0;
    return {
      participantsServed: served,
      impactPerFranc: impactPerFranc(served, used),
      impactLabel: formatImpactPerFranc(impactPerFranc(served, used)),
    };
  },

  missionRollup(filter?: { systemId?: string; status?: string }) {
    let programs = [...PROGRAMS];
    if (filter?.systemId) {
      programs = programs.filter((p) => p.ownerSystemId === filter.systemId);
    }
    if (filter?.status && filter.status !== 'all') {
      programs = programs.filter((p) => p.status === filter.status);
    }
    return programs.map((p) => {
      const health = computeMissionHealth(p, { status: p.status });
      const { served, ipf } = programImpact(p);
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        ownerSystemId: p.ownerSystemId,
        health,
        plannedCost: Number(p.plannedCost) || 0,
        usedCost: Number(p.usedCost) || 0,
        gap: fundingGap(p),
        participantsServed: served,
        impactPerFranc: ipf,
        href: `/programs/${p.id}`,
      };
    });
  },

  eventsRollup(filter?: { status?: string }) {
    let events = [...EVENTS] as ChurchEvent[];
    if (filter?.status && filter.status !== 'all') {
      events = events.filter((e) => e.status === filter.status);
    }
    return events.map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      startsAt: e.startsAt,
      ownerSystemId: e.ownerSystemId,
      plannedCost: Number(e.plannedCost) || 0,
      usedCost: 0,
      willSpend: !!e.willSpend,
      href: `/events/${e.id}`,
    }));
  },

  closeoutArchive(): CloseoutArchiveRow[] {
    const programs = PROGRAMS.filter(
      (p) =>
        (p.status === 'ENDED' || p.status === 'CLOSING') && p.closeout,
    ).map((p) => {
      const { served, ipf } = programImpact(p);
      return {
        kind: 'PROGRAM' as const,
        id: p.id,
        name: p.name,
        ownerSystemId: p.ownerSystemId,
        status: p.status,
        closedAt: p.closeout!.closedAt,
        workSummary: p.closeout!.workSummary,
        moneySummary: p.closeout!.moneySummary,
        plannedCost:
          (p.closeout!.plannedCostSnapshot ?? Number(p.plannedCost)) || 0,
        usedCost: (p.closeout!.usedCostSnapshot ?? Number(p.usedCost)) || 0,
        participantsServed: served,
        impactPerFranc: ipf,
        href: `/programs/${p.id}`,
      };
    });
    const projects = PROJECTS.filter(
      (p: ChurchProject) =>
        (p.status === 'DONE' || p.status === 'CANCELLED') && p.closeout,
    ).map((p: ChurchProject) => ({
      kind: 'PROJECT' as const,
      id: p.id,
      name: p.name,
      ownerSystemId: p.ownerSystemId,
      status: p.status,
      closedAt: p.closeout!.closedAt,
      workSummary: p.closeout!.workSummary,
      moneySummary: p.closeout!.moneySummary,
      plannedCost:
        (p.closeout!.plannedCostSnapshot ?? Number(p.plannedCost)) || 0,
      usedCost: (p.closeout!.usedCostSnapshot ?? Number(p.usedCost)) || 0,
      impactPerFranc: null as number | null,
      href: `/projects/${p.id}`,
    }));
    return [...programs, ...projects].sort((a, b) =>
      b.closedAt.localeCompare(a.closedAt),
    );
  },

  leadershipPack(): LeadershipPack {
    const programs = PROGRAMS.filter(
      (p) => p.status !== 'ENDED' && p.visibility === 'CHURCH',
    );
    const health = { green: 0, amber: 0, red: 0, neutral: 0 };
    let peopleServed = 0;
    let plannedCost = 0;
    let confirmedFunding = 0;
    let usedCost = 0;
    const exceptions: string[] = [];

    for (const p of PROGRAMS) {
      const h = computeMissionHealth(p, { status: p.status });
      const tone = h.tone as HealthTone;
      if (tone in health) health[tone as keyof typeof health] += 1;
      if (p.status === 'ACTIVE' || p.status === 'SETUP') {
        peopleServed += participantsForProgram(p.id);
      }
      plannedCost += Number(p.plannedCost) || 0;
      confirmedFunding += confirmedFundingTotal(p);
      usedCost += Number(p.usedCost) || 0;
      const gap = fundingGap(p);
      if (gap > 50000 && p.status === 'ACTIVE') {
        exceptions.push(`${p.name}: funding gap ${formatRwf(gap)}`);
      }
      if ((p.blockers ?? []).some((b) => b.status !== 'RESOLVED')) {
        exceptions.push(`${p.name}: open blocker/risk`);
      }
    }

    for (const proj of PROJECTS) {
      const gap = fundingGap(proj);
      if (proj.willSpend && gap > 0 && proj.status === 'ACTIVE') {
        exceptions.push(`${proj.name}: spend gap ${formatRwf(gap)}`);
      }
    }

    const funds = financeService.listAllFunds().filter((f) => f.status === 'ACTIVE');
    const churchFundsBalance = funds
      .filter((f) => !f.ownerSystemId || f.ownerSystemId === 'sys-main')
      .reduce((s, f) => s + financeService.balance(f.id), 0);
    // Church Leader lock: never surface internal ministry vault balances here.

    const now = Date.now();
    const eventsUpcoming = EVENTS.filter((e) => {
      const t = new Date(e.startsAt).getTime();
      return (
        Number.isFinite(t) &&
        t >= now &&
        e.status !== 'CANCELLED' &&
        e.status !== 'COMPLETED'
      );
    }).length;

    return {
      health,
      peopleServed,
      programsActive: programs.filter((p) => p.status === 'ACTIVE').length,
      projectsActive: PROJECTS.filter((p) => p.status === 'ACTIVE').length,
      eventsUpcoming,
      money: {
        plannedCost,
        confirmedFunding,
        usedCost,
        gap: Math.max(0, plannedCost - confirmedFunding),
        churchFundsBalance,
        ministryVaultBalance: 0,
        designatedPending: PROGRAMS.reduce((s, p) => {
          return (
            s +
            (p.fundingPlan ?? [])
              .filter(
                (f) =>
                  f.sourceType === 'DESIGNATED_GIFT' &&
                  f.status !== 'CONFIRMED',
              )
              .reduce((a, f) => a + (Number(f.amount) || 0), 0)
          );
        }, 0),
      },
      impactPerFranc: impactPerFranc(peopleServed, usedCost),
      exceptions: exceptions.slice(0, 12),
    };
  },

  leadershipCsv(): string {
    const p = this.leadershipPack();
    const lines = [
      'metric,value',
      `health_green,${p.health.green}`,
      `health_amber,${p.health.amber}`,
      `health_red,${p.health.red}`,
      `people_served,${p.peopleServed}`,
      `programs_active,${p.programsActive}`,
      `projects_active,${p.projectsActive}`,
      `events_upcoming,${p.eventsUpcoming}`,
      `planned_cost,${p.money.plannedCost}`,
      `confirmed_funding,${p.money.confirmedFunding}`,
      `used_cost,${p.money.usedCost}`,
      `gap,${p.money.gap}`,
      `church_funds,${p.money.churchFundsBalance}`,
      `designated_pending,${p.money.designatedPending}`,
      `impact_per_1k_rwf,${p.impactPerFranc ?? ''}`,
      ...p.exceptions.map((e) => `exception,"${e.replace(/"/g, '""')}"`),
    ];
    return lines.join('\n');
  },

  missionCsv(filter?: { systemId?: string; status?: string }): string {
    const rows = this.missionRollup(filter);
    const header =
      'id,name,status,system,health,score,planned,used,gap,people,impact_per_1k';
    const body = rows.map((r) =>
      [
        r.id,
        `"${r.name.replace(/"/g, '""')}"`,
        r.status,
        r.ownerSystemId,
        r.health.label,
        r.health.score,
        r.plannedCost,
        r.usedCost,
        r.gap,
        r.participantsServed,
        r.impactPerFranc ?? '',
      ].join(','),
    );
    return [header, ...body].join('\n');
  },

  eventsCsv(filter?: { status?: string }): string {
    const rows = this.eventsRollup(filter);
    const header = 'id,name,status,startsAt,system,willSpend,planned,used';
    const body = rows.map((e) =>
      [
        e.id,
        `"${e.name.replace(/"/g, '""')}"`,
        e.status,
        e.startsAt,
        e.ownerSystemId,
        e.willSpend ? 'yes' : 'no',
        e.plannedCost,
        e.usedCost,
      ].join(','),
    );
    return [header, ...body].join('\n');
  },

  archiveCsv(): string {
    const rows = this.closeoutArchive();
    const header =
      'kind,id,name,status,closedAt,planned,used,people,impact_per_1k,work,money';
    const body = rows.map((r) =>
      [
        r.kind,
        r.id,
        `"${r.name.replace(/"/g, '""')}"`,
        r.status,
        r.closedAt,
        r.plannedCost,
        r.usedCost,
        r.participantsServed ?? '',
        r.impactPerFranc ?? '',
        `"${r.workSummary.replace(/"/g, '""')}"`,
        `"${r.moneySummary.replace(/"/g, '""')}"`,
      ].join(','),
    );
    return [header, ...body].join('\n');
  },
};

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
