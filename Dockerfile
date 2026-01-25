# syntax=docker/dockerfile:1

# ================================
# Base Stage
# ================================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# ================================
# Dependencies Stage
# ================================
FROM base AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for Prisma)
RUN pnpm install --prod=false

# Generate Prisma Client
RUN pnpm prisma generate

# ================================
# Builder Stage
# ================================
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# ================================
# Runner Stage
# ================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create system user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/services ./services

# Copy only Prisma client (not entire node_modules)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Change ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/warmup/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
