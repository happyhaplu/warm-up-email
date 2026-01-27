import { supabase } from './supabase';
import prisma from './prisma';

// Temporary admin credentials (fallback if Supabase auth fails)
const TEMP_ADMIN = {
  email: 'happy.outcraftly@zohomail.in',
  password: 'System@123321',
};

export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

/**
 * Authenticate user with Supabase or temporary admin login
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  // Check for temporary admin login
  if (email === TEMP_ADMIN.email && password === TEMP_ADMIN.password) {
    // Create or get admin user in database
    let adminUser = await prisma.user.findUnique({
      where: { email: TEMP_ADMIN.email },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: TEMP_ADMIN.email,
          role: 'admin',
        },
      });
    }

    return {
      success: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: 'admin',
      },
    };
  }

  // Regular user authentication via Supabase
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Authentication failed' };
    }

    // Get or create user in database
    let dbUser = await prisma.user.findUnique({
      where: { email: data.user.email! },
    });

    if (!dbUser) {
      // Auto-assign admin role for specific emails
      const isAdmin = [
        'happy.outcraftly@zohomail.in',
        'admin@outcraftly.com',
      ].includes(data.user.email!);

      dbUser = await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email!,
          role: isAdmin ? 'admin' : 'user',
          status: 'active',
        },
      });
    }

    return {
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role as 'user' | 'admin',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Sign up new user
 */
export async function signUpUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Create user in DB immediately if signup successful
    if (data.user) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.user.email! }
      });

      if (!existingUser) {
        // Auto-assign admin role for specific emails
        const isAdmin = [
          'happy.outcraftly@zohomail.in',
          'admin@outcraftly.com',
        ].includes(data.user.email!);

        await prisma.user.create({
          data: {
            id: data.user.id,
            email: data.user.email!,
            role: isAdmin ? 'admin' : 'user',
            status: 'active',
          },
        });
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign up failed',
    };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // Check Supabase session
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email! },
      });

      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role as 'user' | 'admin',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === 'admin';
  } catch (error) {
    return false;
  }
}

/**
 * Sign out user
 */
export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}
