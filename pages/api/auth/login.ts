import type { NextApiRequest, NextApiResponse } from 'next';

// Deprecated - login is now handled client-side via Supabase
// This endpoint kept for backward compatibility
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({
    message: 'Please use Supabase Auth directly from the client',
    success: false,
  });
}
