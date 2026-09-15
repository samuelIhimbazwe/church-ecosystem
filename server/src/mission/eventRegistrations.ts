import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/prisma.js';

const OFFER_MS = 48 * 3600 * 1000;

type OfferRow = { promotedAt: string; offerExpiresAt: string };

const __dirname = dirname(fileURLToPath(import.meta.url));
const OFFER_FILE = join(__dirname, '../../data/event-offers.json');

function loadOffers(): Map<string, OfferRow> {
  try {
    if (!existsSync(OFFER_FILE)) return new Map();
    const raw = JSON.parse(readFileSync(OFFER_FILE, 'utf8')) as Record<
      string,
      OfferRow
    >;
    return new Map(Object.entries(raw));
  } catch {
    return new Map();
  }
}

function saveOffers(map: Map<string, OfferRow>) {
  const dir = dirname(OFFER_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const obj: Record<string, OfferRow> = {};
  for (const [k, v] of map) obj[k] = v;
  writeFileSync(OFFER_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

let offerByRegId = loadOffers();

export function mapRegistration(r: {
  id: string;
  eventId: string;
  personId: string;
  status: string;
  registeredOn: Date;
  attendedAt: Date | null;
}) {
  const offer = offerByRegId.get(r.id);
  return {
    id: r.id,
    eventId: r.eventId,
    personId: r.personId,
    status: r.status,
    registeredOn: r.registeredOn.toISOString().slice(0, 10),
    attendedAt: r.attendedAt?.toISOString(),
    promotedAt: offer?.promotedAt,
    offerExpiresAt: offer?.offerExpiresAt,
  };
}

export async function expireAndPromote(eventId: string) {
  const event = await prisma.churchEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    return {
      expired: 0,
      promoted: null as ReturnType<typeof mapRegistration> | null,
    };
  }

  offerByRegId = loadOffers();
  const now = Date.now();
  let expired = 0;
  const seated = await prisma.eventRegistration.findMany({
    where: { eventId, status: 'REGISTERED' },
  });
  for (const r of seated) {
    const offer = offerByRegId.get(r.id);
    if (offer && new Date(offer.offerExpiresAt).getTime() < now) {
      await prisma.eventRegistration.update({
        where: { id: r.id },
        data: { status: 'CANCELLED' },
      });
      offerByRegId.delete(r.id);
      expired += 1;
    }
  }
  if (expired) saveOffers(offerByRegId);

  const promoted = await promoteFromWaitlist(eventId, event.capacity);
  return { expired, promoted };
}

export async function promoteFromWaitlist(
  eventId: string,
  capacity: number | null | undefined,
) {
  if (capacity == null) return null;
  const seated = await prisma.eventRegistration.count({
    where: {
      eventId,
      status: { in: ['REGISTERED', 'ATTENDED'] },
    },
  });
  if (seated >= capacity) return null;

  const next = await prisma.eventRegistration.findFirst({
    where: { eventId, status: 'WAITLIST' },
    orderBy: [{ registeredOn: 'asc' }, { createdAt: 'asc' }],
  });
  if (!next) return null;

  const now = new Date();
  const updated = await prisma.eventRegistration.update({
    where: { id: next.id },
    data: { status: 'REGISTERED' },
  });
  offerByRegId.set(updated.id, {
    promotedAt: now.toISOString(),
    offerExpiresAt: new Date(now.getTime() + OFFER_MS).toISOString(),
  });
  saveOffers(offerByRegId);
  return mapRegistration(updated);
}

export async function cancelRegistration(eventId: string, personId: string) {
  await expireAndPromote(eventId);
  const reg = await prisma.eventRegistration.findUnique({
    where: { eventId_personId: { eventId, personId } },
  });
  if (!reg || reg.status === 'CANCELLED') {
    return { ok: false as const, status: 404, error: 'Registration not found' };
  }
  if (reg.status === 'ATTENDED') {
    return {
      ok: false as const,
      status: 400,
      error: 'Already attended — cannot cancel',
    };
  }
  const freedSeat = reg.status === 'REGISTERED';
  const updated = await prisma.eventRegistration.update({
    where: { id: reg.id },
    data: { status: 'CANCELLED' },
  });
  offerByRegId.delete(reg.id);
  saveOffers(offerByRegId);
  let promoted = null as ReturnType<typeof mapRegistration> | null;
  if (freedSeat) {
    const event = await prisma.churchEvent.findUnique({ where: { id: eventId } });
    promoted = await promoteFromWaitlist(eventId, event?.capacity);
  }
  return {
    ok: true as const,
    registration: mapRegistration(updated),
    promoted,
  };
}

export async function markRemainingNoShows(eventId: string) {
  const regs = await prisma.eventRegistration.findMany({
    where: { eventId, status: 'REGISTERED' },
  });
  for (const r of regs) offerByRegId.delete(r.id);
  if (regs.length) saveOffers(offerByRegId);
  await prisma.eventRegistration.updateMany({
    where: { eventId, status: 'REGISTERED' },
    data: { status: 'NO_SHOW', attendedAt: null },
  });
}
