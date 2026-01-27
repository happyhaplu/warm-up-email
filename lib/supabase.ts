import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Make Supabase optional - only warn if missing, don't throw
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && 
  !supabaseAnonKey.includes('PLACEHOLDER') && !supabaseAnonKey.includes('placeholder') &&
  supabaseUrl.includes('supabase.co');

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn('Supabase not configured. Some features may be limited. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env');
}

// Create a dummy client if not configured (for build time)
const dummyClient = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
    getSession: async () => ({ data: { session: null }, error: new Error('Supabase not configured') }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
} as any;

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    })
  : dummyClient;

// Server-side client with service role (for admin operations)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const isAdminConfigured = isSupabaseConfigured && serviceRoleKey && !serviceRoleKey.includes('PLACEHOLDER');

export const supabaseAdmin = isAdminConfigured
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : dummyClient;

// Export configuration status
export const isSupabaseReady = isSupabaseConfigured;
export const isSupabaseAdminReady = isAdminConfigured;
