#!/bin/bash

# Gmail Warmup Setup Script
# This script automates the initial setup process

set -e

echo "======================================"
echo "  Gmail Warmup - Setup Script"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js $(node --version) detected"
echo ""

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Step 2: Create .env file
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created"
else
    echo "⚠️  .env file already exists, skipping..."
fi
echo ""

# Step 3: Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate
echo "✓ Prisma client generated"
echo ""

# Step 4: Initialize database
echo "🗄️  Initializing SQLite database..."
npm run db:push
echo "✓ Database initialized"
echo ""

# Step 5: Seed with sample data
echo "🌱 Seeding sample templates..."
npm run db:seed
echo "✓ Sample data added"
echo ""

echo "======================================"
echo "  ✅ Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the development server:"
echo "   npm run dev"
echo ""
echo "2. In a separate terminal, start the warmup service:"
echo "   npm run warmup"
echo ""
echo "3. Open your browser to:"
echo "   http://localhost:3000"
echo ""
echo "4. Add your accounts, recipients, and templates via the UI"
echo ""
echo "📚 For more help, see:"
echo "   - README.md (full documentation)"
echo "   - QUICKSTART.md (quick start guide)"
echo ""
