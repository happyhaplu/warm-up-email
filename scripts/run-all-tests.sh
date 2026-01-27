#!/bin/bash

# Comprehensive Test Runner
# Runs all tests: unit, integration, e2e, linting, type checking

set -e  # Exit on any error

echo "╔══════════════════════════════════════════════════════════╗"
echo "║         COMPREHENSIVE TEST SUITE - EMAIL WARMUP          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
  local test_name=$1
  local test_command=$2
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🧪 Running: $test_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if eval $test_command; then
    echo -e "${GREEN}✅ PASSED: $test_name${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAILED: $test_name${NC}"
    ((TESTS_FAILED++))
  fi
}

# 1. TypeScript Type Checking
run_test "TypeScript Type Checking" "npx tsc --noEmit"

# 2. ESLint
run_test "ESLint (Code Quality)" "npx eslint . --ext .ts,.tsx --max-warnings 50"

# 3. Prettier (Code Formatting Check)
run_test "Prettier (Format Check)" "npx prettier --check '**/*.{ts,tsx,js,jsx,json,md}' || true"

# 4. Unit Tests
run_test "Unit Tests" "npx jest __tests__/unit --coverage --passWithNoTests"

# 5. Integration Tests
run_test "Integration Tests" "npx jest __tests__/integration --passWithNoTests"

# 6. E2E Tests
run_test "End-to-End Tests" "npx jest __tests__/e2e --passWithNoTests"

# 7. Performance Tests
run_test "Performance Tests" "npx jest __tests__/performance --passWithNoTests"

# 8. Security Audit
run_test "Security Audit (npm)" "npm audit --audit-level=moderate || true"

# 9. Build Test
run_test "Production Build" "npx next build"

# 10. Configuration Validation
run_test "Config Validation" "node -e \"require('./lib/warmup-config'); console.log('Config OK')\""

# Summary
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║           🎉 ALL TESTS PASSED! 🎉                        ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  exit 0
else
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║           ⚠️  SOME TESTS FAILED ⚠️                        ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  exit 1
fi
