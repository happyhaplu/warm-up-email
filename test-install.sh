#!/bin/bash

# Test Installation Script
# Verifies that all components are properly set up

echo "======================================"
echo "  Gmail Warmup - Installation Test"
echo "======================================"
echo ""

ERRORS=0

# Check Node.js
if command -v node &> /dev/null; then
    echo "✓ Node.js $(node --version) found"
else
    echo "✗ Node.js not found"
    ERRORS=$((ERRORS + 1))
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✓ npm $(npm --version) found"
else
    echo "✗ npm not found"
    ERRORS=$((ERRORS + 1))
fi

# Check if package.json exists
if [ -f "package.json" ]; then
    echo "✓ package.json exists"
else
    echo "✗ package.json missing"
    ERRORS=$((ERRORS + 1))
fi

# Check if .env exists
if [ -f ".env" ]; then
    echo "✓ .env file exists"
else
    echo "⚠️  .env file missing (run: cp .env.example .env)"
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✓ node_modules directory exists"
else
    echo "⚠️  node_modules missing (run: npm install)"
fi

# Check Prisma client
if [ -d "node_modules/@prisma/client" ]; then
    echo "✓ Prisma client installed"
else
    echo "⚠️  Prisma client missing (run: npm run db:generate)"
fi

# Check database
if [ -f "prisma/dev.db" ]; then
    echo "✓ Database file exists"
else
    echo "⚠️  Database missing (run: npm run db:push)"
fi

# Check key directories
DIRS=("components" "lib" "pages" "pages/api" "prisma" "services" "styles")
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✓ Directory '$dir' exists"
    else
        echo "✗ Directory '$dir' missing"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check key files
FILES=(
    "components/Layout.tsx"
    "lib/prisma.ts"
    "pages/index.tsx"
    "pages/api/accounts.ts"
    "services/warmup.js"
    "prisma/schema.prisma"
    "tailwind.config.js"
    "next.config.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ File '$file' exists"
    else
        echo "✗ File '$file' missing"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "======================================"

if [ $ERRORS -eq 0 ]; then
    echo "  ✅ All checks passed!"
    echo "======================================"
    echo ""
    echo "Next steps:"
    echo "1. npm run dev          # Start Next.js"
    echo "2. npm run warmup       # Start worker"
    echo "3. Open http://localhost:3000"
    echo ""
    exit 0
else
    echo "  ❌ $ERRORS error(s) found"
    echo "======================================"
    echo ""
    echo "Run './setup.sh' to fix setup issues"
    echo ""
    exit 1
fi
