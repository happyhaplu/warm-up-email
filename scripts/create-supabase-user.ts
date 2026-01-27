import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Load env vars and create client directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in .env');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  console.log('🔐 Creating admin user in Supabase Auth...\n');

  const email = 'happy.outcraftly@zohomail.in';
  const password = 'Admin@123';

  // Try to sign up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'http://localhost:3000/auth/callback',
      data: {
        role: 'admin',
      }
    }
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('✅ User already exists in Supabase Auth');
      console.log('\nYou can login at: http://localhost:3000/login');
      console.log('\nCredentials:');
      console.log('  Email:', email);
      console.log('  Password:', password);
      return;
    }
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('✅ User created in Supabase Auth!');
  console.log('User ID:', data.user?.id);
  console.log('\nYou can now login at: http://localhost:3000/login');
  console.log('\nCredentials:');
  console.log('  Email:', email);
  console.log('  Password:', password);
  console.log('\n⚠️  Check your email for verification link (or it may be auto-confirmed)');
}

createAdminUser().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
