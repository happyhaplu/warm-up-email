#!/bin/bash

echo "🚀 Gmail Warmup Automation - Quick Start"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo "⚠️  Please update Supabase keys in .env before running!"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Push database schema
echo "💾 Pushing database schema to Supabase..."
npm run db:push

# Seed database
echo "🌱 Seeding database with sample data..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Start web interface:    npm run dev"
echo "📧 Start email worker:     npm run warmup:dev"
echo "📊 Open Prisma Studio:     npm run db:studio"
echo ""
echo "📖 Documentation:"
echo "   - PRODUCTION_GUIDE.md    - Full deployment guide"
echo "   - SUPABASE_KEYS_GUIDE.md - Get your API keys"
echo ""
echo "🔗 Dashboard: http://localhost:3000"
echo ""
