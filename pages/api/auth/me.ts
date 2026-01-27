import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import prisma from '../../../lib/prisma';
import { initializeWarmupCron } from '../../../lib/warmup-auto-init';

// Initialize warmup cron on first API call (production only)
if (process.env.NODE_ENV === 'production') {
  initializeWarmupCron();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Get or create user in database with role
    // First try to find by Supabase ID
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      // Check if user exists by email with different ID
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: user.email! }
      });

      if (existingUserByEmail) {
        // User exists with different ID - this shouldn't happen in normal flow
        // Return the existing user but log a warning
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

    return res.status(200).json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
