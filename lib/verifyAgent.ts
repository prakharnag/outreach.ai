import { callGroq } from "@/lib/api";

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
  const system = `You are a rigorous verifier. Task: validate each claim, attach a verifiable citation URL for every included claim, drop anything unverifiable or outdated (>12 months). Output concise JSON only: {summary:string, points:{claim:string, source:{title:string,url:string}}[], contact?:{name:string,title:string,email?:string,source?:{title:string,url:string}}}.`;
  const user = `Verify and refine:
${JSON.stringify(input.research)}
Rules:
- Each point must include a working, original source URL.
- Exclude claims lacking credible sources.
- Prefer official/company domains, reputable press, or documentation.
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


