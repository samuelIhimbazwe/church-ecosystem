import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtExpiresIn: '12h' as const,
};
