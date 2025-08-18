import { callGroq } from "./api";

export type MessagingAgentInput = {
  verified: {
    summary: string;
    points: Array<{ claim: string; source: { title: string; url: string } }>;
    contact?: { name: string; title: string; email?: string; source?: { title: string; url: string } };
  };
  company: string;
  role: string;
  highlights: string; // user-provided
};

export type MessagingAgentOutput = {
  linkedin: string; // exactly 44 words by default
  email: string; // 90-100 words, includes Subject: on first line
};

export async function messagingAgent(input: MessagingAgentInput): Promise<MessagingAgentOutput> {
  console.log('[MessagingAgent] Starting message generation with input:', {
    company: input.company,
    role: input.role,
    hasVerifiedData: !!input.verified,
    verifiedPointsCount: input.verified?.points?.length
  });

  const system = `You are a master of warm, high-conversion outreach. Return ONLY valid JSON: {"linkedin":"string","email":"string"}.
Rules:
- Cold Email (90–100 words): natural, human, and value-driven. Personalize with company-specific insights and key highlights from user input. 
  Structure:
    1. Start with "Subject: ..." (compelling but not click-baity)
    2. Direct, respectful greeting by name if possible.
    3. One-line intro: who you are + 1 relevant credential/achievement.
    4. 2–3 short sentences connecting your skills and key highlights (from user input) to their current needs or recent initiatives (from provided research).
    5. End with one clear, low-pressure call-to-action (e.g., "Happy to chat if this aligns").
    6. End with a professional closing (e.g., "Best regards," or "Best,")
  Tone: friendly-professional, confident, and conversational — avoid jargon, hype, or hard-sell language.
- LinkedIn (exactly 44 words): casual-professional, connection-oriented, same personalization style as the email, no greetings or sign-offs, written in one smooth sentence.

CRITICAL RULES:
- Return ONLY the JSON object. Do not include any extra text, explanations, or additional properties.
- DO NOT include email addresses, contact information, or signatures in the message content.
- Use the contact name for personalization but do not add their email to the message text.
- MAINTAIN PERFECT spelling and grammar - double-check every word before responding.
- When referencing the user's key highlights, use them EXACTLY as provided for accuracy - do not paraphrase or modify their content.
- The email content should be complete and professional without requiring additional contact information.`;

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

  console.log('[MessagingAgent] Received response from Groq:', content.slice(0, 200) + '...');

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
    
    console.log('[MessagingAgent] Cleaned content:', cleanContent.slice(0, 200) + '...');
    
    const parsed = JSON.parse(cleanContent);
    console.log('[MessagingAgent] Successfully parsed JSON response:', {
      hasLinkedin: !!parsed.linkedin,
      hasEmail: !!parsed.email,
      linkedinLength: parsed.linkedin?.length,
      emailLength: parsed.email?.length
    });
    
    // Guardrails on lengths
    const linkedin: string = String(parsed.linkedin || "").trim();
    const email: string = String(parsed.email || "").trim();
    
    const result = { linkedin, email };
    console.log('[MessagingAgent] Returning result:', result);
    return result;
  } catch (parseError) {
    console.error('[MessagingAgent] Failed to parse JSON response:', parseError);
    console.log('[MessagingAgent] Raw content:', content);
    return { linkedin: content.slice(0, 300), email: content };
  }
}

export async function rephraseLinkedInTo22Words(linkedin: string): Promise<string> {
  const { content } = await callGroq(
    [
      { role: "system", content: "Rewrite to exactly 22 words, preserving core value, concise and friendly. Return plain text only." },
      { role: "user", content: linkedin },
    ],
    { model: "llama3-70b-8192", temperature: 0.5 }
  );
  return content.trim();
}


