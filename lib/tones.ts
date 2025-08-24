// Writing tone styles for message generation
export type WritingTone = 
  | 'formal'
  | 'casual'
  | 'friendly'
  | 'intellectual'
  | 'confident'
  | 'conversational';

export interface ToneConfig {
  id: WritingTone;
  label: string;
  description: string;
  systemPrompt: string;
  exampleLinkedIn: string;
  exampleEmail: string;
}

export const WRITING_TONES: ToneConfig[] = [
  {
    id: 'formal',
    label: 'Formal',
    description: 'Professional and polished business tone',
    systemPrompt: 'Use formal, professional business language. Be respectful, direct, and maintain corporate etiquette throughout.',
    exampleLinkedIn: 'Hi Sarah, I hope this message finds you well. I came across your recent work in data analytics, and I was impressed by your contributions. I\'d love to connect and explore possible opportunities for collaboration.',
    exampleEmail: 'Subject: Partnership opportunity at TechCorp\n\nDear Sarah,\n\nI hope this message finds you well. I came across your recent work in data analytics, and I was impressed by your contributions to the field.\n\nI am a Software Engineer at InnovateLab, where we specialize in machine learning solutions. Given your expertise in data visualization, I believe there may be valuable opportunities for collaboration.\n\nI would welcome the opportunity to discuss how we might work together to drive mutual success.\n\nBest regards,\nAlex'
  },
  {
    id: 'casual',
    label: 'Casual & Friendly',
    description: 'Relaxed, approachable Gen-Z vibe',
    systemPrompt: 'Use casual, friendly language with a modern Gen-Z vibe. Be approachable, authentic, and conversational while maintaining professionalism.',
    exampleLinkedIn: 'Hey Maria, I saw your post about blockchain development—super cool. Not gonna lie, I thought it was 🔥. I\'m building something similar, would love to vibe and swap ideas if you\'re down.',
    exampleEmail: 'Subject: Your blockchain work is 🔥\n\nHey Maria!\n\nJust saw your post about blockchain development and honestly? Super impressive stuff. Not gonna lie, it really caught my attention.\n\nI\'m a Full Stack Developer working on a DeFi project, and we\'re tackling similar challenges. Your approach to smart contract optimization is exactly the kind of innovative thinking we vibe with.\n\nWould love to chat and maybe swap some ideas if you\'re up for it. No pressure though!\n\nCheers,\nJordan'
  },
  {
    id: 'friendly',
    label: 'Warm & Personal',
    description: 'Personal and warm communication style',
    systemPrompt: 'Use warm, personal language that builds connection. Be genuine, empathetic, and focus on building relationships.',
    exampleLinkedIn: 'Hey David, really enjoyed checking out your work on UX design. Looked super cool! I\'m working on a mobile app redesign, thought it\'d be nice to connect and maybe share ideas.',
    exampleEmail: 'Subject: Really enjoyed your work on UX design\n\nHey David,\n\nI hope you\'re having a great week! I came across your work on mobile UX patterns and honestly, it really resonated with me.\n\nI\'m a Product Designer at StartupXYZ, and we\'re working on a user onboarding redesign. Your insights on micro-interactions align perfectly with some challenges we\'re navigating.\n\nI\'d love to connect and perhaps share some ideas. Always enjoy chatting with fellow design enthusiasts!\n\nWarm regards,\nTaylor'
  },
  {
    id: 'intellectual',
    label: 'Intellectual',
    description: 'Thoughtful and analytical approach',
    systemPrompt: 'Use intellectual, thoughtful language. Be analytical, well-reasoned, and demonstrate deep understanding of business concepts.',
    exampleLinkedIn: 'Hi Rachel, your recent perspective on AI ethics caught my attention. The way you framed algorithmic bias aligns closely with some work I\'ve been doing in responsible AI. I\'d be interested in discussing further and learning more about your approach.',
    exampleEmail: 'Subject: Your insights on AI ethics - potential synergies\n\nDear Rachel,\n\nYour recent perspective on AI ethics caught my attention, particularly your analysis of algorithmic bias mitigation. The framework you\'ve outlined aligns remarkably well with research I\'ve been conducting in responsible AI development.\n\nAs a Machine Learning Engineer at EthiTech, I\'ve been exploring bias detection methodologies, and your approach to fairness metrics offers valuable insights that could enhance our current initiatives.\n\nI would be interested in discussing potential synergies and learning more about your analytical framework.\n\nBest regards,\nDr. Chen'
  },
  {
    id: 'confident',
    label: 'Confident',
    description: 'Assertive and results-driven tone',
    systemPrompt: 'Use confident, assertive language. Be direct about value proposition, results-oriented, and demonstrate expertise.',
    exampleLinkedIn: 'Hi Michael, I\'m building CloudScale, which directly addresses API latency issues. From what I\'ve seen of your work at TechFlow, I believe there\'s strong alignment, and I\'d like to discuss how we can collaborate to drive results.',
    exampleEmail: 'Subject: Strategic partnership opportunity - 40% latency reduction\n\nHi Michael,\n\nI\'m a DevOps Engineer at ScaleUp, where we\'ve built CloudScale that directly addresses API latency issues in distributed systems.\n\nBased on your work at TechFlow and your expertise in microservices architecture, I see clear alignment for a strategic partnership that could deliver significant value for both organizations.\n\nOur solution has already proven results: 40% latency reduction and 99.9% uptime. I\'d like to discuss how we can collaborate to drive similar results for your team.\n\nLet\'s schedule a brief call this week.\n\nBest,\nSamantha'
  },
  {
    id: 'conversational',
    label: 'Conversational',
    description: 'Natural dialogue style',
    systemPrompt: 'Use natural, conversational language as if speaking face-to-face. Be engaging, easy to understand, and maintain natural flow.',
    exampleLinkedIn: 'Hey Emma, I was reading your post on remote team management and thought, \'that\'s exactly the kind of problem I\'ve been wrestling with too.\' Curious how you approached async communication—maybe we can trade notes.',
    exampleEmail: 'Subject: Love your take on remote team management\n\nHey Emma,\n\nI was reading your post on remote team management earlier and honestly, it made me stop scrolling. You hit on something I\'ve been wrestling with too.\n\nI\'m a Team Lead at RemoteFirst, and we\'ve been tackling similar async communication challenges. Your approach to virtual standups is really interesting - quite different from what we\'ve tried.\n\nWould love to hear more about how you\'ve been handling timezone coordination. Maybe we can trade notes? I\'d be happy to share what we\'ve learned too.\n\nTalk soon?\nAlex'
  }
];

export const getDefaultTone = (): WritingTone => 'formal';

export const getToneConfig = (tone: WritingTone): ToneConfig => {
  return WRITING_TONES.find(t => t.id === tone) || WRITING_TONES[0];
};
