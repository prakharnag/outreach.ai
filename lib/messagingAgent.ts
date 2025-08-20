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
};

export type MessagingAgentOutput = {
  linkedin: string; // exactly 44 words by default
  email: string; // 90-100 words, includes Subject: on first line
};

export async function messagingAgent(input: MessagingAgentInput): Promise<MessagingAgentOutput> {
  const tone = input.tone || getDefaultTone();
  const toneConfig = getToneConfig(tone);
  
  const system = `You are a master of warm, high-conversion outreach. Return ONLY valid JSON: {"linkedin":"string","email":"string"}.

TONE INSTRUCTION: ${toneConfig.systemPrompt}

STYLE EXAMPLES for ${toneConfig.label.toUpperCase()} tone:

LinkedIn Example: ${toneConfig.exampleLinkedIn}

Email Example: ${toneConfig.exampleEmail}

Rules:
- Cold Email (90–100 words): natural, human, and value-driven. Personalize with company-specific insights and key highlights from user input. 
  Structure:
    1. Start with "Subject: ..." (compelling but not click-baity)
    2. Direct, respectful greeting by name if possible.
    3. One-line intro: who you are + 1 relevant credential/achievement.
    4. 2–3 short sentences connecting your skills and key highlights (from user input) to their current needs or recent initiatives (from provided research).
    5. End with one clear, low-pressure call-to-action (e.g., "Happy to chat if this aligns").
    6. End with a professional closing (e.g., "Best regards," or "Best,")
  Tone: Apply the ${toneConfig.label.toLowerCase()} writing style while maintaining professionalism.
- LinkedIn (exactly 44 words): connection-oriented, same personalization style as the email, no greetings or sign-offs, written in one smooth sentence using ${toneConfig.label.toLowerCase()} tone.

CRITICAL RULES:
- Return ONLY the JSON object. Do not include any extra text, explanations, or additional properties.
- DO NOT include email addresses, contact information, or signatures in the message content.
- Use the contact name for personalization but do not add their email to the message text.
- MAINTAIN PERFECT spelling and grammar - double-check every word before responding.
- When referencing the user's key highlights, use them EXACTLY as provided for accuracy - do not paraphrase or modify their content.
- The email content should be complete and professional without requiring additional contact information.
- APPLY THE SPECIFIED TONE: ${toneConfig.description}
- USE THE PROVIDED EXAMPLES AS STYLE REFERENCE while adapting content to the specific context.`;

const user = `Company: ${input.company}
Role: ${input.role}
Highlights: ${input.highlights}
Verified insights: ${JSON.stringify(input.verified)}
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


