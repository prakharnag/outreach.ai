import { callGroq } from "./api";
import { WritingTone, getToneConfig, getDefaultTone } from "./tones";

export type MessagingAgentInput = {
  verified: {
    summary: string;
    points: Array<{ claim: string; source: { title: string; url: string } }>;
    contact?: { name: string; title: string; email?: string; source?: { title: string; url: string } };
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
  console.log('[Messaging Agent] Contact information received:', {
    hasContact: !!input.verified.contact,
    contactName: input.verified.contact?.name,
    contactTitle: input.verified.contact?.title,
    company: input.company
  });
  
  const system = `You are a master of warm, high-conversion outreach. Return ONLY valid JSON: {"linkedin":"string","email":"string"}.

TONE INSTRUCTION: ${toneConfig.systemPrompt}

STYLE EXAMPLES for ${toneConfig.label.toUpperCase()} tone:

LinkedIn Example: ${toneConfig.exampleLinkedIn}

Email Example: ${toneConfig.exampleEmail}

Rules:
- Cold Email (90–100 words): natural, human, and value-driven. Personalize with company-specific insights and key highlights from user input. 
  Structure:
    1. Start with "Subject: ..." (compelling but not click-baity)
    2. Direct, respectful greeting by name if possible (use the CONTACT's name from the verified insights, NOT the user's name from resume).
    3. One-line intro: who you are + 1 relevant credential/achievement.
    4. 2–3 short sentences connecting your skills and key highlights (from user input) to their current needs or recent initiatives (from provided research).
    5. End with one clear, low-pressure call-to-action (e.g., "Happy to chat if this aligns").
    6. End with a professional closing (e.g., "Best regards," or "Best,")
  Tone: Apply the ${toneConfig.label.toLowerCase()} writing style while maintaining professionalism.
- LinkedIn (exactly 44 words): connection-oriented, same personalization style as the email, START WITH "Hi" or "Hey" followed by the contact's name (from verified insights, NOT from resume), no formal sign-offs, written in one smooth flow using ${toneConfig.label.toLowerCase()} tone.

CRITICAL RULES:
- Return ONLY the JSON object. Do not include any extra text, explanations, or additional properties.
- DO NOT include email addresses, contact information, or signatures in the message content.
- CONTACT NAME HANDLING: 
  * IF contact name is available in verified insights: Use "Hi [Contact Name]" for LinkedIn and "Dear [Contact Name]" for email
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

CONTACT INFORMATION:
${input.verified.contact?.name ? `Contact Name: ${input.verified.contact.name}` : 'Contact Name: NOT AVAILABLE'}
${input.verified.contact?.title ? `Contact Title: ${input.verified.contact.title}` : 'Contact Title: NOT AVAILABLE'}

Verified insights: ${JSON.stringify(input.verified)}

${input.resumeContent ? 'PERSONALIZATION INSTRUCTION: Use the resume content to create highly personalized and relevant outreach messages. Reference specific skills, experiences, or achievements from the resume that align with the company\'s needs and the target role. Make the connection clear and compelling.' : ''}

IMPORTANT: If Contact Name is "NOT AVAILABLE", use generic greetings like "Hi there" (LinkedIn) or "Hi" (email). NEVER use names from resume content for contact greetings.

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
        content: `Rewrite to exactly 22 words, preserving core value, concise and engaging. Apply ${toneConfig.label.toLowerCase()} tone: ${toneConfig.systemPrompt}. Return plain text only.` 
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


