import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/http.js';

export const systemsRouter = Router();

systemsRouter.get('/', requireAuth, async (_req, res) => {
  const systems = await prisma.churchSystem.findMany({
    orderBy: { code: 'asc' },
  });
  res.json({
    systems,
    note: 'SHARED (Finance) is not a peer ministry — exclude from peer launcher by kind.',
  });
});

systemsRouter.get('/:id', requireAuth, async (req, res) => {
  const system = await prisma.churchSystem.findUnique({
    where: { id: req.params.id },
  });
  if (!system) {
    res.status(404).json({ error: 'System not found' });
    return;
  }
  res.json({ system });
});
