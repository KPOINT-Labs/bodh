# =============================================================================
# Bodh - Next.js Application Dockerfile (KPoint Rocky Linux Base)
# =============================================================================

ARG KPOINT_BASE_IMAGE=701980022429.dkr.ecr.ap-southeast-1.amazonaws.com/kpoint/base/rocky:latest
ARG BUN_VERSION=1.3.5
ARG NODE_VERSION=22

# =============================================================================
# Stage 1: Dependencies - Install Node.js, Bun, and npm packages
# =============================================================================
FROM $KPOINT_BASE_IMAGE AS deps

# Install Node.js via NodeSource
RUN curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - && \
    dnf install -y nodejs && \
    dnf clean all

# Install Bun
ARG BUN_VERSION
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}" && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    ln -s /root/.bun/bin/bunx /usr/local/bin/bunx

WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile

# =============================================================================
# Stage 2: Builder - Build Next.js application
# =============================================================================
FROM $KPOINT_BASE_IMAGE AS builder

# Install Node.js via NodeSource
RUN curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - && \
    dnf install -y nodejs && \
    dnf clean all

# Install Bun
ARG BUN_VERSION
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}" && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    ln -s /root/.bun/bin/bunx /usr/local/bin/bunx

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY prisma ./prisma/
COPY public ./public/
COPY package.json bun.lock next.config.ts tsconfig.json ./
COPY prisma.config.ts postcss.config.mjs auth.ts ./
COPY components.json ./
COPY lib ./lib/
COPY hooks ./hooks/
COPY actions ./actions/
COPY components ./components/
COPY types ./types/
COPY app ./app/
COPY contexts ./contexts/

# Generate Prisma Client (no real DATABASE_URL needed at build time)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN bunx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    LIVEKIT_URL="wss://livekit.kpoint.ai" \
    LIVEKIT_API_KEY="API2xJx7wdrMVkQ" \
    LIVEKIT_API_SECRET="PeilFr6CbZWii0B1NYXZZOj67oYo0fefse46IxpKcqVE"
RUN bun run build

# =============================================================================
# Stage 3: Runner - Production runtime
# =============================================================================
FROM $KPOINT_BASE_IMAGE AS runner

# Install Node.js (runtime only, no build tools needed)
RUN curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - && \
    dnf install -y nodejs && \
    dnf clean all && \
    rm -rf /var/cache/dnf/*

WORKDIR /app

# Security: Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Environment configuration (DATABASE_URL injected at runtime, not build time)
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME="0.0.0.0" \
    PORT=3000

# Copy public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Next.js standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma runtime
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy pg adapter dependencies (including transitive deps)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg ./node_modules/pg
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-connection-string ./node_modules/pg-connection-string
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-cloudflare ./node_modules/pg-cloudflare
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-int8 ./node_modules/pg-int8
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/split2 ./node_modules/split2
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres-array ./node_modules/postgres-array
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres-bytea ./node_modules/postgres-bytea
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres-date ./node_modules/postgres-date
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres-interval ./node_modules/postgres-interval

USER nextjs

EXPOSE 3000

# Health check with proper start period for Next.js + Prisma init
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
