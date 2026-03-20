# 🚂 Railway Deployment Guide

All three services — **Frontend**, **Backend**, and **Database** — deploy on Railway.

## Architecture on Railway

```
Railway Project: kinderspark-pro
├── Service: kinderspark-backend   (Express API)  → PORT 4000
├── Service: kinderspark-frontend  (Next.js app)  → PORT 3000
└── Plugin:  PostgreSQL            (managed DB)   → internal URL
```

## Step-by-Step Setup

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app) → New Project
2. Name it `kinderspark-pro`

### 2. Add PostgreSQL Database

1. In your project → **+ New** → **Database** → **PostgreSQL**
2. Railway provisions it automatically
3. Copy the `DATABASE_URL` from the plugin's **Variables** tab

### 3. Deploy Backend

1. **+ New** → **GitHub Repo** → select `kinderspark-pro`
2. Set **Root Directory** to `backend`
3. Railway auto-detects Node.js via `nixpacks.toml`
4. Add these **Environment Variables**:

```env
DATABASE_URL=<from PostgreSQL plugin>
PORT=4000
NODE_ENV=production
ANTHROPIC_API_KEY=sk-ant-api03-...
FRONTEND_URL=https://kinderspark-frontend.up.railway.app
JWT_SECRET=your-super-secret-jwt-key-here
```

5. Railway runs: `npx prisma migrate deploy && node dist/app.js`

### 4. Deploy Frontend

1. **+ New** → **GitHub Repo** → select `kinderspark-pro` (same repo)
2. Set **Root Directory** to `frontend`
3. Add these **Environment Variables**:

```env
NEXT_PUBLIC_API_URL=https://kinderspark-backend.up.railway.app/api
PORT=3000
NODE_ENV=production
```

4. Railway runs: `npm start`

### 5. Seed the Database (first deploy only)

In Railway dashboard → Backend service → **Shell**:
```bash
npx ts-node prisma/seed.ts
```

Or from local with Railway CLI:
```bash
railway run --service kinderspark-backend npx ts-node prisma/seed.ts
```

## Environment Variables Reference

### Backend Service
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Auto-provided by Railway PostgreSQL plugin |
| `PORT` | `4000` |
| `NODE_ENV` | `production` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `FRONTEND_URL` | Your Railway frontend URL |
| `JWT_SECRET` | Random secret string (min 32 chars) |

### Frontend Service
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.up.railway.app/api` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |

## Automatic Deploys

Push to `main` branch → GitHub Actions triggers Railway deploy automatically.

Set `RAILWAY_TOKEN` in your GitHub repo → Settings → Secrets.

## Health Checks

- Backend: `GET /health` → `{ status: "ok", version: "1.0.0" }`
- Frontend: `GET /` → HTML response

Railway uses these for zero-downtime deploys.

## Custom Domains

In Railway → your service → **Settings** → **Domains** → Add custom domain.

Example:
- `api.kinderspark.com` → backend service
- `app.kinderspark.com` → frontend service

## Local Dev (Docker)

```bash
# Start everything locally
docker-compose up

# Services:
# Frontend  → http://localhost:3000
# Backend   → http://localhost:4000
# pgAdmin   → http://localhost:5050
# PostgreSQL → localhost:5432
```
