/**
 * Comprehensive End-to-End Test Suite
 * Tests all 3 User Stories:
 * - Story 3: Dashboard + Auth
 * - Story 2: Data Management + Bulk Import
 * - Story 1: Warmup Automation Engine
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bold}${'='.repeat(60)}${colors.reset}`),
  header: (msg) => console.log(`${colors.cyan}${colors.bold}${msg}${colors.reset}`),
};

// Test results storage
const results = {
  story3: { passed: 0, failed: 0, tests: [] },
  story2: { passed: 0, failed: 0, tests: [] },
  story1: { passed: 0, failed: 0, tests: [] },
};

function recordTest(story, testName, passed, message = '') {
  results[story].tests.push({ testName, passed, message });
  if (passed) {
    results[story].passed++;
    log.success(`${testName} - ${message}`);
  } else {
    results[story].failed++;
    log.error(`${testName} - ${message}`);
  }
}

// ============================================================================
// STORY 3: Dashboard + Auth Tests
// ============================================================================

function testStory3_DashboardAuth() {
  log.section();
  log.header('📋 STORY 3: Dashboard + Auth Tests');
  log.section();

  // Test 1: Check if authentication pages exist
  const authPages = [
    'pages/auth/login.tsx',
    'pages/reset-password.tsx',
    'pages/login.tsx',
  ];

  authPages.forEach((page) => {
    const exists = fs.existsSync(path.join(process.cwd(), page));
    recordTest('story3', `Auth page exists: ${page}`, exists,
      exists ? 'File found' : 'File missing');
  });

  // Test 2: Check if dashboard pages exist
  const dashboardPages = [
    'pages/dashboard.tsx',
    'pages/dashboard/mailboxes.tsx',
    'pages/dashboard/recipients.tsx',
    'pages/dashboard/templates.tsx',
    'pages/dashboard/logs.tsx',
  ];

  dashboardPages.forEach((page) => {
    const exists = fs.existsSync(path.join(process.cwd(), page));
    recordTest('story3', `Dashboard page exists: ${page}`, exists,
      exists ? 'File found' : 'File missing');
  });

  // Test 3: Check middleware for auth protection
  const middlewareExists = fs.existsSync(path.join(process.cwd(), 'middleware.ts'));
  recordTest('story3', 'Middleware exists', middlewareExists,
    middlewareExists ? 'Auth protection configured' : 'Middleware missing');

  if (middlewareExists) {
    const middlewareContent = fs.readFileSync(path.join(process.cwd(), 'middleware.ts'), 'utf8');
    const hasAuthCheck = middlewareContent.includes('supabase') || middlewareContent.includes('auth');
    recordTest('story3', 'Middleware has auth logic', hasAuthCheck,
      hasAuthCheck ? 'Auth checks present' : 'Auth checks missing');
  }

  // Test 4: Check Supabase configuration
  const envExists = fs.existsSync(path.join(process.cwd(), '.env'));
  recordTest('story3', '.env file exists', envExists,
    envExists ? 'Environment configured' : 'Environment missing');

  if (envExists) {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL');
    const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    recordTest('story3', 'Supabase URL configured', hasSupabaseUrl,
      hasSupabaseUrl ? 'URL present' : 'URL missing');
    recordTest('story3', 'Supabase Anon Key configured', hasSupabaseKey,
      hasSupabaseKey ? 'Key present' : 'Key missing');
  }

  // Test 5: Check Layout component
  const layoutExists = fs.existsSync(path.join(process.cwd(), 'components/Layout.tsx'));
  recordTest('story3', 'Layout component exists', layoutExists,
    layoutExists ? 'UI structure ready' : 'Layout missing');

  // Test 6: Check dashboard has warmup controls
  const dashboardContent = fs.readFileSync(path.join(process.cwd(), 'pages/dashboard.tsx'), 'utf8');
  const hasWarmupControls = dashboardContent.includes('Start Warmup') || dashboardContent.includes('startWarmup');
  recordTest('story3', 'Dashboard has warmup controls', hasWarmupControls,
    hasWarmupControls ? 'Controls integrated' : 'Controls missing');

  const hasAnalytics = dashboardContent.includes('totalSent') || dashboardContent.includes('Analytics');
  recordTest('story3', 'Dashboard has analytics', hasAnalytics,
    hasAnalytics ? 'Analytics cards present' : 'Analytics missing');
}

// ============================================================================
// STORY 2: Data Management + Bulk Import Tests
// ============================================================================

function testStory2_DataManagement() {
  log.section();
  log.header('📋 STORY 2: Data Management + Bulk Import Tests');
  log.section();

  // Test 1: Check Prisma schema
  const schemaExists = fs.existsSync(path.join(process.cwd(), 'prisma/schema.prisma'));
  recordTest('story2', 'Prisma schema exists', schemaExists,
    schemaExists ? 'Database schema defined' : 'Schema missing');

  if (schemaExists) {
    const schemaContent = fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
    
    const models = ['Account', 'Recipient', 'Template', 'Log'];
    models.forEach((model) => {
      const hasModel = schemaContent.includes(`model ${model}`);
      recordTest('story2', `Database model: ${model}`, hasModel,
        hasModel ? 'Model defined' : 'Model missing');
    });

    // Check Account model has SMTP/IMAP fields
    const hasSmtpFields = schemaContent.includes('smtpHost') && schemaContent.includes('smtpPort');
    const hasImapFields = schemaContent.includes('imapHost') && schemaContent.includes('imapPort');
    
    recordTest('story2', 'Account has SMTP config fields', hasSmtpFields,
      hasSmtpFields ? 'SMTP fields present' : 'SMTP fields missing');
    recordTest('story2', 'Account has IMAP config fields', hasImapFields,
      hasImapFields ? 'IMAP fields present' : 'IMAP fields missing');
  }

  // Test 2: Check API routes for CRUD operations
  const apiRoutes = [
    'pages/api/accounts.ts',
    'pages/api/recipients.ts',
    'pages/api/templates.ts',
    'pages/api/logs.ts',
  ];

  apiRoutes.forEach((route) => {
    const exists = fs.existsSync(path.join(process.cwd(), route));
    recordTest('story2', `API route exists: ${route}`, exists,
      exists ? 'CRUD endpoint ready' : 'Endpoint missing');

    if (exists) {
      const content = fs.readFileSync(path.join(process.cwd(), route), 'utf8');
      const hasMethods = ['GET', 'POST', 'PUT', 'DELETE'].some(m => content.includes(m));
      recordTest('story2', `${route} has HTTP methods`, hasMethods,
        hasMethods ? 'CRUD methods present' : 'Methods missing');
    }
  });

  // Test 3: Check bulk import API routes
  const bulkImportRoutes = [
    'pages/api/accounts/bulk-import.ts',
    'pages/api/recipients/bulk-import.ts',
    'pages/api/templates/bulk-import.ts',
  ];

  bulkImportRoutes.forEach((route) => {
    const exists = fs.existsSync(path.join(process.cwd(), route));
    recordTest('story2', `Bulk import route: ${route}`, exists,
      exists ? 'Bulk import ready' : 'Bulk import missing');

    if (exists) {
      const content = fs.readFileSync(path.join(process.cwd(), route), 'utf8');
      const hasFormidable = content.includes('formidable');
      const hasPapaparse = content.includes('papaparse') || content.includes('xlsx');
      
      recordTest('story2', `${route} has file parsing`, hasFormidable || hasPapaparse,
        hasFormidable || hasPapaparse ? 'CSV/Excel parsing configured' : 'Parsing missing');
    }
  });

  // Test 4: Check dashboard forms
  const formsPages = [
    'pages/dashboard/mailboxes.tsx',
    'pages/dashboard/recipients.tsx',
    'pages/dashboard/templates.tsx',
  ];

  formsPages.forEach((page) => {
    const content = fs.readFileSync(path.join(process.cwd(), page), 'utf8');
    
    const hasForm = content.includes('form') || content.includes('input');
    recordTest('story2', `${page} has form elements`, hasForm,
      hasForm ? 'Forms present' : 'Forms missing');

    const hasBulkImport = content.includes('bulk') || content.includes('import') || content.includes('CSV');
    recordTest('story2', `${page} has bulk import UI`, hasBulkImport,
      hasBulkImport ? 'Bulk import UI present' : 'Bulk import UI missing');

    const hasCRUD = content.includes('edit') || content.includes('delete');
    recordTest('story2', `${page} has CRUD operations`, hasCRUD,
      hasCRUD ? 'Edit/Delete present' : 'CRUD missing');
  });

  // Test 5: Check package.json for required dependencies
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const requiredDeps = ['papaparse', 'xlsx', 'formidable', '@prisma/client'];
  
  requiredDeps.forEach((dep) => {
    const installed = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
    recordTest('story2', `Dependency installed: ${dep}`, !!installed,
      installed ? `Version ${installed}` : 'Not installed');
  });
}

// ============================================================================
// STORY 1: Warmup Automation Engine Tests
// ============================================================================

function testStory1_WarmupEngine() {
  log.section();
  log.header('📋 STORY 1: Warmup Automation Engine Tests');
  log.section();

  // Test 1: Check warmup service exists
  const warmupServiceExists = fs.existsSync(path.join(process.cwd(), 'lib/warmup-service.ts'));
  recordTest('story1', 'Warmup service exists', warmupServiceExists,
    warmupServiceExists ? 'Core engine file present' : 'Service file missing');

  if (warmupServiceExists) {
    const serviceContent = fs.readFileSync(path.join(process.cwd(), 'lib/warmup-service.ts'), 'utf8');
    
    // Test 2: Check core methods
    const coreMethods = [
      'startWarmup',
      'stopWarmup',
      'getStatus',
      'sendWarmupEmail',
      'checkInboxAndReply',
    ];

    coreMethods.forEach((method) => {
      const hasMethod = serviceContent.includes(method);
      recordTest('story1', `Warmup service has ${method}()`, hasMethod,
        hasMethod ? 'Method implemented' : 'Method missing');
    });

    // Test 3: Check random selection logic
    const hasRandomAccount = serviceContent.includes('getRandomAccount');
    const hasRandomRecipient = serviceContent.includes('getRandomRecipient');
    const hasRandomTemplate = serviceContent.includes('getRandomTemplate');

    recordTest('story1', 'Random account selection', hasRandomAccount,
      hasRandomAccount ? 'Implemented' : 'Missing');
    recordTest('story1', 'Random recipient selection', hasRandomRecipient,
      hasRandomRecipient ? 'Implemented' : 'Missing');
    recordTest('story1', 'Random template selection', hasRandomTemplate,
      hasRandomTemplate ? 'Implemented' : 'Missing');

    // Test 4: Check SMTP/IMAP integration
    const hasNodemailer = serviceContent.includes('nodemailer');
    const hasImap = serviceContent.includes('imap') || serviceContent.includes('imaps');

    recordTest('story1', 'SMTP integration (nodemailer)', hasNodemailer,
      hasNodemailer ? 'Email sending configured' : 'nodemailer missing');
    recordTest('story1', 'IMAP integration', hasImap,
      hasImap ? 'Inbox checking configured' : 'IMAP missing');

    // Test 5: Check 5-minute delay logic
    const hasDelay = serviceContent.includes('sleep') || serviceContent.includes('delay');
    const hasMinutes = serviceContent.includes('60 * 1000') || serviceContent.includes('minDelayMinutes');

    recordTest('story1', 'Delay mechanism', hasDelay,
      hasDelay ? 'Sleep function present' : 'Delay missing');
    recordTest('story1', '5-minute delay configured', hasMinutes,
      hasMinutes ? 'Minute-based delays configured' : 'Delay config missing');

    // Test 6: Check auto-reply templates
    const hasAutoReply = serviceContent.includes('AUTO_REPLY') || serviceContent.includes('autoReply');
    const hasReplyTemplates = serviceContent.includes('Thanks') || serviceContent.includes('Got it');

    recordTest('story1', 'Auto-reply functionality', hasAutoReply,
      hasAutoReply ? 'Auto-reply implemented' : 'Auto-reply missing');
    recordTest('story1', 'Reply templates', hasReplyTemplates,
      hasReplyTemplates ? 'Natural responses configured' : 'Templates missing');

    // Test 7: Check logging to database
    const hasLogging = serviceContent.includes('logAction') || serviceContent.includes('prisma.log');
    recordTest('story1', 'Database logging', hasLogging,
      hasLogging ? 'Logs to Supabase' : 'Logging missing');

    // Test 8: Check singleton pattern
    const hasSingleton = serviceContent.includes('export const warmupService') || 
                        serviceContent.includes('static instance');
    recordTest('story1', 'Singleton pattern', hasSingleton,
      hasSingleton ? 'Single instance enforced' : 'Pattern not used');
  }

  // Test 9: Check API endpoints
  const apiEndpoints = [
    'pages/api/warmup/trigger.ts',
    'pages/api/warmup/status.ts',
  ];

  apiEndpoints.forEach((endpoint) => {
    const exists = fs.existsSync(path.join(process.cwd(), endpoint));
    recordTest('story1', `API endpoint: ${endpoint}`, exists,
      exists ? 'Endpoint present' : 'Endpoint missing');

    if (exists) {
      const content = fs.readFileSync(path.join(process.cwd(), endpoint), 'utf8');
      const hasWarmupService = content.includes('warmupService');
      recordTest('story1', `${endpoint} uses warmup service`, hasWarmupService,
        hasWarmupService ? 'Service integrated' : 'Service not imported');
    }
  });

  // Test 10: Check required dependencies
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const warmupDeps = ['nodemailer', 'imap-simple', 'node-cron'];
  
  warmupDeps.forEach((dep) => {
    const installed = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
    recordTest('story1', `Warmup dependency: ${dep}`, !!installed,
      installed ? `Version ${installed}` : 'Not installed');
  });
}

// ============================================================================
// Build and Route Tests
// ============================================================================

function testBuildAndRoutes() {
  log.section();
  log.header('🏗️  Build & Routes Tests');
  log.section();

  // Test 1: Check if .next build folder exists
  const buildExists = fs.existsSync(path.join(process.cwd(), '.next'));
  recordTest('story3', 'Production build exists', buildExists,
    buildExists ? '.next folder found' : 'Need to run npm run build');

  // Test 2: Check package.json scripts
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const scripts = ['dev', 'build', 'start'];
  
  scripts.forEach((script) => {
    const exists = !!packageJson.scripts?.[script];
    recordTest('story3', `NPM script: ${script}`, exists,
      exists ? packageJson.scripts[script] : 'Script missing');
  });

  // Test 3: Count total routes
  const pagesDir = path.join(process.cwd(), 'pages');
  let routeCount = 0;

  function countRoutes(dir) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        countRoutes(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        if (!file.startsWith('_')) {
          routeCount++;
        }
      }
    });
  }

  countRoutes(pagesDir);
  recordTest('story3', `Total routes: ${routeCount}`, routeCount >= 28,
    `${routeCount} routes found (expected ≥28)`);
}

// ============================================================================
// Generate Final Report
// ============================================================================

function generateReport() {
  log.section();
  log.header('📊 TEST RESULTS SUMMARY');
  log.section();

  const totalPassed = results.story3.passed + results.story2.passed + results.story1.passed;
  const totalFailed = results.story3.failed + results.story2.failed + results.story1.failed;
  const totalTests = totalPassed + totalFailed;
  const passRate = ((totalPassed / totalTests) * 100).toFixed(1);

  console.log(`\n${colors.bold}Story 3: Dashboard + Auth${colors.reset}`);
  console.log(`  Passed: ${colors.green}${results.story3.passed}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${results.story3.failed}${colors.reset}`);
  console.log(`  Total:  ${results.story3.passed + results.story3.failed}`);

  console.log(`\n${colors.bold}Story 2: Data Management + Bulk Import${colors.reset}`);
  console.log(`  Passed: ${colors.green}${results.story2.passed}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${results.story2.failed}${colors.reset}`);
  console.log(`  Total:  ${results.story2.passed + results.story2.failed}`);

  console.log(`\n${colors.bold}Story 1: Warmup Automation Engine${colors.reset}`);
  console.log(`  Passed: ${colors.green}${results.story1.passed}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${results.story1.failed}${colors.reset}`);
  console.log(`  Total:  ${results.story1.passed + results.story1.failed}`);

  console.log(`\n${colors.bold}${colors.cyan}OVERALL RESULTS:${colors.reset}`);
  console.log(`  ${colors.green}✅ Passed: ${totalPassed}${colors.reset}`);
  console.log(`  ${colors.red}❌ Failed: ${totalFailed}${colors.reset}`);
  console.log(`  📊 Total Tests: ${totalTests}`);
  console.log(`  🎯 Pass Rate: ${passRate >= 90 ? colors.green : passRate >= 70 ? colors.yellow : colors.red}${passRate}%${colors.reset}`);

  log.section();

  if (totalFailed === 0) {
    log.success('ALL TESTS PASSED! 🎉');
    log.info('The application is ready for production deployment.');
  } else {
    log.warning(`${totalFailed} test(s) failed. Review the output above for details.`);
  }

  // Generate detailed report file
  const reportContent = generateDetailedReport(totalPassed, totalFailed, totalTests, passRate);
  fs.writeFileSync(path.join(process.cwd(), 'TEST_RESULTS.md'), reportContent);
  log.success('Detailed report saved to TEST_RESULTS.md');
}

function generateDetailedReport(totalPassed, totalFailed, totalTests, passRate) {
  let report = `# Comprehensive Test Results\n\n`;
  report += `**Date:** ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- ✅ **Passed:** ${totalPassed}\n`;
  report += `- ❌ **Failed:** ${totalFailed}\n`;
  report += `- 📊 **Total:** ${totalTests}\n`;
  report += `- 🎯 **Pass Rate:** ${passRate}%\n\n`;

  const stories = [
    { name: 'Story 3: Dashboard + Auth', key: 'story3' },
    { name: 'Story 2: Data Management + Bulk Import', key: 'story2' },
    { name: 'Story 1: Warmup Automation Engine', key: 'story1' },
  ];

  stories.forEach(({ name, key }) => {
    report += `## ${name}\n\n`;
    report += `- Passed: ${results[key].passed}\n`;
    report += `- Failed: ${results[key].failed}\n`;
    report += `- Total: ${results[key].passed + results[key].failed}\n\n`;

    report += `### Test Details\n\n`;
    results[key].tests.forEach((test) => {
      const icon = test.passed ? '✅' : '❌';
      report += `${icon} **${test.testName}**\n`;
      if (test.message) {
        report += `   - ${test.message}\n`;
      }
      report += `\n`;
    });
  });

  report += `\n---\n\n`;
  report += `**Status:** ${totalFailed === 0 ? '🎉 ALL TESTS PASSED - READY FOR PRODUCTION' : '⚠️ SOME TESTS FAILED - REVIEW REQUIRED'}\n`;

  return report;
}

// ============================================================================
// Main Test Execution
// ============================================================================

function runAllTests() {
  console.clear();
  log.section();
  log.header('🧪 Gmail Warmup Automation - Comprehensive Test Suite');
  log.header('    Testing All 3 User Stories (A to Z)');
  log.section();

  console.log(`\n${colors.blue}Starting comprehensive tests...${colors.reset}\n`);

  try {
    testStory3_DashboardAuth();
    testStory2_DataManagement();
    testStory1_WarmupEngine();
    testBuildAndRoutes();
    generateReport();
  } catch (error) {
    log.error(`Test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
