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
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res, adminUser);
      case 'PUT':
        return await handlePut(req, res, adminUser);
      case 'DELETE':
        return await handleDelete(req, res, adminUser);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in /api/admin/plans:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET - List all plans
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const plans = await prisma.plan.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        mailboxLimit: 'asc',
      },
    });

    const formattedPlans = plans.map(plan => ({
      ...plan,
      userCount: plan._count.users,
      features: plan.features ? JSON.parse(plan.features) : [],
      _count: undefined,
    }));

    return res.status(200).json(formattedPlans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
}

// POST - Create new plan
async function handlePost(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  try {
    const {
      name,
      displayName,
      description,
      mailboxLimit,
      dailyEmailLimit,
      monthlyEmailLimit,
      price,
      features,
      isActive
    } = req.body;

    if (!name || !displayName || mailboxLimit === undefined || dailyEmailLimit === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if plan with this name already exists
    const existing = await prisma.plan.findUnique({
      where: { name },
    });

    if (existing) {
      return res.status(400).json({ error: 'Plan with this name already exists' });
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        displayName,
        description,
        mailboxLimit: parseInt(mailboxLimit),
        dailyEmailLimit: parseInt(dailyEmailLimit),
        monthlyEmailLimit: parseInt(monthlyEmailLimit || 0),
        price: parseFloat(price || 0),
        features: features ? JSON.stringify(features) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'plan_created',
        targetId: plan.id.toString(),
        details: JSON.stringify({
          planName: plan.displayName,
          admin: adminUser.email,
        }),
      },
    });

    return res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    return res.status(500).json({ error: 'Failed to create plan' });
  }
}

// PUT - Update plan
async function handlePut(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  try {
    const {
      id,
      displayName,
      description,
      mailboxLimit,
      dailyEmailLimit,
      monthlyEmailLimit,
      price,
      features,
      isActive
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (mailboxLimit !== undefined) updateData.mailboxLimit = parseInt(mailboxLimit);
    if (dailyEmailLimit !== undefined) updateData.dailyEmailLimit = parseInt(dailyEmailLimit);
    if (monthlyEmailLimit !== undefined) updateData.monthlyEmailLimit = parseInt(monthlyEmailLimit);
    if (price !== undefined) updateData.price = parseFloat(price);
    if (features !== undefined) updateData.features = JSON.stringify(features);
    if (isActive !== undefined) updateData.isActive = isActive;

    const plan = await prisma.plan.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'plan_updated',
        targetId: plan.id.toString(),
        details: JSON.stringify({
          planName: plan.displayName,
          changes: updateData,
          admin: adminUser.email,
        }),
      },
    });

    return res.status(200).json(plan);
  } catch (error) {
    console.error('Error updating plan:', error);
    return res.status(500).json({ error: 'Failed to update plan' });
  }
}

// DELETE - Delete plan
async function handleDelete(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    // Check if any users are on this plan
    const usersOnPlan = await prisma.user.count({
      where: { planId: parseInt(id) },
    });

    if (usersOnPlan > 0) {
      return res.status(400).json({
        error: `Cannot delete plan. ${usersOnPlan} user(s) are currently on this plan.`,
      });
    }

    const plan = await prisma.plan.delete({
      where: { id: parseInt(id) },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'plan_deleted',
        targetId: plan.id.toString(),
        details: JSON.stringify({
          planName: plan.displayName,
          admin: adminUser.email,
        }),
      },
    });

    return res.status(200).json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return res.status(500).json({ error: 'Failed to delete plan' });
  }
}
