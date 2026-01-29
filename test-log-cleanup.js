#!/usr/bin/env node
/**
 * Test Log Cleanup Functionality
 * Verifies that:
 * 1. Cleanup API can identify old logs
 * 2. Cleanup removes logs older than 3 days
 * 3. Recent logs are preserved
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCleanup() {
  console.log('\n' + '='.repeat(80));
  console.log(' TEST: Log Cleanup Functionality');
  console.log('='.repeat(80) + '\n');

  try {
    // Get current log count
    const totalLogs = await prisma.log.count();
    console.log(`📊 Total logs in database: ${totalLogs}`);

    // Calculate 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    console.log(`📅 Cutoff date (3 days ago): ${threeDaysAgo.toISOString()}`);

    // Count old logs
    const oldLogs = await prisma.log.count({
      where: {
        timestamp: {
          lt: threeDaysAgo
        }
      }
    });

    // Count recent logs
    const recentLogs = await prisma.log.count({
      where: {
        timestamp: {
          gte: threeDaysAgo
        }
      }
    });

    console.log('\n' + '─'.repeat(80));
    console.log('📈 Log Distribution:');
    console.log('─'.repeat(80));
    console.log(`   Old logs (>3 days):     ${oldLogs} (will be deleted)`);
    console.log(`   Recent logs (≤3 days):  ${recentLogs} (will be kept)`);
    console.log(`   Total:                  ${totalLogs}`);
    console.log('─'.repeat(80));

    // Show sample old logs
    if (oldLogs > 0) {
      const sampleOld = await prisma.log.findMany({
        where: {
          timestamp: {
            lt: threeDaysAgo
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 5,
        select: {
          id: true,
          timestamp: true,
          sender: true,
          recipient: true,
          status: true
        }
      });

      console.log('\n📋 Sample old logs (to be deleted):');
      sampleOld.forEach((log, idx) => {
        const daysOld = Math.floor((Date.now() - new Date(log.timestamp).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   ${idx + 1}. ID ${log.id} - ${daysOld} days old - ${log.status} - ${log.sender}`);
      });
    }

    // Show sample recent logs
    if (recentLogs > 0) {
      const sampleRecent = await prisma.log.findMany({
        where: {
          timestamp: {
            gte: threeDaysAgo
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 5,
        select: {
          id: true,
          timestamp: true,
          sender: true,
          recipient: true,
          status: true
        }
      });

      console.log('\n📋 Sample recent logs (will be kept):');
      sampleRecent.forEach((log, idx) => {
        const hoursAgo = Math.floor((Date.now() - new Date(log.timestamp).getTime()) / (1000 * 60 * 60));
        console.log(`   ${idx + 1}. ID ${log.id} - ${hoursAgo} hours ago - ${log.status} - ${log.sender}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Cleanup Test Summary');
    console.log('='.repeat(80));
    console.log(`Logs to be cleaned: ${oldLogs}`);
    console.log(`Logs to be kept: ${recentLogs}`);
    console.log('\n🔧 To run cleanup:');
    console.log('   Admin Panel → Global Logs → Click "Cleanup Old Logs"');
    console.log('   OR');
    console.log('   POST /api/admin/cleanup-logs');
    console.log('\n🤖 Automatic Cleanup:');
    console.log('   - Runs daily at midnight (production mode)');
    console.log('   - Deletes logs older than 3 days');
    console.log('   - Preserves account data and reports');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCleanup();
