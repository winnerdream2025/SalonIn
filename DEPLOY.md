# SalonIn — Railway Deployment Guide

## Architecture Overview

```
                        ┌─────────────────────────────────────┐
                        │         Railway Project              │
                        │                                      │
  Mobile (Expo/EAS) ───▶│  salonin-api   (NestJS, Docker)      │
                        │      │    │                          │
  Web Browser        ───▶│  salonin-web   (Next.js, Docker)     │
                        │      │                               │
                        │      ▼                               │
                        │  salonin-postgres  (PostGIS 15)      │
                        │  salonin-redis     (Redis 7)         │
                        └─────────────────────────────────────┘
                                      │
                        ┌─────────────┼──────────────┐
                        ▼             ▼              ▼
                     AWS S3         Stripe         Sentry
                  (media files)  (identity)     (monitoring)
```

### Services

| Service | Type | Scales |
|---|---|---|
| `salonin-api` | NestJS — Dockerfile | Horizontal (multiple replicas) |
| `salonin-web` | Next.js — Dockerfile | Horizontal (multiple replicas) |
| `salonin-postgres` | PostgreSQL 15 + PostGIS | Vertical (upgrade plan) |
| `salonin-redis` | Redis 7 | Vertical (upgrade plan) |

> **Scale tip**: For high traffic (10k+ users), move Postgres to [Neon.tech](https://neon.tech) (serverless PostgreSQL + PostGIS, connection pooling built-in) and Redis to [Upstash](https://upstash.com) (serverless Redis, pay-per-request).

---

## Step-by-Step Deployment

### Prerequisites
- Railway account at [railway.app](https://railway.app)
- Railway CLI: `npm install -g @railway/cli` then `railway login`
- GitHub repo connected to Railway (already pushed)

---

### Step 1 — Create Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Click **"Deploy from GitHub repo"** → select `winnerdream2025/SalonIn`
3. Name the project: `salonin`

---

### Step 2 — Add PostgreSQL with PostGIS

Railway's managed Postgres **does not** support PostGIS. Deploy a custom Docker image instead:

1. In your Railway project → **"New Service"** → **"Docker Image"**
2. Image: `postgis/postgis:15-3.4`
3. Name it: `salonin-postgres`
4. Set these environment variables on the service:

```
POSTGRES_DB=salonin
POSTGRES_USER=salonin
POSTGRES_PASSWORD=<generate: openssl rand -hex 32>
```

5. The internal hostname will be `salonin-postgres.railway.internal`
6. Railway exposes port `5432` internally

**Your `DATABASE_URL` for other services:**
```
postgresql://salonin:<PASSWORD>@salonin-postgres.railway.internal:5432/salonin?schema=public
```

---

### Step 3 — Add Redis

1. **"New Service"** → **"Database"** → **"Add Redis"**
2. Railway auto-provisions Redis and exposes `REDIS_URL` as a variable
3. Name it: `salonin-redis`
4. Copy the `REDIS_URL` — you'll use it in the API service

---

### Step 4 — Deploy the API

1. **"New Service"** → **"GitHub Repo"** → `winnerdream2025/SalonIn`
2. Name it: `salonin-api`
3. Railway will detect `apps/api/railway.json` and use the Dockerfile
4. Set **Root Directory** to `/` (repo root — Dockerfile needs monorepo context)
5. Set **Dockerfile Path** to `apps/api/Dockerfile`

**Add all environment variables** (see full list below):

```
NODE_ENV=production
DATABASE_URL=postgresql://salonin:<PASSWORD>@salonin-postgres.railway.internal:5432/salonin?schema=public
REDIS_URL=${{salonin-redis.REDIS_URL}}
JWT_SECRET=<generate: openssl rand -hex 64>
CORS_ORIGINS=https://<your-web-domain>.railway.app
AWS_REGION=us-east-1
AWS_S3_BUCKET=<your-bucket>
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENTRY_DSN=<api-sentry-dsn>
DD_SERVICE=salonin-api
DD_ENV=production
```

6. Under **"Settings"** → **"Networking"** → **"Generate Domain"** → copy the URL (e.g. `salonin-api.up.railway.app`)

**Run migrations after first deploy:**
```bash
railway run --service salonin-api pnpm exec prisma migrate deploy
```

---

### Step 5 — Deploy the Web App

1. **"New Service"** → **"GitHub Repo"** → `winnerdream2025/SalonIn`
2. Name it: `salonin-web`
3. Set **Root Directory** to `/`
4. Set **Dockerfile Path** to `apps/web/Dockerfile`

**Add environment variables:**

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://salonin-api.up.railway.app
NEXT_PUBLIC_SENTRY_DSN=<web-sentry-dsn>
SENTRY_DSN=<web-sentry-dsn>
SENTRY_ORG=<your-sentry-org>
SENTRY_PROJECT=salonin-web
SENTRY_AUTH_TOKEN=<token>
PORT=8080
```

5. Generate domain → e.g. `salonin-web.up.railway.app`

---

### Step 6 — Update CORS on API

Go back to `salonin-api` service and update:
```
CORS_ORIGINS=https://salonin-web.up.railway.app
```

---

### Step 7 — Update Mobile for Production

In `apps/mobile/.env` (or EAS secrets):
```
EXPO_PUBLIC_API_URL=https://salonin-api.up.railway.app
EXPO_PUBLIC_SENTRY_DSN=<mobile-sentry-dsn>
```

Rebuild and submit via EAS:
```bash
eas build --platform android --profile production
eas submit --platform android
```

---

## Complete Environment Variables Reference

### API Service (`salonin-api`)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | ✅ | `production` |
| `PORT` | auto | Railway sets this automatically |
| `DATABASE_URL` | ✅ | PostgreSQL connection string (with PostGIS) |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | Min 64 chars random string — `openssl rand -hex 64` |
| `CORS_ORIGINS` | ✅ | Comma-separated list of allowed origins |
| `AWS_REGION` | ✅ | e.g. `us-east-1` |
| `AWS_S3_BUCKET` | ✅ | S3 bucket name for media uploads |
| `AWS_ACCESS_KEY_ID` | ✅ | IAM user with S3 PutObject permission |
| `AWS_SECRET_ACCESS_KEY` | ✅ | IAM secret key |
| `STRIPE_SECRET_KEY` | ✅ | `sk_live_...` for identity verification |
| `STRIPE_WEBHOOK_SECRET` | ✅ | `whsec_...` from Stripe dashboard |
| `SENTRY_DSN` | optional | API error tracking |
| `DD_SERVICE` | optional | `salonin-api` |
| `DD_ENV` | optional | `production` |
| `DD_AGENT_HOST` | optional | Datadog agent host |

### Web Service (`salonin-web`)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `8080` |
| `NEXT_PUBLIC_API_URL` | ✅ | Full API URL e.g. `https://salonin-api.up.railway.app` |
| `NEXT_PUBLIC_SENTRY_DSN` | optional | Browser error tracking |
| `SENTRY_DSN` | optional | Server-side error tracking |
| `SENTRY_ORG` | optional | Sentry organization slug |
| `SENTRY_PROJECT` | optional | `salonin-web` |
| `SENTRY_AUTH_TOKEN` | optional | For sourcemap uploads on build |

### Mobile (EAS Secrets)

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | ✅ | Full API URL |
| `EXPO_PUBLIC_SENTRY_DSN` | optional | Mobile error tracking |
| `EAS_TOKEN` | ✅ (CI) | For automated builds in GitHub Actions |

---

## Scalability Architecture

### Current (Railway Starter — ~$20/mo)
```
salonin-api      1 replica   512 MB RAM   1 vCPU
salonin-web      1 replica   512 MB RAM   1 vCPU
salonin-postgres 1 instance  1 GB RAM     1 vCPU
salonin-redis    1 instance  256 MB RAM
```

### Growth (~1k DAU — Railway Pro ~$50-80/mo)
- Scale API to **2 replicas** (Railway UI → Settings → Replicas)
- Scale Web to **2 replicas**
- Upgrade Postgres to **2 GB RAM** plan
- Enable **Railway's auto-scaling** (CPU threshold 70%)

### Scale (10k+ DAU — Hybrid ~$200/mo)
```
┌─────────────────────────────────────────────────────┐
│ Cloudflare (WAF + CDN for web assets)                │
└──────────────────┬──────────────────────────────────┘
                   │
      ┌────────────▼────────────┐
      │  Railway: salonin-api    │  4 replicas, autoscale
      │  Railway: salonin-web    │  3 replicas
      └────────────┬────────────┘
                   │
      ┌────────────▼────────────┐
      │  Neon.tech              │  Serverless Postgres + PostGIS
      │  (replace Railway DB)   │  Connection pooling (PgBouncer built-in)
      └─────────────────────────┘
      ┌─────────────────────────┐
      │  Upstash Redis          │  Serverless, 0 idle cost
      │  (replace Railway Redis)│
      └─────────────────────────┘
      ┌─────────────────────────┐
      │  AWS S3 + CloudFront    │  Media CDN (already in stack)
      └─────────────────────────┘
```

---

## Useful Railway CLI Commands

```bash
# Link to project
railway link

# View logs for a service
railway logs --service salonin-api

# Run a one-off command (e.g. migrations)
railway run --service salonin-api pnpm exec prisma migrate deploy

# Open service shell
railway shell --service salonin-api

# Deploy manually
railway up --service salonin-api
```

---

## Stripe Webhook Setup

After deploying the API, register the webhook endpoint in Stripe Dashboard:

- **Endpoint URL**: `https://salonin-api.up.railway.app/verify/webhook`
- **Events to listen**: `identity.verification_session.verified`
- Copy the **Signing Secret** → set as `STRIPE_WEBHOOK_SECRET`

---

## AWS S3 Setup (Media Uploads)

1. Create S3 bucket in `us-east-1` (or your region)
2. Bucket policy — allow public read for portfolio/avatar images:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::<your-bucket>/avatars/*"
  }, {
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::<your-bucket>/portfolio/*"
  }]
}
```
3. Create IAM user with policy: `s3:PutObject` on `arn:aws:s3:::<your-bucket>/*`
4. Generate access keys → set in Railway API env vars
