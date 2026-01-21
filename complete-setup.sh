#!/bin/bash

# Complete Gmail Warmup Dashboard Setup Script
# This script will help you configure and run the complete warmup tool

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📧 Gmail Warmup Dashboard - Complete Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  echo "Creating .env from template..."
  cat > .env << 'EOF'
# Supabase Database (PostgreSQL)
DATABASE_URL="postgresql://postgres.dcxnduxjczwzsxtitgjx:yV4GRWreciMSNLh5@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.dcxnduxjczwzsxtitgjx:yV4GRWreciMSNLh5@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://dcxnduxjczwzsxtitgjx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="PLACEHOLDER"
SUPABASE_SERVICE_ROLE_KEY="PLACEHOLDER"

# Email Warmup Settings
CRON_SCHEDULE="0 * * * *"
EMAIL_DELAY_MIN_SECONDS=300
EMAIL_DELAY_MAX_SECONDS=600
MAX_EMAILS_PER_HOUR=10

# Environment
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
  echo "✅ .env created!"
  echo ""
fi

# Prompt for Supabase keys
echo "🔑 Supabase Authentication Setup"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "To enable authentication, you need Supabase API keys."
echo "Get them from: https://supabase.com/dashboard/project/dcxnduxjczwzsxtitgjx/settings/api"
echo ""
read -p "Do you have your Supabase keys? (y/n): " has_keys

if [ "$has_keys" = "y" ] || [ "$has_keys" = "Y" ]; then
  echo ""
  read -p "Enter NEXT_PUBLIC_SUPABASE_ANON_KEY: " anon_key
  read -p "Enter SUPABASE_SERVICE_ROLE_KEY: " service_key
  
  # Update .env
  sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=\".*\"|NEXT_PUBLIC_SUPABASE_ANON_KEY=\"$anon_key\"|g" .env
  sed -i "s|SUPABASE_SERVICE_ROLE_KEY=\".*\"|SUPABASE_SERVICE_ROLE_KEY=\"$service_key\"|g" .env
  
  echo "✅ Supabase keys updated in .env"
else
  echo "⚠️  Skipping auth setup. App will run in demo mode."
  echo "   You can add keys later by editing .env"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Installing Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm install

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  Setting Up Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx prisma generate
npx prisma db push

echo ""
read -p "Would you like to seed sample data? (y/n): " seed_data

if [ "$seed_data" = "y" ] || [ "$seed_data" = "Y" ]; then
  if [ -f seed.js ]; then
    npm run seed || echo "⚠️  No seed script found, skipping..."
  else
    echo "⚠️  seed.js not found, skipping..."
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  Building Production Assets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run build

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Quick Start Commands:"
echo ""
echo "  Start development server:"
echo "    npm run dev"
echo ""
echo "  Start production server:"
echo "    npm start"
echo ""
echo "  Start with PM2 (recommended for production):"
echo "    pm2 start ecosystem.config.js"
echo ""
echo "  Start warmup worker:"
echo "    npm run warmup"
echo ""
echo "📱 Access your dashboard at: http://localhost:3000"
echo ""

if [ "$has_keys" != "y" ] && [ "$has_keys" != "Y" ]; then
  echo "⚠️  Authentication is disabled (demo mode)"
  echo "   Click 'Continue without login' to access the dashboard"
  echo "   To enable auth, get keys from Supabase and update .env"
  echo ""
fi

read -p "Would you like to start the server now? (y/n): " start_now

if [ "$start_now" = "y" ] || [ "$start_now" = "Y" ]; then
  echo ""
  echo "🚀 Starting production server..."
  npm start
else
  echo ""
  echo "👋 Setup complete! Run 'npm start' when ready."
fi
