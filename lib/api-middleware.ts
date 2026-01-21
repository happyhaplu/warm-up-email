/**
 * API middleware for role-based access control
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, extractTokenFromCookie } from './jwt';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

type ApiHandler = (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void | NextApiResponse> | void | NextApiResponse;

/**
 * Middleware to require authentication
 */
export function requireAuth(handler: ApiHandler) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Get token from cookie
    const cookieHeader = req.headers.cookie || '';
    const token = extractTokenFromCookie(cookieHeader, 'auth-token');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    return handler(req, res);
  };
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(handler: ApiHandler) {
  return requireAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    return handler(req, res);
  });
}

/**
 * Middleware to require user role
 */
export function requireUser(handler: ApiHandler) {
  return requireAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.user?.role !== 'user' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'User access required' });
    }

    return handler(req, res);
  });
}
