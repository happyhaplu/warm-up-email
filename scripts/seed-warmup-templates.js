const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 50 realistic send templates - natural conversations
const sendTemplates = [
  { subject: "Quick question about your schedule", body: "Hey! Hope you're doing well. I was wondering if you're free next Tuesday afternoon? Would love to catch up and hear what you've been working on lately." },
  { subject: "Following up from last week", body: "Hi there! Just wanted to check in after our last conversation. Did you get a chance to look into that thing we discussed? Let me know your thoughts!" },
  { subject: "Coffee sometime?", body: "Hey! I've been meaning to reach out. Would you be interested in grabbing coffee next week? Would be great to reconnect and exchange ideas on some projects." },
  { subject: "Thoughts on this?", body: "Hi! I came across something interesting and immediately thought of you. What do you think about this approach? Would love to get your perspective when you have a moment." },
  { subject: "Quick update", body: "Hey! Just wanted to give you a quick heads up about the changes we discussed. Everything is moving along smoothly. Let me know if you need any additional details." },
  { subject: "Are you available?", body: "Hi! Hope your week is going well. I wanted to see if you might have some time this Thursday or Friday to chat briefly about that project idea?" },
  { subject: "Thanks for the recommendation", body: "Hey! I finally got around to checking out what you recommended, and you were absolutely right. Thanks so much for thinking of me! Really appreciate it and wanted to share." },
  { subject: "Quick favor to ask", body: "Hi there! I hope this finds you well. I was wondering if you could help me out with something quick when you get a chance? Nothing urgent, just need your input." },
  { subject: "How have you been?", body: "Hey! It's been a while since we last connected. How have things been going on your end? Would love to hear what you've been up to these days." },
  { subject: "Saw this and thought of you", body: "Hi! I was reading something earlier today and it reminded me of our conversation from last month. Thought you might find it interesting too. What do you think?" },
  { subject: "Meeting rescheduled", body: "Hey! Just a heads up that I had to move our meeting to next week instead. Does Wednesday afternoon still work for you, or should we find another time?" },
  { subject: "Quick check-in", body: "Hi! Hope everything is going well with you. Just wanted to touch base and see how things are progressing with your recent project. Any updates to share?" },
  { subject: "Thanks for yesterday", body: "Hey! Really appreciated you taking the time to chat yesterday. Your insights were super helpful and gave me a lot to think about. Looking forward to continuing the conversation!" },
  { subject: "Can you help with this?", body: "Hi there! I'm working on something and could really use your expertise. Do you have a few minutes sometime this week to help me think through some ideas?" },
  { subject: "Following up on your email", body: "Hey! Thanks for sending that over. I've had a chance to review everything and have a few questions. Would you be available for a quick call to discuss?" },
  { subject: "Great seeing you last week", body: "Hi! It was really nice running into you at the event last week. We should definitely find time to catch up properly soon. Are you free anytime next week?" },
  { subject: "Update on the timeline", body: "Hey! Just wanted to let you know that the timeline we discussed might need a slight adjustment. Everything is still on track, just need a bit more time for quality." },
  { subject: "What do you think about this idea?", body: "Hi! I've been thinking about something and wanted to run it by you. Do you think this could work for our situation? Would love your honest feedback when convenient." },
  { subject: "Sharing something interesting", body: "Hey! I just discovered something pretty cool that I think you'd appreciate. It's related to what we were discussing before. Let me know what you think about it!" },
  { subject: "Quick question for you", body: "Hi there! Hope you're having a good week. I have a quick question about something you mentioned before. When you have a moment, could you clarify that for me?" },
  { subject: "Need your advice", body: "Hey! I'm trying to make a decision about something and I really value your opinion. Would you mind if I picked your brain about it sometime this week?" },
  { subject: "This reminded me of you", body: "Hi! I was just going through some old notes and came across something we talked about months ago. Made me smile and thought I'd reach out. How are things?" },
  { subject: "Confirming our plans", body: "Hey! Just wanted to make sure we're still on for next Tuesday at three. Looking forward to it! Let me know if anything changes on your end." },
  { subject: "Thanks for the intro", body: "Hi! I really appreciate you connecting me with your colleague. Had a great conversation with them yesterday and wanted to thank you for making that introduction happen." },
  { subject: "Quick favor if you have time", body: "Hey! I know you're busy, but if you have five minutes, could you take a look at something for me? Your perspective would be really valuable here." },
  { subject: "How did it go?", body: "Hi there! I've been curious to hear how your presentation went yesterday. Hope it was successful! Let me know when you get a chance to debrief about it." },
  { subject: "Checking in about next week", body: "Hey! Just wanted to confirm our meeting for next week is still happening. I've been looking forward to it. Should I prepare anything specific beforehand?" },
  { subject: "Random thought to share", body: "Hi! I had a random thought today that I wanted to share with you. It's related to what we were discussing before. Let me know if this makes sense!" },
  { subject: "Are we still on?", body: "Hey! Just making sure we're still meeting on Thursday afternoon. I blocked out the time on my calendar and wanted to double check it works for you too." },
  { subject: "Quick update for you", body: "Hi there! Wanted to give you a quick update on how things are progressing. Everything is moving forward nicely. Will share more details when we connect next week." },
  { subject: "Need to reschedule", body: "Hey! Unfortunately something came up and I need to move our meeting. Are you available any time on Friday instead? Sorry for the last minute change!" },
  { subject: "Thought you'd find this useful", body: "Hi! I came across something that I think would be perfect for what you're working on. Thought I'd pass it along. Let me know if it helps!" },
  { subject: "Can we push this back?", body: "Hey! Would it be possible to push our call back by an hour? Something unexpected came up but I still want to make sure we connect today if possible." },
  { subject: "Quick reminder", body: "Hi there! Just a friendly reminder about our meeting tomorrow morning at ten. Looking forward to catching up! Let me know if you need directions to the location." },
  { subject: "How's everything going?", body: "Hey! Just wanted to check in and see how everything is going with you. It's been a busy month on my end. Would love to hear your updates soon!" },
  { subject: "Thanks for the help", body: "Hi! I wanted to thank you for helping me out with that issue yesterday. Your solution worked perfectly and saved me a lot of time. Really appreciate your expertise!" },
  { subject: "Quick question before we meet", body: "Hey! Before our meeting tomorrow, I had a quick question. Should I bring anything specific or prepare anything in advance? Just want to make sure I'm ready." },
  { subject: "Sharing an update", body: "Hi there! Wanted to share a quick update with you about what we discussed. Things are progressing well and I'm pretty excited about how it's turning out so far." },
  { subject: "Did you see this?", body: "Hey! Did you happen to see what was shared in the group yesterday? I thought it was really relevant to what you're doing. Curious to hear your take on it." },
  { subject: "Making plans for next month", body: "Hi! I'm starting to think about plans for next month and wanted to see if you'd be interested in collaborating on something together. What's your schedule looking like?" },
  { subject: "Appreciate your patience", body: "Hey! Thanks for being patient while I get back to you on this. I needed some time to think it through properly. Should have an answer for you by tomorrow." },
  { subject: "What's your availability?", body: "Hi there! I wanted to set up some time to chat with you about a few things. What does your calendar look like over the next couple of weeks?" },
  { subject: "Quick heads up", body: "Hey! Just wanted to give you a quick heads up about something that came up. It's nothing urgent, but thought you should know about it sooner rather than later." },
  { subject: "How's the project going?", body: "Hi! I've been meaning to check in on how the project is coming along. Hope everything is going smoothly! Let me know if there's anything I can help with." },
  { subject: "Thanks for understanding", body: "Hey! I really appreciate your understanding about the delay. Things got a bit hectic on my end but I'm back on track now. Should be good to go soon!" },
  { subject: "Circling back on this", body: "Hi there! I wanted to circle back on what we discussed last week. Have you had any time to think about it? Would love to hear your thoughts when convenient." },
  { subject: "Looking forward to it", body: "Hey! Just wanted to say I'm really looking forward to our conversation next week. Been thinking about some ideas to share with you. See you then!" },
  { subject: "Hope you're doing well", body: "Hi! Hope everything is going well on your end. Just wanted to reach out and say hello. Let me know if you want to catch up sometime soon!" },
  { subject: "Can we sync up?", body: "Hey! Would love to sync up with you sometime this week if you have availability. There are a few things I'd like to discuss and get your input on." },
  { subject: "Got your message", body: "Hi there! Thanks for your message yesterday. I've been thinking about what you said and have some thoughts to share. When would be a good time to talk?" }
];

// 50 realistic reply templates - short and natural
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

async function main() {
  console.log('🌱 Starting to seed warmup templates...');

  try {
    // Clear existing templates
    console.log('🗑️  Clearing existing templates...');
    await prisma.sendTemplate.deleteMany({});
    await prisma.replyTemplate.deleteMany({});

    // Insert send templates
    console.log('📧 Inserting 50 send templates...');
    for (const template of sendTemplates) {
      await prisma.sendTemplate.create({
        data: template,
      });
    }
    console.log('✅ Send templates inserted successfully!');

    // Insert reply templates
    console.log('💬 Inserting 50 reply templates...');
    for (const template of replyTemplates) {
      await prisma.replyTemplate.create({
        data: template,
      });
    }
    console.log('✅ Reply templates inserted successfully!');

    // Verify counts
    const sendCount = await prisma.sendTemplate.count();
    const replyCount = await prisma.replyTemplate.count();

    console.log('\n📊 Template Summary:');
    console.log(`   Send Templates: ${sendCount}`);
    console.log(`   Reply Templates: ${replyCount}`);
    console.log('\n🎉 Warmup templates seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
