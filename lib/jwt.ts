/**
 * JWT utilities for admin authentication
 * Uses a simple JWT implementation for server-side token management
 */

import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'email-warmup-secret-key-change-in-production';
const JWT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface JWTPayload {
  id: string;
  email: string;
  role: 'user' | 'admin';
  exp: number;
  iat: number;
}

/**
 * Base64URL encode
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Create HMAC signature
 */
function createSignature(data: string): string {
  return crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate JWT token
 */
export function generateToken(user: { id: string; email: string; role: 'user' | 'admin' }): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Date.now();
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + JWT_EXPIRY,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const expectedSignature = createSignature(`${encodedHeader}.${encodedPayload}`);
    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiry
    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from cookie string
 */
export function extractTokenFromCookie(cookieString: string, cookieName: string): string | null {
  if (!cookieString) return null;
  
  const cookies = cookieString.split(';').map(c => c.trim());
  const tokenCookie = cookies.find(c => c.startsWith(`${cookieName}=`));
  
  if (!tokenCookie) return null;
  
  return tokenCookie.split('=')[1];
}
