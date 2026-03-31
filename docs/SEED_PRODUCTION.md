# Seeding the database (staging / production)

The UAT roster is defined in `backend/prisma/seed.ts` (school **`SUN001`**, teachers, students, etc.).  
After **`npx prisma migrate deploy`** has been applied, run the seed **once** (or whenever you intentionally reset demo data).

Account reference: [QA_TEST_ACCOUNTS.md](./QA_TEST_ACCOUNTS.md).

## Why `railway run` from your laptop often fails

Railway often sets `DATABASE_URL` to a **private** host (e.g. `*.railway.internal`). That URL only works **inside** Railway’s network (running container), not from your home machine.

## Option A — One-shot seed on backend boot (recommended for first deploy)

Applies when the backend process is started with **`backend/start.js`** (Dockerfile `CMD` in this repo).

1. In Railway → **backend** service (Express API, not the Next.js frontend) → **Variables**.
2. Set **`RUN_DB_SEED_ON_START`** = `true`.
3. **Redeploy** the backend service and watch deploy logs for `Running prisma db seed...` and seed completion.
4. Set **`RUN_DB_SEED_ON_START`** back to `false` (or delete it) and redeploy so you do not re-run seed on every restart unnecessarily.  
   (Seed uses `upsert`, so repeating seed is usually safe but wasteful.)

**Requirements:** `DATABASE_URL` must be valid for that service. If production validation requires **`AGENT_SECRET`**, set it before deploy or seed may fail after app changes.

## Option B — Railway shell / SSH on the **backend** service

1. Open Railway → project → select the **Express backend** service (image should contain `prisma/`, `dist/`, **not** `.next/`).
2. Use **Shell** (or `railway ssh` with that service linked — see Option C).

Inside the container:

```sh
cd /app
./node_modules/.bin/prisma generate
./node_modules/.bin/prisma db seed
```

If `prisma db seed` fails with `ts-node ENOENT`, use the local binary (same as `npm run prisma:seed`):

```sh
./node_modules/.bin/ts-node prisma/seed.ts
```

If `prisma` is not under `/app`, run `pwd` and `ls` first; root directory depends on the image.

## Option C — Railway CLI: link the correct service

From `backend/`:

```bash
railway service link
```

Choose the service that actually runs **Express** (backend API). Then:

```bash
railway ssh -- sh -lc "cd /app && ./node_modules/.bin/prisma generate && ./node_modules/.bin/prisma db seed"
```

If SSH opens a **Next.js** app (you see `.next/`, `server.js`), you linked the **frontend** — link again and pick the API service.

## Local development

1. Start Postgres (e.g. `docker compose up db -d` from repo root).
2. Point `backend/.env` `DATABASE_URL` at that instance.
3. `cd backend && npx prisma migrate deploy && npx prisma generate && npx prisma db seed`

## After seeding

Smoke-check logins with school code **`SUN001`** and PINs from [QA_TEST_ACCOUNTS.md](./QA_TEST_ACCOUNTS.md).
