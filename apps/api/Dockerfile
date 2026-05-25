# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy monorepo manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy only the packages the API depends on at build time
COPY packages/config/  ./packages/config/
COPY packages/types/   ./packages/types/
COPY packages/utils/   ./packages/utils/
COPY apps/api/         ./apps/api/
COPY prisma/           ./prisma/

# Install all deps (devDeps needed for nest build + webpack)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm exec prisma generate

# Build — webpack bundles @salonin/* inline, externalises node_modules
RUN pnpm --filter @salonin/api build

# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy workspace manifests + API's production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config/  ./packages/config/
COPY packages/types/   ./packages/types/
COPY packages/utils/   ./packages/utils/
COPY apps/api/package.json ./apps/api/package.json
COPY prisma/ ./prisma/

# Install production deps only (no devDeps)
RUN pnpm install --frozen-lockfile --prod

# Generate Prisma client in runner (needed at runtime)
RUN pnpm exec prisma generate

# Copy webpack bundle from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 4000
ENV NODE_ENV=production

CMD ["node", "apps/api/dist/main.js"]
