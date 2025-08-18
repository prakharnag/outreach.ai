import { callGroq, callPerplexity, ResearchResult } from "@/lib/api";

export type ResearchAgentInput = { company: string; role: string };
export type ResearchAgentOutput = ResearchResult;

export async function researchAgent(input: ResearchAgentInput): Promise<ResearchAgentOutput> {
  // Cost-optimized: small Sonar model by default, constrained maxTokens, narrow instructions
  const systemPrompt = "You are a research assistant. Return compact JSON. Avoid verbose citations.";
  const prompt = `Company: ${input.company}\nRole: ${input.role}\nInstructions: Summarize ONLY: funding (latest), tech stack (top 5), key team leaders (names/titles), product news (<=3), likely challenges (<=3). Output JSON: {summary:string, points:string[], sources?:{title:string,url:string}[]}. Keep summary <= 80 words.`;
  const res = await callPerplexity(prompt, {
    model: "sonar",
    maxTokens: 700,
    temperature: 0.2,
    systemPrompt,
  });
  return res;
}

export type VerifyAgentInput = { research: ResearchAgentOutput };
export type VerifyAgentOutput = { summary: string; points: string[] };

export async function verifierAgent(input: VerifyAgentInput): Promise<VerifyAgentOutput> {
  const text = JSON.stringify(input.research);
  const system = `You are a verifier. Remove irrelevant, duplicated, or stale items. Prefer recent info (last 12 months). Output concise structured JSON: {summary:string, points:string[]}`;
  const user = `Verify and refine this research JSON: ${text}`;
  const { content } = await callGroq([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { model: "llama3-70b-8192", temperature: 0.2 });

  try {
    const parsed = JSON.parse(content);
    return parsed as VerifyAgentOutput;
  } catch {
    return { summary: content, points: [] };
  }
}

export type MessageAgentInput = { verified: VerifyAgentOutput; company: string; role: string };
export type MessageAgentOutput = { linkedin: string; email: string };

export async function messagingAgent(input: MessageAgentInput): Promise<MessageAgentOutput> {
  const system = `You craft concise outreach. Return JSON: {linkedin:string, email:string}. LinkedIn must be ~40 words, friendly, specific. Email: 120-180 words, tailored to role and company insights, with subject line included on first line as 'Subject: ...'.`;
  const user = `Company: ${input.company}\nRole: ${input.role}\nInsights: ${JSON.stringify(input.verified)}`;
  const { content } = await callGroq([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { model: "llama3-70b-8192", temperature: 0.5 });
  try {
    const parsed = JSON.parse(content);
    return parsed as MessageAgentOutput;
  } catch {
    return { linkedin: content.slice(0, 280), email: content };
  }
}


