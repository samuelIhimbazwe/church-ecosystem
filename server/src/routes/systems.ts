import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { pathParam, requireAuth } from '../middleware/http.js';

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
  const id = pathParam(req, 'id');
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }
  const system = await prisma.churchSystem.findUnique({
    where: { id },
  });
  if (!system) {
    res.status(404).json({ error: 'System not found' });
    return;
  }
  res.json({ system });
});
