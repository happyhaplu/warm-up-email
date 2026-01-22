#!/usr/bin/env node
/**
 * Admin User Management Script
 * Usage:
 *   node scripts/manage-admin.js make <email>    # Make user an admin
 *   node scripts/manage-admin.js remove <email>  # Remove admin role
 *   node scripts/manage-admin.js list            # List all users with roles
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true }
  });
  
  console.log('\n📋 All Users:\n');
  users.forEach(user => {
    const roleIcon = user.role === 'admin' ? '👑' : '👤';
    console.log(`${roleIcon} ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log('');
  });
}

async function makeAdmin(email) {
  const updated = await prisma.user.update({
    where: { email },
    data: { role: 'admin' }
  });
  
  console.log('\n✅ User promoted to admin:');
  console.log(`   Email: ${updated.email}`);
  console.log(`   Role: ${updated.role}`);
  console.log('\n🚀 They can now login as admin at http://localhost:3000/login');
}

async function removeAdmin(email) {
  const updated = await prisma.user.update({
    where: { email },
    data: { role: 'user' }
  });
  
  console.log('\n✅ Admin role removed:');
  console.log(`   Email: ${updated.email}`);
  console.log(`   Role: ${updated.role}`);
}

async function main() {
  const command = process.argv[2];
  const email = process.argv[3];

  try {
    switch (command) {
      case 'list':
        await listUsers();
        break;
      
      case 'make':
        if (!email) {
          console.error('❌ Error: Email required');
          console.log('Usage: node scripts/manage-admin.js make <email>');
          process.exit(1);
        }
        await makeAdmin(email);
        break;
      
      case 'remove':
        if (!email) {
          console.error('❌ Error: Email required');
          console.log('Usage: node scripts/manage-admin.js remove <email>');
          process.exit(1);
        }
        await removeAdmin(email);
        break;
      
      default:
        console.log('Admin User Management\n');
        console.log('Usage:');
        console.log('  node scripts/manage-admin.js list           # List all users');
        console.log('  node scripts/manage-admin.js make <email>   # Make user an admin');
        console.log('  node scripts/manage-admin.js remove <email> # Remove admin role');
        process.exit(1);
    }
  } catch (error) {
    if (error.code === 'P2025') {
      console.error(`❌ Error: User with email '${email}' not found`);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
