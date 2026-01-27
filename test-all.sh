#!/bin/bash
# Test All - Complete Testing Suite

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  EMAIL WARMUP - COMPLETE TEST SUITE                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0

# Test 1: TypeScript Type Checking
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 TypeScript Type Checking..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pnpm type-check; then
  echo "✅ Type checking passed"
  ((PASSED++))
else
  echo "❌ Type checking failed"
  ((FAILED++))
fi
echo ""

# Test 2: Unit Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Unit Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pnpm test:unit; then
  echo "✅ Unit tests passed"
  ((PASSED++))
else
  echo "❌ Unit tests failed"
  ((FAILED++))
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                      TEST SUMMARY                          ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  ✅ Passed: $PASSED                                              ║"
echo "║  ❌ Failed: $FAILED                                              ║"
echo "╠════════════════════════════════════════════════════════════╣"

if [ $FAILED -eq 0 ]; then
  echo "║             🎉 ALL TESTS PASSED! 🎉                        ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  exit 0
else
  echo "║          ⚠️  SOME TESTS FAILED ⚠️                          ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  exit 1
fi
