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

# Export generated Prisma client + .prisma runtime from the pnpm store
RUN PRISMA_STORE=$(find /app/node_modules/.pnpm -maxdepth 1 -name '@prisma+client@*' | head -1)/node_modules && \
    cp -rL "$PRISMA_STORE/@prisma/client" /app/prisma-client && \
    cp -rL "$PRISMA_STORE/.prisma/client"  /app/prisma-runtime

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

# Restore generated Prisma client + .prisma runtime into runner's pnpm store
COPY --from=builder /app/prisma-client  /tmp/prisma-client
COPY --from=builder /app/prisma-runtime /tmp/prisma-runtime
RUN PRISMA_STORE=$(find /app/node_modules/.pnpm -maxdepth 1 -name '@prisma+client@*' | head -1)/node_modules && \
    rm -rf "$PRISMA_STORE/@prisma/client" && \
    cp -rL /tmp/prisma-client "$PRISMA_STORE/@prisma/client" && \
    mkdir -p "$PRISMA_STORE/.prisma" && \
    cp -rL /tmp/prisma-runtime "$PRISMA_STORE/.prisma/client" && \
    rm -rf /tmp/prisma-client /tmp/prisma-runtime

# Copy webpack bundle from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 4000
ENV NODE_ENV=production

CMD ["node", "apps/api/dist/main.js"]
