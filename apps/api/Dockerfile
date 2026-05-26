# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl python3 make g++
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy manifests + pnpm config
COPY package.json pnpm-lock.yaml .npmrc tsconfig.json ./

# Create a workspace manifest scoped to only what the API needs
RUN printf 'packages:\n  - packages/config\n  - packages/types\n  - packages/utils\n  - apps/api\n' > pnpm-workspace.yaml

# Copy the packages the API depends on
COPY packages/config/  ./packages/config/
COPY packages/types/   ./packages/types/
COPY packages/utils/   ./packages/utils/
COPY apps/api/         ./apps/api/
COPY prisma/           ./prisma/

# Install deps (lockfile used for version pinning, not strict validation)
RUN pnpm install --no-frozen-lockfile

# Generate Prisma client
RUN pnpm exec prisma generate

# Build — webpack bundles @salonin/* inline, externalises node_modules
RUN pnpm --filter @salonin/api build

# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy manifests + pnpm config
COPY package.json pnpm-lock.yaml .npmrc ./
RUN printf 'packages:\n  - packages/config\n  - packages/types\n  - packages/utils\n  - apps/api\n' > pnpm-workspace.yaml

COPY packages/config/package.json  ./packages/config/package.json
COPY packages/types/package.json   ./packages/types/package.json
COPY packages/utils/package.json   ./packages/utils/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY prisma/ ./prisma/

# Install production deps only
RUN pnpm install --no-frozen-lockfile --prod

# Copy generated Prisma client from builder (prisma CLI is devDep, unavailable here)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy webpack bundle from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 4000
ENV NODE_ENV=production

CMD ["node", "apps/api/dist/main.js"]
