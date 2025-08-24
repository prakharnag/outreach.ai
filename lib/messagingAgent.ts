import { callGroq } from "./api";
import { WritingTone, getToneConfig, getDefaultTone } from "./tones";

export type MessagingAgentInput = {
  verified: {
    summary: string;
    points: Array<{ claim: string; source: { title: string; url: string } }>;
    contact?: { 
      primary_contact: { name: string; title: string; email?: string; source?: { title: string; url: string }; contact_type?: string };
      secondary_contact: { name: string; title: string; email?: string; source?: { title: string; url: string }; contact_type?: string };
    } | { name: string; title: string; email?: string; source?: { title: string; url: string } }; // legacy format
  };
  company: string;
  role: string;
  highlights: string; // user-provided
  tone?: WritingTone; // optional tone, defaults to formal
  resumeContent?: string; // optional resume content for personalization
};

export type MessagingAgentOutput = {
  linkedin: string; // exactly 44 words by default
  email: string; // 90-100 words, includes Subject: on first line
};

export async function messagingAgent(input: MessagingAgentInput): Promise<MessagingAgentOutput> {
  const tone = input.tone || getDefaultTone();
  const toneConfig = getToneConfig(tone);
  
  // Debug logging for contact information
  console.log("Messaging Agent Input:", {
    contactStructure: input.verified.contact,
    primaryContactName: (input.verified.contact as any)?.primary_contact?.name,
    secondaryContactName: (input.verified.contact as any)?.secondary_contact?.name,
    legacyContactName: (input.verified.contact as any)?.name,
    company: input.company,
    role: input.role,
    highlights: input.highlights,
    tone: input.tone,
    hasResumeContent: !!input.resumeContent
  });  const system = `You are a master of warm, high-conversion outreach. Return ONLY valid JSON: {"linkedin":"string","email":"string"}.

TONE INSTRUCTION: ${toneConfig.systemPrompt}

STYLE EXAMPLES for ${toneConfig.label.toUpperCase()} tone:

LinkedIn Example: ${toneConfig.exampleLinkedIn}

Email Example: ${toneConfig.exampleEmail}

You are a professional outreach specialist creating personalized messages.

**CRITICAL INSTRUCTIONS:**
- User's TARGET ROLE: ${input.role} - This is the position they are seeking/targeting. Reference this role appropriately.
- When referencing the user's background, ONLY use information from their "Highlights" and "Resume Content" (if provided).
- NEVER invent or assume job titles, experiences, or skills not explicitly mentioned in the user's information.
- If resume content is provided, use it to personalize the message with specific skills, experiences, and achievements that align with the target role.

Generate TWO outputs ONLY:

- Cold Email (90–100 words): natural, human, and value-driven. Personalize with company-specific insights and key highlights from user input. 
  Structure:
    1. Start with "Subject: ..." (compelling but not click-baity)
    2. Direct, respectful greeting by name if possible (use the CONTACT's name from the verified insights, NOT the user's name from resume).
    3. One-line intro: who you are as it relates to the TARGET ROLE + 1 relevant credential/achievement from YOUR highlights/resume.
    4. 2–3 short sentences connecting your skills and key highlights (from user input) to their current needs or recent initiatives (from provided research).
    5. End with one clear, low-pressure call-to-action (e.g., "Happy to chat if this aligns").
    6. End with a professional closing (e.g., "Best regards," or "Best,")
  Tone: Apply the ${toneConfig.label.toLowerCase()} writing style while maintaining professionalism.

- LinkedIn (exactly 44 words): connection-oriented, same personalization style as the email, START WITH "Hi" or "Hey" followed by the contact's name (from verified insights, NOT from resume), no formal sign-offs, written in one smooth flow using ${toneConfig.label.toLowerCase()} tone.

CRITICAL RULES:
- Return ONLY the JSON object. Do not include any extra text, explanations, or additional properties.
- DO NOT include email addresses, contact information, or signatures in the message content.
- CONTACT NAME HANDLING: 
  * ALWAYS use the PRIMARY CONTACT NAME for greetings when available
  * IF primary contact name is available: Use "Hi [Primary Contact Name]" for LinkedIn and "Dear [Primary Contact Name]" for email
  * IF no primary contact but secondary contact available: Use "Hi [Secondary Contact Name]" for LinkedIn and "Dear [Secondary Contact Name]" for email
  * IF NO contact name available: Use "Hi there" for LinkedIn and "Hi" for email (DO NOT use any name from resume content)
  * NEVER use the user's name from resume content as the contact greeting
- LinkedIn messages MUST start with "Hi [Contact Name]" or "Hey [Contact Name]" when contact is known, or "Hi there" when unknown.
- Email greetings should use "Dear [Contact Name]" or "Hi [Contact Name]" when contact is known, or "Hi" when unknown.
- MAINTAIN PERFECT spelling and grammar - double-check every word before responding.
- When referencing the user's key highlights, use them EXACTLY as provided for accuracy - do not paraphrase or modify their content.
- The email content should be complete and professional without requiring additional contact information.
- APPLY THE SPECIFIED TONE: ${toneConfig.description}
- USE THE PROVIDED EXAMPLES AS STYLE REFERENCE while adapting content to the specific context.`;

const user = `Company: ${input.company}
Role: ${input.role}
Highlights: ${input.highlights}${input.resumeContent ? `
Resume Content: ${input.resumeContent}` : ''}

TARGET ROLE FOR USER: ${input.role}

CONTACT INFORMATION:
${(() => {
  const contactAny = input.verified.contact as any;
  // Handle new two-contact structure
  if (contactAny?.primary_contact || contactAny?.secondary_contact) {
    const contacts = [];
    if (contactAny.primary_contact) {
      contacts.push(`Primary Contact: ${contactAny.primary_contact.name || 'NOT AVAILABLE'} - ${contactAny.primary_contact.title || 'NOT AVAILABLE'}`);
    }
    if (contactAny.secondary_contact) {
      contacts.push(`Secondary Contact: ${contactAny.secondary_contact.name || 'NOT AVAILABLE'} - ${contactAny.secondary_contact.title || 'NOT AVAILABLE'}`);
    }
    return contacts.join('\n');
  }
  // Handle legacy single contact structure
  return `${contactAny?.name ? `Contact Name: ${contactAny.name}` : 'Contact Name: NOT AVAILABLE'}
${contactAny?.title ? `Contact Title: ${contactAny.title}` : 'Contact Title: NOT AVAILABLE'}`;
})()}

PRIMARY CONTACT FOR GREETING:
${(() => {
  const contactAny = input.verified.contact as any;
  // Prioritize primary contact for greetings
  if (contactAny?.primary_contact?.name) {
    return `Use name: ${contactAny.primary_contact.name}`;
  }
  // Fall back to secondary contact if no primary available
  if (contactAny?.secondary_contact?.name) {
    return `Use name: ${contactAny.secondary_contact.name}`;
  }
  // Legacy single contact structure
  if (contactAny?.name) {
    return `Use name: ${contactAny.name}`;
  }
  return 'Use generic greeting (no name available)';
})()}

Verified insights: ${JSON.stringify(input.verified)}

${input.resumeContent ? 'PERSONALIZATION INSTRUCTION: Use the resume content to create highly personalized and relevant outreach messages. Reference specific skills, experiences, or achievements from the resume that align with the company\'s needs and the target role. Make the connection clear and compelling.' : ''}

IMPORTANT: When addressing contacts in messages:
1. ALWAYS use the name specified in "PRIMARY CONTACT FOR GREETING" section above
2. If Contact Name is "NOT AVAILABLE", use generic greetings like "Hi there" (LinkedIn) or "Hi" (email)
3. NEVER use names from resume content for contact greetings
4. BE CONSISTENT - the same contact name should be used throughout both email and LinkedIn message

Output must be strictly valid JSON with ONLY "linkedin" and "email" properties — nothing extra.`;


  const { content } = await callGroq(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { model: "llama3-70b-8192", temperature: 0.5 }
  );

  try {
    // Clean the content to ensure it's valid JSON
    let cleanContent = content.trim();
    
    // Remove any text before the first {
    const firstBrace = cleanContent.indexOf('{');
    if (firstBrace > 0) {
      cleanContent = cleanContent.substring(firstBrace);
    }
    
    // Remove any text after the last }
    const lastBrace = cleanContent.lastIndexOf('}');
    if (lastBrace >= 0 && lastBrace < cleanContent.length - 1) {
      cleanContent = cleanContent.substring(0, lastBrace + 1);
    }
    
    const parsed = JSON.parse(cleanContent);
    
    // Guardrails on lengths
    const linkedin: string = String(parsed.linkedin || "").trim();
    const email: string = String(parsed.email || "").trim();
    
    const result = { linkedin, email };
    return result;
  } catch (parseError) {
    return { linkedin: content.slice(0, 300), email: content };
  }
}

export async function rephraseLinkedInTo22Words(linkedin: string, tone?: WritingTone): Promise<string> {
  const toneConfig = getToneConfig(tone || getDefaultTone());
  const { content } = await callGroq(
    [
      { 
        role: "system", 
        content: `You are a professional message editor. Rewrite the given LinkedIn message to exactly 22 words while preserving the core value proposition and maintaining a ${toneConfig.label.toLowerCase()} tone. ${toneConfig.systemPrompt}

CRITICAL: Return ONLY the rewritten 22-word message. Do not include any explanations, instructions, or additional text before or after the message.` 
      },
      { role: "user", content: linkedin },
    ],
    { model: "llama3-70b-8192", temperature: 0.5 }
  );
  return content.trim();
}

export async function rephraseEmailWithTone(email: string, tone: WritingTone): Promise<string> {
  const toneConfig = getToneConfig(tone);
  const { content } = await callGroq(
    [
      { 
        role: "system", 
        content: `Rewrite this email maintaining the same structure and core message but applying ${toneConfig.label.toLowerCase()} tone: ${toneConfig.systemPrompt}. 

Style Reference: ${toneConfig.exampleEmail}

Keep it 90-100 words and maintain the Subject line format. Return plain text only.` 
      },
      { role: "user", content: email },
    ],
    { model: "llama3-70b-8192", temperature: 0.5 }
  );
  return content.trim();
}

export async function rephraseLinkedInWithTone(linkedin: string, tone: WritingTone): Promise<string> {
  const toneConfig = getToneConfig(tone);
  const { content } = await callGroq(
    [
      { 
        role: "system", 
        content: `Rewrite this LinkedIn message maintaining the same core message but applying ${toneConfig.label.toLowerCase()} tone: ${toneConfig.systemPrompt}. 

Style Reference: ${toneConfig.exampleLinkedIn}

Keep it around 44 words, concise and engaging. Return plain text only.` 
      },
      { role: "user", content: linkedin },
    ],
    { model: "llama3-70b-8192", temperature: 0.5 }
  );
  return content.trim();
}


