import {
  mergeStewardship,
  parseStewardship,
  serializeStewardship,
  type StewardshipBlob,
} from './stewardshipJson.js';
import { prisma } from '../lib/prisma.js';

/** Idempotent: same donationId does not double-count. */
export async function applyDesignatedGiftToStewardship(input: {
  kind: 'PROGRAM' | 'PROJECT';
  id: string;
  amount: number;
  label: string;
  fundId: string;
  donationId: string;
  personId: string;
  note?: string;
}) {
  const row =
    input.kind === 'PROGRAM'
      ? await prisma.program.findUnique({ where: { id: input.id } })
      : await prisma.churchProject.findUnique({ where: { id: input.id } });
  if (!row) return { ok: false as const, status: 404, error: 'Not found' };

  const s = parseStewardship(row.stewardshipJson);
  const plan = [...(s.fundingPlan ?? [])];
  if (plan.some((f) => f.donationId === input.donationId)) {
    return { ok: true as const, duplicate: true, entity: row, stewardship: s };
  }
  plan.push({
    id: `fs-${input.donationId}`,
    sourceType: 'DESIGNATED_GIFT',
    label: input.label,
    amount: Math.max(0, Math.round(input.amount)),
    status: 'CONFIRMED',
    fundId: input.fundId,
    donationId: input.donationId,
    note: input.note,
    confirmedAt: new Date().toISOString(),
    confirmedByPersonId: input.personId,
  });
  const next = mergeStewardship(s, { fundingPlan: plan });
  const entity =
    input.kind === 'PROGRAM'
      ? await prisma.program.update({
          where: { id: input.id },
          data: {
            stewardshipJson: serializeStewardship(next),
            stewardshipVersion: { increment: 1 },
          },
        })
      : await prisma.churchProject.update({
          where: { id: input.id },
          data: {
            stewardshipJson: serializeStewardship(next),
            stewardshipVersion: { increment: 1 },
          },
        });
  return { ok: true as const, entity, stewardship: next };
}

export async function incrementUsedCost(input: {
  kind: 'PROGRAM' | 'PROJECT';
  id: string;
  amount: number;
  expenseId?: string;
}) {
  const row =
    input.kind === 'PROGRAM'
      ? await prisma.program.findUnique({ where: { id: input.id } })
      : await prisma.churchProject.findUnique({ where: { id: input.id } });
  if (!row) return { ok: false as const, status: 404, error: 'Not found' };

  const s = parseStewardship(row.stewardshipJson) as StewardshipBlob & {
    appliedExpenseIds?: string[];
  };
  const applied = new Set(s.appliedExpenseIds ?? []);
  if (input.expenseId && applied.has(input.expenseId)) {
    return { ok: true as const, duplicate: true, entity: row, stewardship: s };
  }
  if (input.expenseId) applied.add(input.expenseId);
  const used =
    (Number(s.usedCost) || 0) + Math.max(0, Math.round(input.amount));
  const next = mergeStewardship(s, {
    usedCost: used,
    ...(input.expenseId
      ? { appliedExpenseIds: [...applied] }
      : {}),
  } as Partial<StewardshipBlob>);
  const entity =
    input.kind === 'PROGRAM'
      ? await prisma.program.update({
          where: { id: input.id },
          data: {
            stewardshipJson: serializeStewardship(next),
            stewardshipVersion: { increment: 1 },
          },
        })
      : await prisma.churchProject.update({
          where: { id: input.id },
          data: {
            stewardshipJson: serializeStewardship(next),
            stewardshipVersion: { increment: 1 },
          },
        });
  return { ok: true as const, entity, stewardship: next };
}

/**
 * Close a program activity session; mark linked REQUIRED delivery DONE.
 */
export async function closeActivitySession(
  activityId: string,
  opts?: { completeLinkedDelivery?: boolean },
) {
  const activity = await prisma.programActivity.findUnique({
    where: { id: activityId },
  });
  if (!activity) {
    return { ok: false as const, status: 404, error: 'Activity not found' };
  }
  if (activity.sessionClosedAt) {
    return {
      ok: true as const,
      activity,
      alreadyClosed: true,
      deliveryCompleted: false,
    };
  }
  const closed = await prisma.programActivity.update({
    where: { id: activityId },
    data: { sessionClosedAt: new Date() },
  });

  let deliveryCompleted = false;
  if (opts?.completeLinkedDelivery !== false) {
    const program = await prisma.program.findUnique({
      where: { id: activity.programId },
    });
    if (program) {
      const s = parseStewardship(program.stewardshipJson);
      const items = [...(s.deliveryItems ?? [])];
      let changed = false;
      for (const d of items) {
        if (
          d.activityId === activityId &&
          d.tier === 'REQUIRED' &&
          d.status === 'TODO'
        ) {
          d.status = 'DONE';
          changed = true;
          deliveryCompleted = true;
        }
      }
      if (changed) {
        const next = mergeStewardship(s, { deliveryItems: items });
        await prisma.program.update({
          where: { id: program.id },
          data: {
            stewardshipJson: serializeStewardship(next),
            stewardshipVersion: { increment: 1 },
          },
        });
      }
    }
  }

  return {
    ok: true as const,
    activity: closed,
    alreadyClosed: false,
    deliveryCompleted,
  };
}
