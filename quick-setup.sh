#!/bin/bash

# Gmail Warm-up Tool - Quick Start Script
# This script sets up the complete environment

echo "🚀 Gmail Warm-up Tool - Quick Start"
echo "===================================="
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your Supabase credentials."
    echo ""
    echo "Required variables:"
    echo "  DATABASE_URL"
    echo "  DIRECT_URL"
    echo "  NEXT_PUBLIC_SUPABASE_URL"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo ""

# Generate Prisma client
echo "🔧 Generating Prisma client..."
pnpm db:generate
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
pnpm db:migrate:deploy
echo ""

# Seed templates
echo "🌱 Seeding templates..."
node prisma/seed-templates.js
echo ""

# Build the application
echo "🏗️  Building application..."
pnpm build
echo ""

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Start the development server:"
echo "   pnpm dev"
echo ""
echo "2. Or start in production mode:"
echo "   pnpm start"
echo ""
echo "3. Login as admin:"
echo "   Email: happy.outcraftly@zohomail.in"
echo "   Password: System@123321"
echo "   URL: http://localhost:3000/login"
echo ""
echo "4. Or sign up as a regular user at /login"
echo ""
echo "🎉 Happy warm-up!"
