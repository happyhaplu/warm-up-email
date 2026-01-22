# Deployment Guide

## Prerequisites
- PostgreSQL database
- SMTP/IMAP email account credentials
- Node.js 18+ runtime

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"
DIRECT_URL="postgresql://user:password@host:port/database"

# JWT Secret
JWT_SECRET="your-secure-random-string-here"

# Node Environment
NODE_ENV="production"
```

## Deployment on Coolify/Docker

### Option 1: Using Docker (Recommended)

```bash
# Build the Docker image
docker build -t email-warmup .

# Run the container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name email-warmup \
  email-warmup
```

### Option 2: Direct Deployment

```bash
# Install dependencies
pnpm install

# Generate Prisma Client
pnpm prisma generate

# Run database migrations
pnpm prisma migrate deploy

# Build the application
pnpm build

# Start production server
pnpm start
```

## Coolify Deployment

1. **Connect Your Repository**: Link your GitHub repository to Coolify
2. **Set Build Pack**: Select "Nixpacks" or "Dockerfile"
3. **Environment Variables**: Add all required env vars in Coolify dashboard
4. **Important Settings**:
   - Set `NODE_ENV=production` as **Runtime Only** (not build-time)
   - Build command: `pnpm install && pnpm prisma generate && pnpm build`
   - Start command: `pnpm start`

## Post-Deployment

1. **Run Migrations**:
   ```bash
   pnpm prisma migrate deploy
   ```

2. **Seed Templates**:
   ```bash
   node scripts/insert-send-templates.js
   node scripts/insert-reply-templates.js
   ```

3. **Create Admin User**:
   ```bash
   node scripts/manage-admin.js
   ```

## Troubleshooting

### Build Fails with "pnpm-lock.yaml not found"
- The Dockerfile is configured to work without lockfile
- If deployment requires it, commit the lockfile to repository

### "devDependencies not installed" Error
- Ensure `NODE_ENV` is NOT set to "production" during build
- Only set it to "production" for runtime

### Database Connection Issues
- Verify `DATABASE_URL` and `DIRECT_URL` are correctly set
- Ensure database is accessible from your deployment environment
- Run migrations: `pnpm prisma migrate deploy`

## Health Check

Visit `http://your-domain:3000/api/auth/me` to verify the API is running.
