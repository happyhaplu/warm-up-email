import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Only admin can update templates
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Short, natural reply templates
    const replyTemplates = [
      { text: "Sounds good! Tuesday works for me." },
      { text: "Thanks! I'll take a look and get back to you." },
      { text: "Perfect! See you then." },
      { text: "Got it, thanks for the update!" },
      { text: "That works for me. Talk soon!" },
      { text: "Awesome, looking forward to it!" },
      { text: "Thanks so much! Really appreciate it." },
      { text: "Sure, happy to help!" },
      { text: "Things are good! How about you?" },
      { text: "Great idea! Let's do it." },
      { text: "No problem at all!" },
      { text: "Sounds like a plan!" },
      { text: "Will do, thanks!" },
      { text: "Appreciate you sharing this!" },
      { text: "Makes sense to me!" },
      { text: "I'm in! Count me in." },
      { text: "Thanks for thinking of me!" },
      { text: "That would be great, thanks!" },
      { text: "Absolutely! Works perfectly." },
      { text: "Got it, see you then!" },
      { text: "Good to know, thanks!" },
      { text: "I'm free! Let's do it." },
      { text: "Sounds perfect! Thanks again." },
      { text: "Really appreciate the help!" },
      { text: "That's awesome! Thanks for sharing." },
      { text: "Definitely! Let me know when." },
      { text: "Will do! Talk to you soon." },
      { text: "Thanks! This is super helpful." },
      { text: "Great, looking forward to catching up!" },
      { text: "Perfect timing! Thanks so much." },
      { text: "Noted! Thanks for letting me know." },
      { text: "Sounds good to me!" },
      { text: "I'd love to! Thanks!" },
      { text: "That works! See you soon." },
      { text: "Thanks for the heads up!" },
      { text: "Really appreciate this, thank you!" },
      { text: "Sure thing! Happy to do it." },
      { text: "Great! Talk to you later." },
      { text: "Awesome! Thanks for the update." },
      { text: "I'm good with that!" },
      { text: "Sounds great! Let's plan it." },
      { text: "Thanks! I'll check it out." },
      { text: "Perfect! Looking forward to it." },
      { text: "That would be amazing, thanks!" },
      { text: "Works for me! Thanks!" },
      { text: "Got it! Appreciate the info." },
      { text: "Love it! Let's make it happen." },
      { text: "Thanks! You're the best!" },
      { text: "All good! See you then." },
      { text: "Definitely interested! Tell me more." }
    ];

    // Clear existing templates
    await prisma.replyTemplate.deleteMany({});

    // Insert new templates
    await prisma.replyTemplate.createMany({
      data: replyTemplates,
    });

    const count = await prisma.replyTemplate.count();

    return res.status(200).json({ 
      message: 'Reply templates updated successfully',
      count 
    });
  } catch (error) {
    console.error('Error updating reply templates:', error);
    return res.status(500).json({ 
      error: 'Failed to update reply templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
