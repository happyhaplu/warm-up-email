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

// 50 realistic reply templates - natural responses
const replyTemplates = [
  { text: "Thanks for reaching out! That sounds great to me. I'm free Tuesday afternoon anytime after two. Looking forward to catching up with you soon!" },
  { text: "Hey! Yes, I did get a chance to review it. Overall looks good! I have a couple of small suggestions. Want to hop on a quick call to discuss?" },
  { text: "Coffee sounds perfect! Next week works well for me. How about Wednesday morning around ten? Let me know if that works for your schedule too." },
  { text: "Really interesting approach! I like where you're going with this. Have you considered the implementation timeline? Happy to share more thoughts if helpful." },
  { text: "Thanks for the update! Everything sounds like it's progressing nicely. Keep me posted on any developments. Let me know if you need anything from my end." },
  { text: "Thursday afternoon works perfectly for me! How about three o'clock? We can meet at my office or anywhere else that's convenient for you." },
  { text: "So glad you enjoyed it! I thought it would be right up your alley. Let me know if you want any other recommendations along those lines." },
  { text: "Of course, happy to help! What do you need? Feel free to send over the details whenever you're ready and I'll take a look at it." },
  { text: "Things have been going really well, thanks for asking! Been busy but in a good way. How about you? What have you been working on lately?" },
  { text: "That's really thoughtful of you to share! I'll definitely check it out. Always appreciate when you send things my way. Thanks for thinking of me!" },
  { text: "Wednesday afternoon works great for me! Same time as before should be fine. Looking forward to it and thanks for letting me know about the change." },
  { text: "Everything is moving along smoothly, thanks for checking in! Made some good progress this week. Will have a full update ready for our next meeting." },
  { text: "I really enjoyed our conversation too! Your perspective was super valuable. Let's definitely continue this discussion soon. Talk to you later!" },
  { text: "I'd be happy to help! I have some time Thursday morning if that works. Just send over what you're working on and we can discuss it." },
  { text: "Thanks for getting back to me! A quick call would be great. I'm available tomorrow afternoon or Friday morning. Let me know what works better." },
  { text: "It was great seeing you too! Next week is a bit busy, but the week after looks good. How's your schedule looking around that time?" },
  { text: "No problem at all! Take the time you need to get it right. Quality is more important than rushing. Just keep me updated on the progress." },
  { text: "That's an interesting idea! I think it could definitely work with a few adjustments. Would love to discuss this further when you have time." },
  { text: "Wow, that is really cool! Thanks for sharing it with me. I can see why you thought I'd be interested. Going to explore this more later." },
  { text: "Sure, happy to clarify! Basically what I meant was that we should prioritize the first phase before moving forward. Does that make sense now?" },
  { text: "I'd be honored to share my thoughts! I'm free most of this week. When works best for you to chat? Looking forward to hearing more about it." },
  { text: "Those were good times! Hope you're doing well too. Things on my end have been busy but good. We should definitely catch up properly soon!" },
  { text: "Yes, still works perfectly for me! See you Tuesday at three. Let me know if you need directions or if anything changes before then." },
  { text: "My pleasure! Really glad the introduction was helpful. They're great to work with. Let me know if there's anything else I can help connect you with." },
  { text: "Of course! Send it over whenever you're ready and I'll take a look. Always happy to give you my honest feedback on things like this." },
  { text: "It went really well, thanks for asking! Better than expected actually. Would love to tell you more about it when we catch up next week." },
  { text: "Yes, definitely still happening! No need to prepare anything specific. Just come ready to brainstorm and share ideas. See you then!" },
  { text: "That actually makes a lot of sense! I think you're onto something there. Let's explore this idea more when we meet up next time." },
  { text: "Yep, still on! Thursday afternoon is perfect. Looking forward to it. See you then and we can dive into everything we need to cover." },
  { text: "Thanks for keeping me in the loop! Sounds like everything is going in the right direction. Excited to hear more details when we connect next week." },
  { text: "No worries at all! Friday works fine for me. How about two in the afternoon? Just let me know if that time works for your schedule." },
  { text: "This is super useful, thanks! Perfect timing actually as I was just looking into this exact thing. Really appreciate you thinking of me!" },
  { text: "Sure, no problem! An hour later works fine for me. Looking forward to connecting later today. Thanks for the heads up about the change." },
  { text: "Got it, thanks for the reminder! See you tomorrow at ten. I have the address saved. Looking forward to our meeting!" },
  { text: "Things are going pretty well over here! Definitely been a busy month. Would love to hear your updates too. Let's find time to catch up soon." },
  { text: "Glad I could help! Always happy to assist when I can. Feel free to reach out anytime you need something. That's what friends are for!" },
  { text: "Just bring yourself! We'll go through everything together during the meeting. Looking forward to our discussion tomorrow. See you then!" },
  { text: "That's great to hear! Sounds like it's coming together nicely. Keep up the good work and let me know if you need any feedback along the way." },
  { text: "I did see it! Really interesting stuff. I think it could be really applicable to my current project. Let's discuss more when we talk next." },
  { text: "I'd definitely be interested! Next month is looking pretty open for me right now. Let's talk more about what you have in mind. Sounds exciting!" },
  { text: "No rush at all! Take your time to think it through. I appreciate you being thorough about it. Looking forward to hearing back from you tomorrow." },
  { text: "Next couple weeks are pretty flexible for me! I can do most afternoons. What days work best for you? Let's find a time that fits both schedules." },
  { text: "Thanks for letting me know! Appreciate the heads up. Is there anything I should be aware of or doing on my end regarding this?" },
  { text: "Project is going great, thanks for checking! Everything is on schedule and the team is doing awesome work. I'll update you more at our next meeting." },
  { text: "No problem at all! Life happens and I totally understand. Glad things are back on track now. Looking forward to moving forward together!" },
  { text: "I have been thinking about it! Have some initial thoughts I'd like to share. Are you free for a call sometime this week to discuss further?" },
  { text: "Me too! Really excited for our conversation. I've been jotting down some ideas as well. Going to be a productive meeting for sure. See you!" },
  { text: "Thanks, everything is going well! Hope the same for you. Would love to catch up soon. How about next week sometime? Let me know what works!" },
  { text: "Absolutely! I have availability Wednesday or Thursday this week. Either afternoon would work well for me. Let me know what you prefer!" },
  { text: "Great, thanks for getting back to me! I have some thoughts too. How about tomorrow afternoon? We can discuss everything in detail then." }
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
