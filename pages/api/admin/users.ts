import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { verifyAdminToken } from '../../../lib/api-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify admin authentication
    const adminUser = await verifyAdminToken(req);
    if (!adminUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, adminUser);
      case 'PUT':
        return await handlePut(req, res, adminUser);
      case 'DELETE':
        return await handleDelete(req, res, adminUser);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in /api/admin/users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET - List all users
async function handleGet(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        planId: true,
        plan: {
          select: {
            id: true,
            name: true,
            displayName: true,
            mailboxLimit: true,
            dailyEmailLimit: true,
            monthlyEmailLimit: true,
            price: true,
          },
        },
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            accounts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format response with mailbox count
    const formattedUsers = users.map(user => ({
      ...user,
      mailboxCount: user._count.accounts,
      _count: undefined,
    }));

    return res.status(200).json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// PUT - Update user details
async function handlePut(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  try {
    const { id, name, email, role, planId } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Validate role
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Validate plan exists if provided
    if (planId !== undefined && planId !== null) {
      const planExists = await prisma.plan.findUnique({
        where: { id: parseInt(planId) },
      });

      if (!planExists) {
        return res.status(400).json({ error: 'Invalid plan ID' });
      }
    }

    // Check if email is already taken by another user
    if (email) {
      const existing = await prisma.user.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });

      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(planId !== undefined && { planId: planId ? parseInt(planId) : null }),
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'user_updated',
        targetId: id,
        details: JSON.stringify({
          changes: { name, email, role, planId },
          admin: adminUser.email,
        }),
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
}

// DELETE - Delete user and all mailboxes
async function handleDelete(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Prevent self-deletion
    if (id === adminUser.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Get user details before deletion
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            accounts: true,
          },
        },
      },
    });

    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (cascades to accounts due to schema)
    await prisma.user.delete({
      where: { id },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'user_deleted',
        targetId: id,
        details: JSON.stringify({
          deletedUser: userToDelete.email,
          mailboxesDeleted: userToDelete._count.accounts,
          admin: adminUser.email,
        }),
      },
    });

    return res.status(200).json({
      message: 'User deleted successfully',
      mailboxesDeleted: userToDelete._count.accounts,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}
