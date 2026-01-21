/**
 * Script to fix user ID mismatches between Supabase and local database
 * Run this to clean up any orphaned accounts and fix foreign key issues
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Checking for user ID mismatches...\n');

  try {
    // Get all users from local database
    const dbUsers = await prisma.user.findMany();
    console.log(`Found ${dbUsers.length} users in local database`);

    // Get all accounts
    const accounts = await prisma.account.findMany();
    console.log(`Found ${accounts.length} accounts\n`);

    // Check for orphaned accounts (accounts with userId that doesn't exist)
    const orphanedAccounts = accounts.filter(
      (account: any) => account.userId && !dbUsers.find((user: any) => user.id === account.userId)
    );

    if (orphanedAccounts.length > 0) {
      console.log(`⚠️  Found ${orphanedAccounts.length} orphaned accounts:`);
      orphanedAccounts.forEach((account: any) => {
        console.log(`  - Account ${account.email} (ID: ${account.id}) references non-existent user ${account.userId}`);
      });
      console.log();

      // Fix orphaned accounts by setting userId to null
      console.log('🔧 Fixing orphaned accounts by removing invalid user references...');
      for (const account of orphanedAccounts) {
        await prisma.account.update({
          where: { id: account.id },
          data: { userId: null },
        });
        console.log(`  ✓ Fixed account ${account.email}`);
      }
      console.log();
    } else {
      console.log('✓ No orphaned accounts found\n');
    }

    // Check for accounts without userId
    const accountsWithoutUser = accounts.filter((account: any) => !account.userId);
    if (accountsWithoutUser.length > 0) {
      console.log(`ℹ️  Found ${accountsWithoutUser.length} accounts without user assignment`);
      accountsWithoutUser.forEach((account: any) => {
        console.log(`  - ${account.email} (ID: ${account.id})`);
      });
      console.log();
    }

    console.log('✅ Database cleanup complete!');
    console.log('\nNext steps:');
    console.log('1. Make sure your Supabase credentials are correct in .env');
    console.log('2. Users will be automatically created when they log in');
    console.log('3. Accounts can then be associated with users\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
