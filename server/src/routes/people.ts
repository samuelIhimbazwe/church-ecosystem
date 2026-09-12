import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/http.js';

export const peopleRouter = Router();

peopleRouter.get('/', requireAuth, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const people = await prisma.person.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q } },
            { preferredName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { fullName: 'asc' },
    take: 100,
  });
  res.json({ people });
});

peopleRouter.get('/:id', requireAuth, async (req, res) => {
  const person = await prisma.person.findUnique({
    where: { id: req.params.id },
    include: {
      memberships: true,
      positions: true,
    },
  });
  if (!person) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }
  res.json({ person });
});

const createSchema = z.object({
  fullName: z.string().min(1),
  preferredName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'VISITOR']).optional(),
});

peopleRouter.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
    return;
  }
  const id = `p-${crypto.randomUUID().slice(0, 8)}`;
  const person = await prisma.person.create({
    data: {
      id,
      fullName: parsed.data.fullName,
      preferredName: parsed.data.preferredName,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      status: parsed.data.status ?? 'ACTIVE',
    },
  });
  await prisma.auditEvent.create({
    data: {
      actorId: req.auth!.personId,
      systemId: 'sys-main',
      action: 'CREATE',
      resource: 'PERSON',
      detail: person.id,
    },
  });
  res.status(201).json({ person });
});
