# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy manifests + pnpm config
COPY package.json pnpm-lock.yaml .npmrc ./

# Create a workspace manifest scoped to only what the web app needs
RUN printf 'packages:\n  - packages/config\n  - packages/types\n  - packages/utils\n  - packages/api-client\n  - apps/web\n' > pnpm-workspace.yaml

# Copy the packages the web app depends on
COPY packages/config/     ./packages/config/
COPY packages/types/      ./packages/types/
COPY packages/utils/      ./packages/utils/
COPY packages/api-client/ ./packages/api-client/
COPY apps/web/            ./apps/web/
COPY prisma/              ./prisma/

# Strip expo patchedDependencies — those packages aren't in the web workspace
RUN node -e "const p=require('./package.json'); delete p.pnpm; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2)+'\n')" \
    && sed -i '/^patchedDependencies:/,/^$/d' pnpm-lock.yaml

# Install deps
RUN pnpm install --no-frozen-lockfile

# Generate Prisma client (types package depends on it)
RUN pnpm exec prisma generate

# Build Next.js
RUN pnpm --filter @salonin/web build

# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
