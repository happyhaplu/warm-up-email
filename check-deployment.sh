#!/bin/bash
# Pre-deployment Checklist

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     EMAIL WARMUP - DEPLOYMENT READINESS CHECK            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0

# Check 1: Build
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Building application..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pnpm build > /tmp/build.log 2>&1; then
  echo "✅ Build successful"
  ((PASSED++))
else
  echo "❌ Build failed - check /tmp/build.log"
  ((FAILED++))
fi
echo ""

# Check 2: Type checking
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Type checking..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pnpm type-check > /tmp/typecheck.log 2>&1; then
  echo "✅ No type errors"
  ((PASSED++))
else
  echo "❌ Type errors found - check /tmp/typecheck.log"
  ((FAILED++))
fi
echo ""

# Check 3: Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Running tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pnpm test > /tmp/test.log 2>&1; then
  echo "✅ All tests passed"
  ((PASSED++))
else
  echo "❌ Tests failed - check /tmp/test.log"
  ((FAILED++))
fi
echo ""

# Check 4: Required files
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Checking required files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FILES=(
  "package.json"
  "next.config.js"
  "prisma/schema.prisma"
  ".coolify.json"
  "COOLIFY_DEPLOYMENT.md"
)

ALL_FILES_PRESENT=true
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (missing)"
    ALL_FILES_PRESENT=false
  fi
done

if [ "$ALL_FILES_PRESENT" = true ]; then
  ((PASSED++))
else
  ((FAILED++))
fi
echo ""

# Check 5: Environment variables template
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Checking environment setup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f ".env.example" ] || [ -f ".env.scalable.example" ]; then
  echo "✅ Environment template available"
  ((PASSED++))
else
  echo "⚠️  No .env.example found (optional)"
  ((PASSED++))
fi
echo ""

# Check 6: Git status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Git status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if git diff-index --quiet HEAD --; then
  echo "✅ All changes committed"
  ((PASSED++))
else
  echo "⚠️  Uncommitted changes present"
  git status --short
  ((FAILED++))
fi
echo ""

# Check 7: Remote sync
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Checking remote sync..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git fetch origin main > /dev/null 2>&1
LOCAL=$(git rev-parse main)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "✅ Local and remote are in sync"
  ((PASSED++))
else
  echo "⚠️  Local and remote are out of sync"
  echo "   Run: git push origin main"
  ((FAILED++))
fi
echo ""

# Summary
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    DEPLOYMENT SUMMARY                     ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║  ✅ Checks Passed: $PASSED/7                                     ║"
echo "║  ❌ Checks Failed: $FAILED/7                                     ║"
echo "╠═══════════════════════════════════════════════════════════╣"

if [ $FAILED -eq 0 ]; then
  echo "║          🎉 READY FOR DEPLOYMENT! 🎉                      ║"
  echo "╚═══════════════════════════════════════════════════════════╝"
  echo ""
  echo "Next steps for Coolify deployment:"
  echo ""
  echo "1. Configure Coolify project with GitHub repository"
  echo "2. Set environment variables in Coolify:"
  echo "   - DATABASE_URL"
  echo "   - NEXT_PUBLIC_SUPABASE_URL"
  echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "   - SUPABASE_SERVICE_ROLE_KEY"
  echo "   - NODE_ENV=production"
  echo ""
  echo "3. Deploy from main branch"
  echo "4. Run post-deployment:"
  echo "   npx prisma migrate deploy"
  echo ""
  echo "📖 See COOLIFY_DEPLOYMENT.md for detailed instructions"
  echo ""
  exit 0
else
  echo "║           ⚠️  ISSUES FOUND ⚠️                             ║"
  echo "╚═══════════════════════════════════════════════════════════╝"
  echo ""
  echo "Please fix the issues above before deploying."
  echo ""
  exit 1
fi
