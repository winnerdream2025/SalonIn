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
| `salonin-api` | NestJS — Dockerfile (`apps/api/Dockerfile`) | Horizontal (multiple replicas) |
| `salonin-web` | Next.js — Dockerfile (`apps/web/Dockerfile`) | Horizontal (multiple replicas) |
| `salonin-postgres` | PostgreSQL 15 + PostGIS 3.4 (Docker image) | Vertical (upgrade plan) |
| `salonin-redis` | Redis 7 (Railway managed) | Vertical (upgrade plan) |

> **Scale tip**: For high traffic (10k+ users), move Postgres to [Neon.tech](https://neon.tech) (serverless PostgreSQL + PostGIS, connection pooling built-in) and Redis to [Upstash](https://upstash.com) (serverless Redis, pay-per-request).

### Key Files

| File | Purpose |
|---|---|
| `apps/api/Dockerfile` | Multi-stage build: builder (pnpm install, prisma generate, nest webpack build) → runner (pnpm install --prod, copy Prisma client from builder's pnpm store, copy dist) |
| `apps/web/Dockerfile` | Multi-stage build: builder (pnpm install, prisma generate, next build) → runner (standalone output) |
| `apps/api/railway.json` | Railway service config: Dockerfile builder, healthcheck on `/health`, restart on failure (max 3) |
| `apps/web/railway.json` | Railway service config: Dockerfile builder, healthcheck on `/`, restart on failure (max 3) |
| `.github/workflows/ci.yml` | CI pipeline: type-check, unit tests, integration tests, web build, API Docker build, EAS mobile build |
| `.dockerignore` | Excludes `node_modules`, `.env`, `.git`, `dist`, `coverage`, `Windsurf/` from Docker context |
| `.env.example` | Template for all required environment variables (no secrets) |
| `docker-compose.yml` | Local dev: PostGIS 15 (port 5433) + Redis 7 (port 6380) |
| `prisma/schema.prisma` | Database schema — 10 models, 7 enums, PostGIS geography fields |

### Docker Build Details

**API Dockerfile** (`apps/api/Dockerfile`):
- **Builder stage**: node:20-alpine, installs openssl/python3/make/g++ (native deps), pnpm 9.4.0, copies monorepo packages (config/types/utils/api/prisma), runs `pnpm install`, `prisma generate`, exports generated Prisma client to `/app/prisma-client` (resolves pnpm virtual store path), then `nest build` (webpack bundles `@salonin/*` inline, externalizes other node_modules)
- **Runner stage**: node:20-alpine, installs openssl, pnpm 9.4.0, copies package.json manifests + prisma schema, runs `pnpm install --prod`, copies Prisma client from builder via `COPY --from=builder` then overlays it into runner's pnpm store, copies webpack bundle from builder
- **Important**: Build context must be the repo root `/` (not `apps/api/`) because the Dockerfile copies `packages/*` and `prisma/`

**Web Dockerfile** (`apps/web/Dockerfile`):
- **Builder stage**: node:20-alpine, pnpm 9.4.0, copies packages (config/types/utils/api-client/web/prisma), runs `pnpm install`, `prisma generate`, `next build`
- **Runner stage**: copies Next.js standalone output + static files, runs `node apps/web/server.js` on port 8080
- **Requires**: `output: 'standalone'` in `next.config.mjs` (already configured)

---

## CI Pipeline (already configured)

The CI pipeline at `.github/workflows/ci.yml` runs on every push/PR to `main` and `develop`:

| Job | What it does | Depends on |
|---|---|---|
| `quality` | `turbo type-check` on all workspaces | — |
| `test` | Unit tests + coverage artifact (14d) | — |
| `test-integration` | PostGIS 15 + Redis 7 services, `prisma db push` | — |
| `build-web` | `pnpm --filter @salonin/web build` | quality |
| `build-api-docker` | `docker/build-push-action@v5` (no push, GHA cache) | quality, test |
| `build-mobile` | `eas build --platform all` (main branch only, requires `EAS_TOKEN` secret) | quality |

**Before deploying**: Ensure CI passes on `main`. The `build-api-docker` job validates the exact same Dockerfile that Railway will use.

---

## Step-by-Step Deployment

### Prerequisites

1. **Railway account** at [railway.app](https://railway.app) (Hobby plan minimum — $5/mo)
2. **Railway CLI** installed and authenticated:
   ```bash
   npm install -g @railway/cli
   railway login
   ```
3. **GitHub repo** connected — `winnerdream2025/SalonIn` pushed to `main`
4. **AWS account** with S3 bucket created (see [AWS S3 Setup](#aws-s3-setup-media-uploads))
5. **Stripe account** with Identity enabled (see [Stripe Webhook Setup](#stripe-webhook-setup))
6. **Sentry projects** created (optional but recommended): one for API, one for Web, one for Mobile

---

### Step 1 — Create Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Click **"Deploy from GitHub repo"** → select `winnerdream2025/SalonIn`
3. Name the project: `salonin`
4. **Do not deploy yet** — cancel the initial auto-deploy. We need to set up databases first.

---

### Step 2 — Add PostgreSQL with PostGIS

Railway's managed Postgres **does not** support PostGIS. Deploy a custom Docker image instead:

1. In your Railway project → **"New Service"** → **"Docker Image"**
2. Image: `postgis/postgis:15-3.4`
3. Name it: `salonin-postgres`
4. Under **"Variables"**, add:

   ```
   POSTGRES_DB=salonin
   POSTGRES_USER=salonin
   POSTGRES_PASSWORD=<generate with: openssl rand -hex 32>
   ```

5. Under **"Settings"** → **"Networking"** → confirm internal port is `5432`
6. The internal hostname will be: `salonin-postgres.railway.internal`

**Construct your `DATABASE_URL`:**
```
postgresql://salonin:<PASSWORD>@salonin-postgres.railway.internal:5432/salonin?schema=public
```

> **Note**: PostGIS extension is automatically available in the `postgis/postgis:15-3.4` image. The `prisma migrate deploy` command (Step 4) will create the extension and all tables.

---

### Step 3 — Add Redis

1. In your Railway project → **"New Service"** → **"Database"** → **"Add Redis"**
2. Railway auto-provisions Redis 7 and creates a `REDIS_URL` variable
3. Rename the service to: `salonin-redis`
4. Note the `REDIS_URL` — you'll reference it via Railway variable interpolation: `${{salonin-redis.REDIS_URL}}`

---

### Step 4 — Deploy the API

1. In your Railway project → **"New Service"** → **"GitHub Repo"** → select `winnerdream2025/SalonIn`
2. Name it: `salonin-api`
3. Under **"Settings"**:
   - **Root Directory**: `/` (repo root — the Dockerfile needs full monorepo context)
   - **Dockerfile Path**: `apps/api/Dockerfile`
   - Railway should auto-detect `apps/api/railway.json` which configures the healthcheck on `/health`
4. Under **"Variables"**, add every variable below (one by one, or paste as raw):

   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://salonin:<PASSWORD>@salonin-postgres.railway.internal:5432/salonin?schema=public
   REDIS_URL=${{salonin-redis.REDIS_URL}}
   JWT_SECRET=<generate with: openssl rand -hex 64>
   CORS_ORIGINS=https://<your-web-domain>.railway.app
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=<your-bucket-name>
   AWS_ACCESS_KEY_ID=<your-iam-access-key>
   AWS_SECRET_ACCESS_KEY=<your-iam-secret-key>
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   SENTRY_DSN=<api-sentry-dsn>
   DD_SERVICE=salonin-api
   DD_ENV=production
   ```

5. Under **"Settings"** → **"Networking"** → **"Generate Domain"**
   - Copy the URL (e.g. `salonin-api-production.up.railway.app`)
6. **Deploy** the service (Railway will build using the Dockerfile)
7. **Wait for deploy to succeed** — check logs for `Nest application successfully started`

**Run migrations after first successful deploy:**
```bash
railway link                          # select your project
railway run --service salonin-api -- pnpm exec prisma migrate deploy
```

**Verify the API is healthy:**
```bash
curl https://salonin-api-production.up.railway.app/health
```
Expected response:
```json
{"status":"ok","db":true,"cache":true,"timestamp":"2026-..."}
```

---

### Step 5 — Deploy the Web App

1. In your Railway project → **"New Service"** → **"GitHub Repo"** → select `winnerdream2025/SalonIn`
2. Name it: `salonin-web`
3. Under **"Settings"**:
   - **Root Directory**: `/`
   - **Dockerfile Path**: `apps/web/Dockerfile`
   - Railway should auto-detect `apps/web/railway.json`
4. Under **"Variables"**, add:

   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://salonin-api-production.up.railway.app
   NEXT_PUBLIC_SENTRY_DSN=<web-sentry-dsn>
   SENTRY_DSN=<web-sentry-dsn>
   SENTRY_ORG=<your-sentry-org>
   SENTRY_PROJECT=salonin-web
   SENTRY_AUTH_TOKEN=<your-sentry-auth-token>
   PORT=8080
   ```

5. Under **"Settings"** → **"Networking"** → **"Generate Domain"**
   - Copy the URL (e.g. `salonin-web-production.up.railway.app`)
6. **Deploy** and verify the web app loads in your browser

---

### Step 6 — Update CORS on API

Go back to `salonin-api` service variables and update:
```
CORS_ORIGINS=https://salonin-web-production.up.railway.app
```

If you also need to allow a custom domain later, comma-separate:
```
CORS_ORIGINS=https://salonin-web-production.up.railway.app,https://app.yourdomain.com
```

Railway will auto-redeploy the API with the new variable.

---

### Step 7 — Update Mobile for Production

#### Option A — EAS Secrets (recommended for CI)

```bash
cd apps/mobile
eas secret:create --name EXPO_PUBLIC_API_URL --value https://salonin-api-production.up.railway.app
eas secret:create --name EXPO_PUBLIC_SENTRY_DSN --value <mobile-sentry-dsn>
```

#### Option B — `.env` file (for local builds)

Create `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://salonin-api-production.up.railway.app
EXPO_PUBLIC_SENTRY_DSN=<mobile-sentry-dsn>
```

#### Build and submit:

```bash
# Android
eas build --platform android --profile production
eas submit --platform android

# iOS
eas build --platform ios --profile production
eas submit --platform ios
```

#### GitHub Actions automated builds (main branch)

Add the `EAS_TOKEN` secret in your GitHub repo settings:
1. Go to repo **Settings** → **Secrets and variables** → **Actions**
2. Add secret: `EAS_TOKEN` = your Expo access token (from expo.dev account settings)
3. Pushes to `main` will auto-trigger `build-mobile` job in CI

---

### Step 8 — Custom Domain (optional)

1. In Railway, select your service → **"Settings"** → **"Networking"** → **"Custom Domain"**
2. Add your domain (e.g. `api.salonin.com` or `app.salonin.com`)
3. Railway provides a CNAME target — add this DNS record at your domain registrar:
   ```
   Type: CNAME
   Name: api (or app)
   Value: <railway-provided-cname>.up.railway.app
   ```
4. Railway auto-provisions SSL (Let's Encrypt)
5. **Update `CORS_ORIGINS`** on the API to include the new custom domain
6. **Update `NEXT_PUBLIC_API_URL`** on the web service if you added a custom API domain
7. **Update `EXPO_PUBLIC_API_URL`** in EAS secrets and rebuild mobile

---

## Complete Environment Variables Reference

### API Service (`salonin-api`)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | ✅ | `production` |
| `PORT` | auto | Railway injects this automatically |
| `DATABASE_URL` | ✅ | PostgreSQL + PostGIS connection string |
| `REDIS_URL` | ✅ | Redis connection string (use Railway variable reference) |
| `JWT_SECRET` | ✅ | Min 64 chars random hex — `openssl rand -hex 64` |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins (no trailing slash) |
| `AWS_REGION` | ✅ | e.g. `us-east-1` |
| `AWS_S3_BUCKET` | ✅ | S3 bucket name for media uploads |
| `AWS_ACCESS_KEY_ID` | ✅ | IAM user with `s3:PutObject` permission |
| `AWS_SECRET_ACCESS_KEY` | ✅ | IAM secret key |
| `STRIPE_SECRET_KEY` | ✅ | `sk_live_...` for identity verification |
| `STRIPE_WEBHOOK_SECRET` | ✅ | `whsec_...` from Stripe Dashboard |
| `SENTRY_DSN` | optional | API error tracking DSN |
| `DD_SERVICE` | optional | `salonin-api` — Datadog APM service name |
| `DD_ENV` | optional | `production` — Datadog environment tag |
| `DD_AGENT_HOST` | optional | Datadog agent host (only if running DD agent) |

### Web Service (`salonin-web`)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `8080` (matches Dockerfile EXPOSE) |
| `NEXT_PUBLIC_API_URL` | ✅ | Full API URL, e.g. `https://salonin-api-production.up.railway.app` |
| `NEXT_PUBLIC_SENTRY_DSN` | optional | Browser-side error tracking |
| `SENTRY_DSN` | optional | Server-side error tracking |
| `SENTRY_ORG` | optional | Sentry organization slug |
| `SENTRY_PROJECT` | optional | `salonin-web` |
| `SENTRY_AUTH_TOKEN` | optional | For sourcemap uploads during build |

### Mobile (EAS Secrets)

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | ✅ | Full API URL (inlined at build time by Metro) |
| `EXPO_PUBLIC_SENTRY_DSN` | optional | Mobile error tracking |
| `EAS_TOKEN` | ✅ (CI) | For automated GitHub Actions builds (repo secret) |

### GitHub Actions Secrets

| Secret | Required for | Description |
|---|---|---|
| `EAS_TOKEN` | `build-mobile` job | Expo access token for automated builds |
| `SENTRY_AUTH_TOKEN` | `build-web` job | Sentry auth token for sourcemap uploads |
| `SENTRY_ORG` | `build-web` job | Sentry organization slug |
| `SENTRY_PROJECT` | `build-web` job | `salonin-web` |

---

## Post-Deploy Verification Checklist

After all services are deployed, verify each component:

```
□ API health check returns 200
  curl https://<api-domain>/health
  → {"status":"ok","db":true,"cache":true,"timestamp":"..."}

□ Prisma migrations applied
  railway run --service salonin-api -- pnpm exec prisma migrate status
  → "Database schema is up to date"

□ Auth endpoints work
  curl -X POST https://<api-domain>/auth/register \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@test.com","password":"Test1234!","name":"Test","role":"WORKER","cityId":"dmv"}'
  → 201 with JWT tokens

□ Web app loads
  Open https://<web-domain> in browser → login page renders

□ Mobile app connects
  Update EXPO_PUBLIC_API_URL → rebuild → login works

□ Stripe webhook configured
  Stripe Dashboard → Webhooks → endpoint verified with test event

□ S3 uploads work
  Upload an avatar through the app → image appears in S3 bucket

□ Redis cache active
  Hit GET /workers/nearby twice → second request served from cache (check API logs)

□ Sentry receives events
  Trigger a test error → appears in Sentry dashboard

□ CI pipeline green
  Push a trivial change to main → all 6 jobs pass
```

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
# Link CLI to your Railway project
railway link

# View real-time logs for a service
railway logs --service salonin-api

# Run a one-off command (e.g. migrations)
railway run --service salonin-api -- pnpm exec prisma migrate deploy

# Open an interactive shell in the running container
railway shell --service salonin-api

# Trigger a manual deploy
railway up --service salonin-api

# Check service status
railway status

# View environment variables
railway variables --service salonin-api
```

---

## Stripe Webhook Setup

After deploying the API, register the webhook endpoint in [Stripe Dashboard](https://dashboard.stripe.com/webhooks):

1. Click **"Add endpoint"**
2. **Endpoint URL**: `https://<api-domain>/verify/webhook`
3. **Events to listen**: select `identity.verification_session.verified`
4. Click **"Add endpoint"** to save
5. Copy the **Signing Secret** (starts with `whsec_`)
6. Set it as `STRIPE_WEBHOOK_SECRET` in Railway API variables
7. **Test**: Click "Send test webhook" in Stripe → check API logs for successful processing

---

## AWS S3 Setup (Media Uploads)

### 1. Create S3 Bucket

```bash
aws s3 mb s3://salonin-media --region us-east-1
```

### 2. Set Bucket Policy (public read for avatars and portfolio)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadAvatars",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::salonin-media/avatars/*"
    },
    {
      "Sid": "PublicReadPortfolio",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::salonin-media/portfolio/*"
    }
  ]
}
```

### 3. Create IAM User for API

1. IAM → Users → **Create user** → name: `salonin-api-s3`
2. Attach inline policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": "s3:PutObject",
       "Resource": "arn:aws:s3:::salonin-media/*"
     }]
   }
   ```
3. **Create access key** → select "Application running outside AWS"
4. Copy `Access Key ID` + `Secret Access Key` → set in Railway API variables:
   ```
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=salonin-media
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   ```

---

## Rollback Plan

### Quick rollback (Railway)
Railway keeps previous deployments. To rollback:
1. Go to your service in Railway Dashboard
2. Click **"Deployments"** tab
3. Find the last working deployment → click **"Redeploy"**

### Database rollback
If a Prisma migration caused issues:
```bash
railway run --service salonin-api -- pnpm exec prisma migrate resolve --rolled-back <migration_name>
```
Then fix the migration SQL and redeploy.

### Full incident response
1. **Rollback API** to last known good deployment via Railway UI
2. **Check health**: `curl https://<api-domain>/health`
3. **Check logs**: `railway logs --service salonin-api`
4. **Check Sentry** for error spike details
5. **Fix and redeploy** from a hotfix branch, verify CI passes first

---

## Troubleshooting

### API Docker build fails

- **`"/app/node_modules/.prisma": not found`** — The Dockerfile already handles pnpm's virtual store. If you see this, ensure the `COPY --from=builder /app/prisma-client` step runs after `prisma generate` in the builder stage.
- **`TS5083: Cannot read file '/app/tsconfig.json'`** — The tsconfig chain must not have dangling `extends` paths. All base configs are inlined in `packages/config/tsconfig/base.json`.
- **Native module build errors (bcrypt, sharp)** — The builder stage installs `python3 make g++`. The runner stage does not — native modules must compile in the builder or use prebuilt binaries.

### Railway deploy succeeds but API crashes

- Check `railway logs --service salonin-api` for the error
- Most common: missing environment variable — compare your Railway vars against the reference table above
- Database not reachable: verify `DATABASE_URL` uses `.railway.internal` hostname (not public)

### Prisma migration fails

```bash
# Check current migration status
railway run --service salonin-api -- pnpm exec prisma migrate status

# If stuck, resolve the failed migration
railway run --service salonin-api -- pnpm exec prisma migrate resolve --rolled-back <migration_name>
```

### Web app shows blank page

- Verify `NEXT_PUBLIC_API_URL` is set and correct (must include `https://`)
- Check browser console for CORS errors → update `CORS_ORIGINS` on API
- Verify `output: 'standalone'` is in `next.config.mjs`

### Mobile app can't connect to API

- Verify `EXPO_PUBLIC_API_URL` points to the Railway API domain
- Ensure CORS allows the mobile origin (Expo dev: `http://localhost:19006`, production: no origin header)
- Rebuild the app after changing env vars (Metro inlines them at build time)
