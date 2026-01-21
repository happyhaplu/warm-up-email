import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all auth cookies
    const cookiesToClear = [
      'auth-token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
      'admin-session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
    ];
    
    res.setHeader('Set-Cookie', cookiesToClear);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookies even if Supabase logout fails
    res.setHeader('Set-Cookie', [
      'auth-token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
      'admin-session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
    ]);
    return res.status(200).json({ success: true });
  }
}
