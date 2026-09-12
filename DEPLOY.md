# ADEPR Kacyiru — Deploy (Vercel + Render + Neon)

Local development stays on **SQLite** (`server/prisma/schema.prisma`).  
Production uses **PostgreSQL** (`server/prisma/schema.postgres.prisma`) on Neon.

After deploy you can keep working locally with `npm run dev` / `npm run dev:api` as before.

---

## Architecture

| Piece | Platform | Role |
|-------|----------|------|
| Web (Vite SPA) | **Vercel** | UI — most demos still use in-memory seed; API used when `VITE_API_URL` is set |
| API (Express) | **Render** | Auth, policy, mission/funds skeleton |
| DB | **Neon** | Postgres for the API |

Boss demo tip: leave `VITE_API_FALLBACK` unset (default on) so seed logins like `music` / `youth` still work even if the API only seeds `pastor` / `treasurer`.

---

## 1. Neon (database)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **connection string** (use the pooled URL if Neon shows one, often with `?sslmode=require`).
3. Keep it for Render `DATABASE_URL`.

Example shape:

```text
postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

---

## 2. Render (API)

### Option A — Blueprint

1. Push this repo to GitHub.
2. Render → **New** → **Blueprint** → select the repo.
3. **Blueprint path:** `render.yaml` (repo **root** — not `backend/render.yaml`).
4. Set env vars (Blueprint marks these as sync:false):
   - `DATABASE_URL` = Neon connection string
   - `CORS_ORIGIN` = your Vercel URL(s), e.g. `https://kacyiru.vercel.app`  
     (comma-separated if you have preview + production)
5. Deploy. Note the API URL, e.g. `https://kacyiru-api.onrender.com`.

### Option B — Manual Web Service

- **Root directory:** `server`
- **Build:** `npm install && npm run build:render`
- **Start:** `npm run start:render`
- **Health:** `/api/health`
- Env: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV=production`

`start:render` runs `db push` + seed (upsert-friendly) then starts the server.

Check: `GET https://YOUR-API.onrender.com/api/health`

---

## 3. Vercel (Web)

1. Import the same GitHub repo in [vercel.com](https://vercel.com).
2. Framework: Vite (or leave auto).
3. **Root:** repository root (not `server/`).
4. Build: `npm run build` · Output: `dist` (`vercel.json` already set).
5. Environment variables:

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://YOUR-API.onrender.com` (no trailing slash) |
| `VITE_API_FALLBACK` | leave empty / `true` for demo seed logins |

6. Deploy. Copy the Vercel URL.
7. Go back to Render and set `CORS_ORIGIN` to that Vercel URL, then **redeploy API**.

---

## 4. Smoke test

1. Open the Vercel link → login `pastor` / `pastor123` (API) or `music` / `music123` (seed fallback).
2. Open Music → Schedule and click through calendar / generate.
3. API login:  
   `POST https://YOUR-API.onrender.com/api/auth/login`  
   `{"username":"pastor","password":"pastor123"}`

---

## Local vs production (do not mix)

| | Local | Production |
|--|--------|------------|
| DB | SQLite `file:./dev.db` | Neon Postgres |
| Schema file | `prisma/schema.prisma` | `prisma/schema.postgres.prisma` |
| SPA API | `.env.local` → `http://localhost:4000` | Vercel env → Render URL |
| Commands | `npm run setup` in `server/` | Render `build:render` / `start:render` |

After deploying, continue local work:

```bash
# root
npm run dev

# other terminal
npm run dev:api
```

Do **not** point local `.env` at Neon unless you intend to. Keep `DATABASE_URL="file:./dev.db"` in `server/.env`.

---

## Env cheat sheet

**Render**

```env
DATABASE_URL=postgresql://...@.../neondb?sslmode=require
JWT_SECRET=<long random>
CORS_ORIGIN=https://your-app.vercel.app
NODE_ENV=production
```

**Vercel**

```env
VITE_API_URL=https://kacyiru-api.onrender.com
# VITE_API_FALLBACK=true
```

**Local server** (`server/.env`) — unchanged

```env
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-only-change-me-in-production"
CORS_ORIGIN="http://localhost:5173"
```
