# ADEPR Kacyiru — Church Systems Ecosystem

Prototype SPA for **ADEPR Kacyiru**: Main Church hub + peer ministry systems + shared Finance ledger.

## Architecture (current)

| Kind | Systems | Role |
|------|---------|------|
| **MAIN** | `sys-main` (`/`) | People, organisation, participation, mission, peer launcher |
| **PEER** | Choir, Worship, Youth, Deacon, Protocol, Music, Media, Men, Women, Couples, Children, Elderly, Evangelism, Intercessors | Full peer apps (SSO or direct login) |
| **SHARED** | `sys-finance` | Shared ledger + org-private vaults — **not** a ministry peer |

**Finance rule:** Ministry money UX lives *inside* each ministry. Confirmed amounts post into private vaults. Pastor / church leaders cannot open ministry vaults without an explicit `FundAccessGrant`.

**Choir rule:** One system (`sys-choir`), seven named choir org units; access requires membership/position on a named choir (ENTER alone does not unlock all choirs).

**Member rule:** Regular members see a limited module allow-list; finance suites and leadership ops are board/treasurer (Choir uses its own office matrix).

## Deploy (boss demo)

See **[DEPLOY.md](./DEPLOY.md)** for Neon (Postgres) + Render (API) + Vercel (Web).

Local work stays on SQLite; production uses `server/prisma/schema.postgres.prisma`.

## Run (prototype SPA)

```bash
npm install
npm run dev
npm test
npm run build
```

Demo logins are listed on `/login` (prototype only — plaintext passwords).

## Run (API skeleton)

```bash
cd server
npm install
npm run setup    # generate client, push schema, seed
npm run dev      # http://localhost:4000
```

From repo root: `npm run api:setup` then `npm run dev:api`.

### Wire SPA to API (optional)

```bash
# .env.local (see .env.example)
VITE_API_URL=http://localhost:4000
```

Then `npm run dev` (SPA) with the API running. Login tries the API first (`pastor` / `treasurer` with hashed passwords). Other demo users fall back to in-memory seed unless `VITE_API_FALLBACK=false`.

Domain data (people, mission, choir, …) is still in-memory until those routes are ported.

See [server/README.md](server/README.md) for endpoints and seed users (`pastor` / `treasurer` with **hashed** passwords).

## Production readiness roadmap

### Done in this prototype hardening pass
- [x] Member vs board module gating (nav + route guards)
- [x] Multi-choir: no “all choirs” fallback from bare ENTER
- [x] Finance nav: treasury modules only for General Fund access
- [x] Peer program/event/task detail stays under `/systems/{slug}/…`
- [x] Deferred Youth groups/meetings routes removed
- [x] Pres/VP ministry finance = VIEW; treasurer = MANAGE
- [x] Critical domain tests (`npm test`)
- [x] **Backend skeleton** (`server/`: Express + Prisma + SQLite, JWT auth, funds ACL, SSO issue/redeem)
- [x] **SPA API auth bridge** (`VITE_API_URL` + seed fallback)
- [x] **Server policy engine** (`server/src/policy` — probe + grants from DB)
- [x] **SPA uses server grants** when API auth (`GET /api/authorize/grants` → `can()` / `authorize()`)
- [x] **Mission API** (programs / events / tasks / projects)
- [x] **SPA mission lists** prefer API with seed fallback
- [x] **Contribution claim → verify → FinanceTxn** (all finance-kit ministry funds + SPA hybrid)
- [x] **Assignments persisted** (DB → policy ENTER grants)
- [x] **Choir / Worship / Deacon / Protocol vaults** on server + claim/verify hybrid

### Still required before a real ecosystem
1. ~~Wire SPA to API (`VITE_API_URL`)~~ — auth + grants + mission lists + kit + special claims  
2. ~~Port full authorize / choir / ministry policy engine to the server~~  
3. ~~Mission + ministry domain tables and routes~~  
4. ~~Wire SPA mission/finance pages to API~~  
5. **Real auth hardening** — rotate JWT secrets; optional IdP  
6. **Real multi-origin SSO** when peers split deploys  
7. Multi-choir data maturity (roster/membership on server)  
8. ~~Unify finance kits~~ (kit + special + 7 choir vaults seeded)  
9. File storage for person documents  
10. Postgres for staging/production (swap Prisma datasource)

## Key paths

- Systems catalog: `src/data/seed.ts` (`SYSTEMS`)  
- Peer kit: `src/ministry/peerCoreSystems.ts`  
- Fund ACL: `src/domain/financeAccess.ts`  
- SSO handoff: `src/domain/sso.ts` (`/sso/handoff`)
"# church-ecosystem" 
