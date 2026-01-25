# syntax=docker/dockerfile:1

# ================================
# Base Stage - Common base for all stages
# ================================
FROM node:20-alpine AS base

# Install required system dependencies
RUN apk add --no-cache libc6-compat openssl

# ================================
# Dependencies Stage - Install npm packages
# ================================
FROM base AS deps
WORKDIR /app

# Copy package files and prisma schema
COPY package.json ./
COPY prisma ./prisma/

# Install dependencies with --ignore-scripts to skip postinstall
# This avoids the "prisma: not found" error since prisma CLI isn't in PATH during npm install
# We'll run prisma generate explicitly after install completes
RUN npm install --legacy-peer-deps --ignore-scripts

# Now run prisma generate using the locally installed version (not npx which downloads latest)
# Using ./node_modules/.bin/prisma ensures we use the pinned version (5.8.1) not latest (7.x)
RUN ./node_modules/.bin/prisma generate

# ================================
# Builder Stage - Build the Next.js application
# ================================
FROM base AS builder
WORKDIR /app

# Set build-time environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy node_modules from deps stage (includes generated Prisma client)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js application
# Note: prisma generate is already done in deps stage, so build script's prisma generate will be a no-op
RUN npm run build

# ================================
# Runner Stage - Production runtime
# ================================
FROM base AS runner
WORKDIR /app

# Set production environment variables using proper key=value format
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/services ./services

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Set proper ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 3000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/warmup/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
