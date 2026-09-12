# ADEPR Kacyiru API (skeleton)

Express + Prisma + SQLite backend for the church systems ecosystem.

## What this skeleton covers

| Area | Status |
|------|--------|
| Health | `GET /api/health` |
| Auth (bcrypt + JWT) | `POST /api/auth/login`, `GET /api/auth/me` |
| Systems catalog | `GET /api/systems` |
| People | `GET/POST /api/people` |
| **Policy engine** | `POST /api/authorize/probe`, `GET /api/authorize/grants` — DB-backed |
| Funds / vaults | `GET /api/funds`, `GET /api/funds/:id` |
| **Mission kit** | `GET/POST /api/mission/programs|events|tasks|projects` |
| **Contributions** | `GET/POST /api/contributions`, `POST /api/contributions/:id/verify` → `FinanceTxn` |
| **Assignments** | `GET/POST /api/assignments` — loaded into policy for temporary ENTER |
| SSO handoff | `POST /api/sso/issue`, `POST /api/sso/redeem` |
| Assignments in policy | Seeded + loaded from DB |

### Policy engine

Source: `server/src/policy/` (ported from SPA `authorize.ts`, `choirAccess` grants, `financeAccess`).

```bash
npm run test:policy
```

Expect: pastor ENTER any system via governance; pastor **denied** General Fund; treasurer **MANAGE** General Fund.

## Setup

```bash
cd server
npm install
cp .env.example .env   # if needed
npm run setup          # prisma generate + db push + seed
npm run dev
```

API: http://localhost:4000

### Seed logins (hashed in DB)

| Username | Password | Role |
|----------|----------|------|
| `pastor` | `pastor123` | CHURCH_LEADER (all-systems ENTER) |
| `treasurer` | `treas123` | CHURCH_TREASURER + General Fund MANAGE |

## Quick try

```bash
# Login
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"treasurer\",\"password\":\"treas123\"}"

# Use token
curl -s http://localhost:4000/api/funds -H "Authorization: Bearer <token>"

# Pastor cannot open General Fund without a grant
curl -s -X POST http://localhost:4000/api/authorize/probe \
  -H "Authorization: Bearer <pastor-token>" \
  -H "Content-Type: application/json" \
  -d "{\"systemId\":\"sys-finance\",\"resource\":\"FINANCE\",\"action\":\"VIEW\",\"fundId\":\"fund-general\"}"
```

## Next backend milestones

1. ~~Port SPA authorize~~  
2. ~~Mission tables + routes~~  
3. ~~Ministry finance contribution claim → verify → `FinanceTxn`~~ (all kit funds)  
4. ~~Wire SPA mission UI to `/api/mission/*`~~ (seed fallback)  
5. ~~Persist assignments into policy context~~  
6. Swap SQLite → Postgres for staging/production
7. ~~Choir / Worship / Deacon / Protocol vaults~~ (7 choir + 3 special; claims accept `fundId`)

### Contribution claim flow

Claims resolve by `fundId` when passed, else the single MINISTRY vault for that system. Choir has 7 vaults — always pass `fundId` (e.g. `fund-choir-ijwi`). Treasurer has demo **MANAGE** on each.

```bash
# Worship (single vault)
curl -s -X POST http://localhost:4000/api/contributions \
  -H "Authorization: Bearer <pastor-token>" \
  -H "Content-Type: application/json" \
  -d "{\"systemId\":\"sys-worship\",\"typeLabel\":\"Tithe\",\"amount\":4000,\"paymentMethod\":\"MOMO\",\"occurredOn\":\"2026-09-10\"}"

# Choir (must pass fundId)
curl -s -X POST http://localhost:4000/api/contributions \
  -H "Authorization: Bearer <pastor-token>" \
  -H "Content-Type: application/json" \
  -d "{\"systemId\":\"sys-choir\",\"fundId\":\"fund-choir-ijwi\",\"typeLabel\":\"Monthly\",\"amount\":5000,\"paymentMethod\":\"MOMO\",\"occurredOn\":\"2026-09-10\"}"
```
