# ── Base ──────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Dependencies ──────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
# Flat hoist in Docker so all binaries (prisma, dotenv-cli) are in root node_modules
RUN echo "node-linker=hoisted" > .npmrc && pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app ./
COPY . .

# Generate Prisma client
RUN ./node_modules/.bin/prisma generate --schema=packages/database/prisma/schema.prisma

# Build all packages (Turborepo handles dependency order)
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV JWT_SECRET="build-time-placeholder-min-32-characters-long"
ENV JWT_REFRESH_SECRET="build-time-placeholder-min-32-characters-long"
RUN pnpm build

# ── API ───────────────────────────────────────────────
FROM node:22-alpine AS api
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/database ./packages/database
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/package.json ./
EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]

# ── Worker ────────────────────────────────────────────
FROM node:22-alpine AS worker
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/database ./packages/database
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/worker ./apps/worker
COPY --from=build /app/package.json ./
CMD ["node", "apps/worker/dist/index.js"]

# ── Web ───────────────────────────────────────────────
FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy the standalone output
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
