#!/usr/bin/env node

/**
 * Test script to verify Outlook/Office365 mailbox connection
 * Usage: node scripts/test-outlook-connection.js
 */

const { testMailboxConnection } = require('../lib/connection-validator');

// Test credentials provided by user
const testMailbox = {
  email: 'aadarsh.outcraftlyai1@outlook.com',
  appPassword: 'sjsreixhqufxzarf',
  senderName: 'Aadarsh Singh',
  smtpHost: 'smtp-mail.outlook.com',
  smtpPort: 587,
  imapHost: 'outlook.office365.com',
  imapPort: 993
};

async function testConnection() {
  console.log('🔍 Testing Outlook/Office365 Mailbox Connection\n');
  console.log('Mailbox Details:');
  console.log(`  Email: ${testMailbox.email}`);
  console.log(`  SMTP: ${testMailbox.smtpHost}:${testMailbox.smtpPort}`);
  console.log(`  IMAP: ${testMailbox.imapHost}:${testMailbox.imapPort}`);
  console.log('\n⏳ Testing connection...\n');

  try {
    const result = await testMailboxConnection(
      testMailbox.email,
      testMailbox.appPassword,
      testMailbox.smtpHost,
      testMailbox.smtpPort,
      testMailbox.imapHost,
      testMailbox.imapPort
    );

    console.log('📊 Test Results:\n');
    console.log(`SMTP Status: ${result.smtp.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`  Message: ${result.smtp.message}`);
    console.log();
    console.log(`IMAP Status: ${result.imap.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`  Message: ${result.imap.message}`);
    console.log();
    console.log(`Overall: ${result.success ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED'}`);
    
    if (!result.success) {
      console.log(`\nError: ${result.error}`);
      console.log('\n📖 Please read OUTLOOK_SETUP_GUIDE.md for setup instructions');
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('\n📖 Please read OUTLOOK_SETUP_GUIDE.md for setup instructions');
    process.exit(1);
  }
}

// Run test
testConnection();
