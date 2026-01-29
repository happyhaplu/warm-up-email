#!/usr/bin/env node

/**
 * Test Warmup Status Display
 * Simulates what the admin frontend sees
 */

async function testWarmupStatus() {
  console.log('🔍 Testing Warmup Status API\n');
  console.log('='.repeat(80));

  try {
    const baseUrl = 'http://localhost:3000';
    
    // Test 1: Check current status
    console.log('\n📊 Test 1: Checking warmup status...');
    const statusRes = await fetch(`${baseUrl}/api/warmup/status`, {
      headers: {
        'Cookie': 'your-auth-cookie-here'  // Add your cookie if needed
      }
    });
    
    if (statusRes.ok) {
      const status = await statusRes.json();
      console.log('   Status Response:', JSON.stringify(status, null, 2));
      console.log(`   Running: ${status.running ? '✅ YES' : '❌ NO'}`);
      console.log(`   Last Run: ${status.lastRunTime || status.lastRun || 'Never'}`);
    } else {
      console.log(`   ❌ Failed to get status: ${statusRes.status}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Test Complete');
    console.log('\nWhat the admin page should show:');
    console.log('   - Status badge: "● Running" (green) or "○ Stopped" (gray)');
    console.log('   - Last run time if available');
    console.log('   - Auto-refreshes every 10 seconds');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Note: Make sure the dev server is running (pnpm dev)');
  }
}

testWarmupStatus().catch(console.error);
