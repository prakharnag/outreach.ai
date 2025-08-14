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
  const system = `You are a master of warm, high-conversion outreach. Return ONLY valid JSON: {linkedin:string,email:string}.
Rules:
- Cold Email (90–100 words): natural, human, and value-driven. Personalize with company-specific insights. 
  Structure:
    1. Start with "Subject: ..." (compelling but not click-baity)
    2. Direct, respectful greeting by name if possible.
    3. One-line intro: who you are + 1 relevant credential/achievement.
    4. 2–3 short sentences connecting your skills to their current needs or recent initiatives (from provided research).
    5. End with one clear, low-pressure call-to-action (e.g., "Happy to chat if this aligns").
  Tone: friendly-professional, confident, and conversational — avoid jargon, hype, or hard-sell language.
- LinkedIn (exactly 44 words): casual-professional, connection-oriented, same personalization style as the email, no greetings or sign-offs, written in one smooth sentence.
`;

const user = `Company: ${input.company}
Role: ${input.role}
Highlights: ${input.highlights}
Verified insights: ${JSON.stringify(input.verified)}
Output must be strictly valid JSON — nothing extra.`;


  const { content } = await callGroq(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { model: "llama3-70b-8192", temperature: 0.5 }
  );

  try {
    const parsed = JSON.parse(content);
    // Guardrails on lengths
    const linkedin: string = String(parsed.linkedin || "").trim();
    const email: string = String(parsed.email || "").trim();
    return { linkedin, email };
  } catch {
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


