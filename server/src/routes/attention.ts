import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../middleware/http.js';
import { buildAttentionFeed } from '../attention/buildFeed.js';

export const attentionRouter = Router();

attentionRouter.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const items = await buildAttentionFeed(req.auth!.personId);
  res.json({
    items,
    generatedAt: new Date().toISOString(),
  });
});
