import { Router } from 'express';
import { z } from 'zod';
import { signAccessToken, verifyPassword } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/http.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  /** Optional peer system to enter after login (SSO path later). */
  systemId: z.string().optional(),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
    return;
  }
  const { username, password, systemId } = parsed.data;
  const account = await prisma.account.findUnique({
    where: { username },
    include: { person: true },
  });
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = signAccessToken({
    sub: account.id,
    personId: account.personId,
    username: account.username,
  });

  await prisma.auditEvent.create({
    data: {
      actorId: account.personId,
      systemId: systemId ?? 'sys-main',
      action: 'LOGIN',
      resource: 'ACCOUNT',
      detail: `username=${account.username}`,
    },
  });

  res.json({
    token,
    account: {
      id: account.id,
      username: account.username,
      personId: account.personId,
    },
    person: {
      id: account.person.id,
      fullName: account.person.fullName,
      preferredName: account.person.preferredName,
      status: account.person.status,
    },
  });
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const account = await prisma.account.findUnique({
    where: { id: req.auth!.sub },
    include: {
      person: {
        include: {
          memberships: { where: { status: 'ACTIVE' } },
          positions: { where: { status: 'ACTIVE' } },
        },
      },
    },
  });
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json({
    account: {
      id: account.id,
      username: account.username,
      personId: account.personId,
    },
    person: account.person,
    memberships: account.person.memberships,
    positions: account.person.positions,
  });
});
