#!/bin/bash

# Quick Test Runner - Fast feedback for development
# Runs only essential tests for rapid iteration

echo "🚀 Quick Test Suite (Essential Tests Only)"
echo ""

# Run type checking
echo "1️⃣ Type Checking..."
npx tsc --noEmit --pretty || echo "⚠️  Type errors found"

# Run unit tests without coverage (faster)
echo ""
echo "2️⃣ Unit Tests..."
npx jest __tests__/unit --passWithNoTests --verbose=false

# Run linting on changed files only
echo ""
echo "3️⃣ Linting..."
npx eslint . --ext .ts,.tsx --max-warnings 100 --quiet

echo ""
echo "✅ Quick tests complete!"
