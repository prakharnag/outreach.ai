import { callGroq } from "./api";

export type VerifyAgentInput = {
  research: {
    summary: string;
    points: Array<{ claim: string; source?: { title: string; url: string } }>;
    sources?: Array<{ title: string; url: string }>;
    contact?: { name: string; title: string; email?: string; source?: { title: string; url: string } };
  };
};

export type VerifyAgentOutput = {
  summary: string;
  points: Array<{ claim: string; source: { title: string; url: string } }>;
  contact?: { name: string; title: string; email?: string; source?: { title: string; url: string } };
};

export async function verifierAgent(input: VerifyAgentInput): Promise<VerifyAgentOutput> {
const system = `
You are a meticulous fact verifier and information auditor.

Task:
1. Validate every claim in the input.
2. Only keep claims with **verifiable, up-to-date** sources (< 12 months old unless explicitly marked as historical context).
3. Attach a **working, original** citation URL for each claim (no aggregator URLs).
4. Prefer sources from:
   - Official/company-owned domains
   - Reputable press
   - Official documentation or regulatory filings
5. Remove or rephrase anything unverifiable, vague, or speculative.
6. For company and contact details:
   - Cross-check the company name against trusted sources to prevent hallucinations.
   - For emails, first attempt to find them from trusted sources.
   - If no reliable email found, infer a plausible one based on common patterns, but clearly mark it as "inferred".
7. Output **only** concise JSON matching this schema:
{
  "summary": string,
  "points": [
    {
      "claim": string,
      "source": { "title": string, "url": string }
    }
  ],
  "contact"?: {
    "name": string,
    "title": string,
    "email"?: string,
    "inferred"?: boolean,
    "source"?: { "title": string, "url": string }
  }
}
Strictly follow the schema with no extra fields or text outside JSON.
`;
const user = `
Verify and refine:
${JSON.stringify(input.research)}

Rules:
- Keep only claims with credible sources; attach title + URL.
- Exclude unverifiable or outdated claims (>12 months old), unless explicitly noted as historical.
- Check company names for accuracy from trusted sources.
- Search for contact emails in official/trusted sources; if unavailable, infer a likely format and mark as "inferred".
- Output valid JSON only.
`;

  const { content } = await callGroq(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { model: "llama3-70b-8192", temperature: 0.2 }
  );

  try {
    const parsed = JSON.parse(content);
    // Ensure shape and sources present for each point
    const points = Array.isArray(parsed.points)
      ? parsed.points.filter((p: any) => p?.claim && p?.source?.url)
      : [];
    const summary: string = typeof parsed.summary === "string" ? parsed.summary : "";
    const contact = parsed.contact;
    return { summary, points, contact } as VerifyAgentOutput;
  } catch {
    return { summary: content, points: [] };
  }
}


