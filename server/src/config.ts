import 'dotenv/config';

function parseCorsOrigin(raw: string | undefined): string | string[] | boolean {
  const value = (raw ?? 'http://localhost:5173').trim();
  if (value === '*') return true;
  if (value.includes(',')) {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
  /** Single origin, comma-separated list, or `*` */
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
  jwtExpiresIn: '12h' as const,
  isProd: process.env.NODE_ENV === 'production',
};
