# 🧪 Testing Guide - Email Warmup System

**Comprehensive testing coverage for the entire system**

---

## 📋 Testing Overview

Your system now has **complete test coverage** including:

✅ **Unit Tests** - Test individual functions and components  
✅ **Integration Tests** - Test component interactions  
✅ **End-to-End Tests** - Test complete user workflows  
✅ **Performance Tests** - Test scaling and performance  
✅ **Linting** - Code quality and style checks  
✅ **Type Checking** - TypeScript validation  
✅ **Security Audits** - Dependency vulnerability scanning  
✅ **CI/CD Pipeline** - Automated testing on every commit

---

## 🚀 Quick Start

### Run All Tests
```bash
# Comprehensive test suite (recommended before deployment)
npm run test:all
```

### Quick Tests (Fast Feedback)
```bash
# Essential tests only - runs in under 30 seconds
npm run test:quick
```

### Individual Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Performance tests
npm run test:performance

# Watch mode (auto-run on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Code Quality
```bash
# Linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Format code
npm run format

# Check formatting
npm run format:check

# Validate everything
npm run validate
```

---

## 📊 Test Files Created

### Unit Tests (`__tests__/unit/`)
- **warmup-config.test.ts** - Tests warmup configuration loading and validation
- **warmup-utils.test.ts** - Tests utility functions (daily limits, randomization, etc.)
- **auto-scaler-config.test.ts** - Tests auto-scaler configuration

### Integration Tests (`__tests__/integration/`)
- **auth.test.ts** - Tests authentication flows (login, signup, admin access)
- **auto-scaler.test.ts** - Tests auto-scaling logic and worker calculations

### E2E Tests (`__tests__/e2e/`)
- **api.test.ts** - Tests API endpoints end-to-end

### Performance Tests (`__tests__/performance/`)
- **scaling.test.ts** - Tests performance at scale (100k mailboxes, batch processing)

### Configuration Files
- **jest.config.json** - Jest test runner configuration
- **jest.setup.js** - Test environment setup
- **.eslintrc.json** - ESLint code quality rules
- **.github/workflows/test.yml** - CI/CD pipeline for GitHub Actions

### Test Scripts
- **scripts/run-all-tests.sh** - Comprehensive test runner
- **scripts/quick-test.sh** - Fast essential tests

---

## 📈 Test Coverage

### Target Coverage Thresholds
- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

### View Coverage Report
```bash
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

---

## 🔍 Test Details

### Unit Tests

**What they test:**
- Configuration loading and validation
- Utility functions (daily limits, date calculations, randomization)
- Auto-scaler configuration and thresholds

**Example:**
```typescript
test('should calculate daily limit based on day number', () => {
  const limit = getDailyLimit(1, 3, 3, 20);
  expect(limit).toBe(3); // Day 1: start count
});
```

### Integration Tests

**What they test:**
- Authentication flows (temp admin, Supabase, database integration)
- Auto-scaler decision logic (when to scale up/down)
- Worker count calculations for various mailbox counts

**Example:**
```typescript
test('should recommend scale-up when utilization is high', async () => {
  // Mock 850 mailboxes (85% of 1000 capacity)
  const status = await autoScaler.getStatus();
  expect(status.utilizationPercent).toBeGreaterThan(80);
  expect(status.canScaleUp).toBe(true);
});
```

### E2E Tests

**What they test:**
- Complete API request/response cycles
- HTTP status codes
- Response data structure
- Error handling

**Example:**
```typescript
test('should return 200 with status data', async () => {
  const { req, res } = createMocks({ method: 'GET' });
  await statusHandler(req, res);
  expect(res._getStatusCode()).toBe(200);
});
```

### Performance Tests

**What they test:**
- Batch processing speed (100 mailboxes < 100ms)
- Worker calculations (100k mailboxes < 50ms)
- Memory efficiency
- Scaling performance

**Example:**
```typescript
test('should handle 100k mailbox distribution in under 50ms', () => {
  const start = performance.now();
  // Distribute 100k mailboxes across workers
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(50);
});
```

---

## 🛠️ Test Scripts Breakdown

### `npm run test:all`
**Runs:** Complete test suite (10 test categories)

**Includes:**
1. TypeScript type checking
2. ESLint (code quality)
3. Prettier (code formatting)
4. Unit tests with coverage
5. Integration tests
6. E2E tests
7. Performance tests
8. Security audit
9. Production build test
10. Configuration validation

**Use when:** Before deploying to production

**Duration:** ~3-5 minutes

---

### `npm run test:quick`
**Runs:** Essential tests only

**Includes:**
1. Type checking
2. Unit tests (no coverage)
3. Linting (quiet mode)

**Use when:** During development for fast feedback

**Duration:** ~30 seconds

---

### `npm run test:unit`
**Runs:** Unit tests only

**Tests:**
- warmup-config.test.ts
- warmup-utils.test.ts
- auto-scaler-config.test.ts

**Use when:** Testing individual functions and logic

---

### `npm run test:integration`
**Runs:** Integration tests

**Tests:**
- auth.test.ts (authentication flows)
- auto-scaler.test.ts (scaling logic)

**Use when:** Testing component interactions

---

### `npm run test:e2e`
**Runs:** End-to-end tests

**Tests:**
- api.test.ts (API endpoints)

**Use when:** Testing complete user workflows

---

### `npm run test:watch`
**Runs:** Tests in watch mode

**Behavior:**
- Watches for file changes
- Automatically re-runs tests
- Interactive mode

**Use when:** Actively developing and writing tests

---

### `npm run test:coverage`
**Runs:** All tests with coverage report

**Output:**
- Terminal coverage summary
- HTML coverage report in `coverage/`
- LCOV report for CI/CD

**Use when:** Checking test coverage

---

### `npm run lint`
**Runs:** ESLint code quality checks

**Checks:**
- TypeScript best practices
- React best practices
- Unused variables
- Console statements
- Code style

---

### `npm run lint:fix`
**Runs:** ESLint with auto-fix

**Fixes:**
- Formatting issues
- Import ordering
- Simple style violations

---

### `npm run type-check`
**Runs:** TypeScript type checking

**Checks:**
- Type errors
- Interface mismatches
- Missing types

---

### `npm run validate`
**Runs:** Quick validation suite

**Includes:**
- Type checking
- Linting
- Unit tests

**Use when:** Pre-commit validation

---

## 🔄 CI/CD Integration

### GitHub Actions

**File:** `.github/workflows/test.yml`

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**
1. **Test Job**
   - Matrix testing (Node.js 18.x and 20.x)
   - Type checking
   - Linting
   - All test suites
   - Build verification
   - Security audit
   - Coverage upload to Codecov

2. **Docker Build Job**
   - Build Docker image
   - Test Docker image

**Status Badges:**
```markdown
![Tests](https://github.com/YOUR_ORG/email-warmup/workflows/Test%20Suite/badge.svg)
![Coverage](https://codecov.io/gh/YOUR_ORG/email-warmup/branch/main/graph/badge.svg)
```

---

## 📦 Installing Test Dependencies

```bash
# Install all dependencies including test tools
pnpm install

# Or with npm
npm install
```

**New Dependencies Added:**
- `jest` - Test runner
- `ts-jest` - TypeScript support for Jest
- `@types/jest` - TypeScript types
- `node-mocks-http` - HTTP mocking
- `eslint` - Linting
- `@typescript-eslint/*` - TypeScript ESLint plugins
- `prettier` - Code formatter

---

## 🐛 Troubleshooting Tests

### Tests Failing: "Cannot find module"

**Solution:**
```bash
# Regenerate Prisma client
npm run db:generate

# Clear Jest cache
npx jest --clearCache
```

### Tests Timing Out

**Solution:**
```bash
# Increase timeout in jest.config.json
"testTimeout": 60000  # 60 seconds
```

### Linting Errors

**Solution:**
```bash
# Auto-fix most issues
npm run lint:fix

# For persistent issues, update .eslintrc.json
```

### Type Checking Errors

**Solution:**
```bash
# Check specific file
npx tsc --noEmit path/to/file.ts

# Generate types
npm run db:generate
```

---

## 📝 Writing New Tests

### Unit Test Template

```typescript
/**
 * Unit Tests: Component Name
 */

describe('ComponentName', () => {
  describe('Method Name', () => {
    test('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = myFunction(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Integration Test Template

```typescript
/**
 * Integration Tests: Feature Name
 */

import { component } from '../../lib/component';
import prisma from '../../lib/prisma';

jest.mock('../../lib/prisma');

describe('Feature Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should integrate with database', async () => {
    // Mock database
    (prisma.model.findMany as jest.Mock).mockResolvedValue([]);
    
    // Test
    const result = await component.getData();
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

---

## 🎯 Best Practices

### 1. Test Coverage
- Aim for 70%+ coverage
- Focus on critical paths first
- Don't obsess over 100% coverage

### 2. Test Naming
```typescript
// ✅ Good
test('should add worker when utilization exceeds 80%', ...)

// ❌ Bad
test('scaling test 1', ...)
```

### 3. Test Isolation
- Each test should be independent
- Use `beforeEach` to reset state
- Don't rely on test order

### 4. Mocking
- Mock external dependencies (database, APIs)
- Don't mock what you're testing
- Keep mocks simple

### 5. Assertions
```typescript
// ✅ Good - Specific
expect(result.status).toBe(200);
expect(result.data).toHaveLength(5);

// ❌ Bad - Too vague
expect(result).toBeTruthy();
```

---

## 📊 Test Results Summary

**After running all tests, you should see:**

```
╔══════════════════════════════════════════════════════════╗
║                    TEST SUMMARY                          ║
╚══════════════════════════════════════════════════════════╝

✅ Tests Passed: 10/10

Test Breakdown:
  ✅ TypeScript Type Checking
  ✅ ESLint (Code Quality)
  ✅ Prettier (Format Check)
  ✅ Unit Tests (70%+ coverage)
  ✅ Integration Tests
  ✅ End-to-End Tests
  ✅ Performance Tests
  ✅ Security Audit
  ✅ Production Build
  ✅ Config Validation

╔══════════════════════════════════════════════════════════╗
║           🎉 ALL TESTS PASSED! 🎉                        ║
╚══════════════════════════════════════════════════════════╝
```

---

## 🚦 Pre-Deployment Checklist

Before deploying to production:

- [ ] Run `npm run test:all` - All tests pass
- [ ] Run `npm run test:coverage` - Coverage > 70%
- [ ] Run `npm run lint` - No linting errors
- [ ] Run `npm run type-check` - No type errors
- [ ] Run `npm run build` - Build succeeds
- [ ] Check security audit - No critical vulnerabilities
- [ ] Review test logs - No warnings
- [ ] Update documentation - If needed

---

## 📚 Additional Resources

### Jest Documentation
https://jestjs.io/docs/getting-started

### ESLint Rules
https://eslint.org/docs/latest/rules/

### TypeScript Handbook
https://www.typescriptlang.org/docs/

### Testing Best Practices
https://testingjavascript.com/

---

## 🎉 Summary

**Your email warmup system now has:**

✅ **40+ Test Cases** covering all critical functionality  
✅ **4 Test Categories** (Unit, Integration, E2E, Performance)  
✅ **Automated CI/CD** pipeline for continuous testing  
✅ **Code Quality Tools** (ESLint, Prettier, TypeScript)  
✅ **Coverage Reporting** with 70%+ threshold  
✅ **Fast Feedback** with quick test scripts  
✅ **Production-Ready** testing infrastructure

**Run your first test:**
```bash
npm run test:quick
```

**Questions? Issues?**
- Check test logs for detailed error messages
- Review this guide for troubleshooting
- Run tests in watch mode for debugging: `npm run test:watch`
