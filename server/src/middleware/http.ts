import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type JwtPayload } from '../lib/auth.js';

export type AuthedRequest = Request & { auth?: JwtPayload };

/** Express 5 types params as string | string[]; Prisma needs a single string. */
export function pathParam(
  req: Request,
  name: string,
): string | undefined {
  const raw = req.params[name];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
  return undefined;
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer token' });
    return;
  }
  try {
    req.auth = verifyAccessToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Server error';
  res.status(500).json({ error: message });
}
