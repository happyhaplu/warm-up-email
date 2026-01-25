import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { verifyAdminToken } from '../../../../lib/api-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const adminUser = await verifyAdminToken(req);
    if (!adminUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, status } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Validate status
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "active" or "suspended"' });
    }

    // Prevent self-suspension
    if (id === adminUser.id) {
      return res.status(400).json({ error: 'Cannot change your own account status' });
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
    });

    // Log the action
    const action = status === 'suspended' ? 'user_suspended' : 'user_reactivated';
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action,
        targetId: id,
        details: JSON.stringify({
          newStatus: status,
          targetUser: updatedUser.email,
          admin: adminUser.email,
        }),
      },
    });

    return res.status(200).json({
      message: `User ${status === 'suspended' ? 'suspended' : 'reactivated'} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json({ error: 'Failed to update user status' });
  }
}
