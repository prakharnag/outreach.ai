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
    exampleLinkedIn: 'Dear [Name], I hope this message finds you well. I came across your recent work in [domain], and I was impressed by your contributions. I\'d love to connect and explore possible opportunities for collaboration.',
    exampleEmail: 'Subject: Partnership opportunity at [Company]\n\nDear [Name],\n\nI hope this message finds you well. I came across your recent work in [domain], and I was impressed by your contributions to the field.\n\nI am [Your Role] at [Your Company], where we specialize in [relevant area]. Given your expertise in [specific area], I believe there may be valuable opportunities for collaboration.\n\nI would welcome the opportunity to discuss how we might work together to drive mutual success.\n\nBest regards,\n[Your Name]'
  },
  {
    id: 'casual',
    label: 'Casual & Friendly',
    description: 'Relaxed, approachable Gen-Z vibe',
    systemPrompt: 'Use casual, friendly language with a modern Gen-Z vibe. Be approachable, authentic, and conversational while maintaining professionalism.',
    exampleLinkedIn: 'Hey [Name], I saw your post about [topic]—super cool. Not gonna lie, I thought it was 🔥. I\'m building something similar, would love to vibe and swap ideas if you\'re down.',
    exampleEmail: 'Subject: Your [topic] work is 🔥\n\nHey [Name]!\n\nJust saw your post about [topic] and honestly? Super impressive stuff. Not gonna lie, it really caught my attention.\n\nI\'m [Your Role] working on [project/company], and we\'re tackling similar challenges. Your approach to [specific thing] is exactly the kind of innovative thinking we vibe with.\n\nWould love to chat and maybe swap some ideas if you\'re up for it. No pressure though!\n\nCheers,\n[Your Name]'
  },
  {
    id: 'friendly',
    label: 'Warm & Personal',
    description: 'Personal and warm communication style',
    systemPrompt: 'Use warm, personal language that builds connection. Be genuine, empathetic, and focus on building relationships.',
    exampleLinkedIn: 'Hey man, really enjoyed checking out your work on [topic]. Looked super cool! I\'m working on [your project], thought it\'d be nice to connect and maybe share ideas.',
    exampleEmail: 'Subject: Really enjoyed your work on [topic]\n\nHey [Name],\n\nI hope you\'re having a great week! I came across your work on [topic] and honestly, it really resonated with me.\n\nI\'m [Your Role] at [Company], and we\'re working on [related project]. Your insights on [specific area] align perfectly with some challenges we\'re navigating.\n\nI\'d love to connect and perhaps share some ideas. Always enjoy chatting with fellow [relevant field] enthusiasts!\n\nWarm regards,\n[Your Name]'
  },
  {
    id: 'intellectual',
    label: 'Intellectual',
    description: 'Thoughtful and analytical approach',
    systemPrompt: 'Use intellectual, thoughtful language. Be analytical, well-reasoned, and demonstrate deep understanding of business concepts.',
    exampleLinkedIn: 'Hi [Name], your recent perspective on [topic] caught my attention. The way you framed [concept] aligns closely with some work I\'ve been doing in [field]. I\'d be interested in discussing further and learning more about your approach.',
    exampleEmail: 'Subject: Your insights on [topic] - potential synergies\n\nDear [Name],\n\nYour recent perspective on [topic] caught my attention, particularly your analysis of [specific concept]. The framework you\'ve outlined aligns remarkably well with research I\'ve been conducting in [related field].\n\nAs [Your Role] at [Company], I\'ve been exploring [relevant area], and your approach to [specific methodology] offers valuable insights that could enhance our current initiatives.\n\nI would be interested in discussing potential synergies and learning more about your analytical framework.\n\nBest regards,\n[Your Name]'
  },
  {
    id: 'confident',
    label: 'Confident',
    description: 'Assertive and results-driven tone',
    systemPrompt: 'Use confident, assertive language. Be direct about value proposition, results-oriented, and demonstrate expertise.',
    exampleLinkedIn: 'Hi [Name], I\'m building [product], which directly addresses [pain point]. From what I\'ve seen of your work, I believe there\'s strong alignment, and I\'d like to discuss how we can collaborate to drive results.',
    exampleEmail: 'Subject: Strategic partnership opportunity - [specific value]\n\nHi [Name],\n\nI\'m [Your Role] at [Company], where we\'ve built [product/solution] that directly addresses [pain point] in [industry].\n\nBased on your work at [Company] and your expertise in [area], I see clear alignment for a strategic partnership that could deliver significant value for both organizations.\n\nOur solution has already proven results: [specific metric/outcome]. I\'d like to discuss how we can collaborate to drive similar results for your team.\n\nLet\'s schedule a brief call this week.\n\nBest,\n[Your Name]'
  },
  {
    id: 'conversational',
    label: 'Conversational',
    description: 'Natural dialogue style',
    systemPrompt: 'Use natural, conversational language as if speaking face-to-face. Be engaging, easy to understand, and maintain natural flow.',
    exampleLinkedIn: 'Hey [Name], I was reading your post on [topic] and thought, \'that\'s exactly the kind of problem I\'ve been wrestling with too.\' Curious how you approached [specific thing]—maybe we can trade notes.',
    exampleEmail: 'Subject: Love your take on [topic]\n\nHey [Name],\n\nI was reading your post on [topic] earlier and honestly, it made me stop scrolling. You hit on something I\'ve been wrestling with too.\n\nI\'m [Your Role] at [Company], and we\'ve been tackling [similar challenge]. Your approach to [specific aspect] is really interesting - quite different from what we\'ve tried.\n\nWould love to hear more about how you\'ve been handling [specific thing]. Maybe we can trade notes? I\'d be happy to share what we\'ve learned too.\n\nTalk soon?\n[Your Name]'
  }
];

export const getDefaultTone = (): WritingTone => 'formal';

export const getToneConfig = (tone: WritingTone): ToneConfig => {
  return WRITING_TONES.find(t => t.id === tone) || WRITING_TONES[0];
};
