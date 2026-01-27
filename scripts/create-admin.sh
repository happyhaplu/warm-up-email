#!/bin/bash

# Create Admin User in Supabase Auth
# This syncs the PostgreSQL user with Supabase authentication

set -e

echo "=========================================="
echo "Creating Admin User in Supabase Auth"
echo "=========================================="

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  exit 1
fi

source .env

# Default admin credentials
ADMIN_EMAIL="${1:-happy.outcraftly@zohomail.in}"
ADMIN_PASSWORD="${2:-Admin@123}"

echo ""
echo "Creating user:"
echo "  Email: $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo ""

# Create user via Supabase
pnpm tsx -e "
import { supabaseAdmin } from './lib/supabase';
import prisma from './lib/prisma';

(async () => {
  try {
    const email = '$ADMIN_EMAIL';
    const password = '$ADMIN_PASSWORD';

    // Check if user exists in PostgreSQL
    let dbUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!dbUser) {
      // Create in PostgreSQL
      console.log('📝 Creating user in database...');
      dbUser = await prisma.user.create({
        data: {
          email,
          name: 'Admin User',
          role: 'admin',
          status: 'active',
          plan: {
            connect: { id: 1 } // Assume plan 1 exists
          }
        }
      });
      console.log('✅ User created in database');
    } else {
      console.log('✅ User already exists in database');
    }

    // Create in Supabase Auth
    console.log('📝 Creating user in Supabase Auth...');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        name: 'Admin User'
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ User already exists in Supabase Auth');
        console.log('');
        console.log('If you forgot your password, reset it at:');
        console.log('https://dcxnduxjczwzsxtitgjx.supabase.co/auth/v1/recover');
      } else {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
    } else {
      console.log('✅ User created in Supabase Auth');
    }

    console.log('');
    console.log('========================================');
    console.log('✅ Setup Complete!');
    console.log('========================================');
    console.log('');
    console.log('You can now login at:');
    console.log('http://localhost:3000/login');
    console.log('');
    console.log('Credentials:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
"

echo "Done!"
