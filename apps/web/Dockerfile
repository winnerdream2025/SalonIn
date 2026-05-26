# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy monorepo manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy only the packages the web app depends on at build time
COPY packages/config/  ./packages/config/
COPY packages/types/   ./packages/types/
COPY packages/utils/   ./packages/utils/
COPY packages/api-client/ ./packages/api-client/
COPY apps/web/         ./apps/web/
COPY prisma/           ./prisma/

# Install all deps
RUN pnpm install --frozen-lockfile

# Generate Prisma client (types package depends on it)
RUN pnpm exec prisma generate

# Build Next.js
RUN pnpm --filter @salonin/web build

# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built output + required files
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
