import { callGroq } from "@/lib/api";

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
  const system = `You craft concise outreach. Return ONLY JSON: {linkedin:string,email:string}.
Rules:
- Cold Email: 90-100 words, professional, value-driven, personalized via research + highlights. Start with direct respectful greeting, one-line intro (who you are + relevant experience), 2–3 lines connecting skills to company needs with specifics, end with one clear ask ("Happy to chat if this aligns"). First line must be 'Subject: ...'.
- LinkedIn: exactly 44 words by default, casual-professional, connection-oriented, same personalization.
`;

  const user = `Company: ${input.company}
Role: ${input.role}
Highlights: ${input.highlights}
Verified insights: ${JSON.stringify(input.verified)}
Output strictly valid JSON.`;

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


