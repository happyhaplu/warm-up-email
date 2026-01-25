import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { supabase } from './supabase';
import prisma from './prisma';

export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Only use router on client-side to avoid SSR/SSG issues
  const router = typeof window !== 'undefined' ? useRouter() : null;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize auth state from Supabase
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Clear any old admin cookies that might conflict
        document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'admin-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Get user role from database
          const dbUser = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          }).then(r => r.json());

          if (dbUser.success) {
            setUser(dbUser.user);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const dbUser = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }).then(r => r.json());

        if (dbUser.success) {
          setUser(dbUser.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Login failed' };
      }

      // Get user role from database
      const dbUser = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`
        }
      }).then(r => r.json());

      if (!dbUser.success) {
        return { success: false, error: 'Failed to get user data' };
      }

      setUser(dbUser.user);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      if (router) {
        router.push('/login');
      } else if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    initialized,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function for authenticated fetch requests
export async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge existing headers if any
  if (options.headers) {
    const existingHeaders = options.headers as Record<string, string>;
    Object.assign(headers, existingHeaders);
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
