import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from './supabase';
import prisma from './prisma';
import { verifyToken } from './jwt';

export interface ApiAuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

// Temporary admin credentials
export const TEMP_ADMIN = {
  email: 'happy.outcraftly@zohomail.in',
  password: 'System@123321',
};

/**
 * Authenticate API request
 * Supports: JWT token (cookie), Supabase auth (header), or user-id header for session-based auth
 */
export async function authenticateApiRequest(
  req: NextApiRequest
): Promise<{ user: ApiAuthUser | null; error?: string }> {
  try {
    // Method 1: Check for JWT token in cookie (admin or user)
    const jwtToken = req.cookies['auth-token'];
    if (jwtToken) {
      const payload = verifyToken(jwtToken);
      if (payload) {
        // Verify user exists in database
        const dbUser = await prisma.user.findUnique({
          where: { id: payload.id },
        });

        if (dbUser) {
          return {
            user: {
              id: dbUser.id,
              email: dbUser.email,
              role: dbUser.role as 'user' | 'admin',
            },
          };
        }
        // If user doesn't exist, continue to other auth methods
        console.warn(`JWT token user ${payload.email} (${payload.id}) not found in database, trying other auth methods`);
      }
    }

    // Method 2: Check for user-id header (from frontend session)
    const userId = req.headers['x-user-id'] as string;
    const userEmail = req.headers['x-user-email'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    if (userId && userEmail) {
      // Verify user exists in database
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (dbUser) {
        return {
          user: {
            id: dbUser.id,
            email: dbUser.email,
            role: dbUser.role as 'user' | 'admin',
          },
        };
      }
    }

    // Method 3: Check Supabase auth token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        // Get or create user in database
        // First try to find by Supabase ID
        let dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });

        if (!dbUser) {
          // Check if user exists by email with different ID
          const existingUserByEmail = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (existingUserByEmail) {
            // User exists with different ID
            console.warn(`User ${user.email} exists with different ID. Supabase: ${user.id}, DB: ${existingUserByEmail.id}`);
            dbUser = existingUserByEmail;
          } else {
            // Create new user with Supabase ID
            dbUser = await prisma.user.create({
              data: {
                id: user.id,
                email: user.email!,
                role: 'user',
              },
            });
          }
        }

        return {
          user: {
            id: dbUser.id,
            email: dbUser.email,
            role: dbUser.role as 'user' | 'admin',
          },
        };
      }
    }

    // Method 4: Fallback - Check legacy admin cookie
    const adminToken = req.cookies['admin-session'];
    if (adminToken === 'temp-admin-token') {
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
        user: {
          id: adminUser.id,
          email: adminUser.email,
          role: 'admin',
        },
      };
    }

    return { user: null, error: 'No valid authentication found' };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Require authentication middleware
 */
export function requireAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, user: ApiAuthUser) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { user, error } = await authenticateApiRequest(req);

    if (!user) {
      return res.status(401).json({ error: error || 'Unauthorized' });
    }

    return handler(req, res, user);
  };
}

/**
 * Require admin authentication middleware
 */
export function requireAdmin(
  handler: (req: NextApiRequest, res: NextApiResponse, user: ApiAuthUser) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { user, error } = await authenticateApiRequest(req);

    if (!user) {
      return res.status(401).json({ error: error || 'Unauthorized' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    return handler(req, res, user);
  };
}
