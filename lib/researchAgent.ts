import { callPerplexity, ResearchResult } from "@/lib/api";

export type TrustedContact = {
  name: string;
  title: string;
  email?: string; // clickable in UI if present
  source?: { title: string; url: string };
};

export type ResearchAgentInput = { company: string; role: string };
export type ResearchPoint = { claim: string; source?: { title: string; url: string } };
export type ResearchAgentOutput = ResearchResult & {
  points: ResearchPoint[];
  contact?: TrustedContact;
};

export async function researchAgent(input: ResearchAgentInput): Promise<ResearchAgentOutput> {
    const systemPrompt = `
    You are a precision-focused company research assistant.
    Always output **valid compact JSON** using the schema provided.
    Never include plain text outside of JSON.
    Avoid verbose citations — always use short, clear, human-readable source titles with URLs.
  `;

  const prompt = [
    `Company: ${input.company}`,
    `Role: ${input.role}`,
    `Research this company in depth, prioritizing **accuracy** and **official sources**.

    🔍 Required sources to check in order:
      1. Official company website
      2. Company blog (if available)
      3. Company LinkedIn page
      4. Funding databases (Crunchbase, Fundz, reputable startup news)
      5. CEO or most active technical leader’s LinkedIn activity
      6. Trusted news coverage
      7. Public code repos (GitHub, GitLab) if relevant

    📊 Required data fields:
      - Funding history (summarize, latest round clearly stated)
      - Top 5 technologies in use (tech stack)
      - Product updates (max 3 recent ones)
      - Technical challenges or pain points (max 3, inferred from credible sources)
      - Key team leaders (names & titles)
      - Contact:
          * CEO, CTO, founding engineer, hiring manager, talent acquisition partner, or most active senior engineer and people who are hiring and are likely to respond to cold emails
          * Include their email if confidently found from trusted sources
          * If no email is public, generate a **likely** email based on observed company email format (e.g. first.last@company.com)
          * Mark invented emails with "likely": true

    📝 Output format:
    {
      summary: string (<= 80 words),
      points: [
        {
          claim: string,
          source?: { title: string, url: string }
        }
      ],
      sources?: [
        { title: string, url: string }
      ],
      contact?: {
        name: string,
        title: string,
        email?: string,
        likely?: boolean,
        source?: { title: string, url: string }
      }
    }

    Formatting rules:
      - Every claim with external data must have a clickable source.
      - No duplicate sources in "points" and "sources".
      - Ensure JSON is minified but human-readable when rendered.
    `
  ].join("\n");

  const res = await callPerplexity(prompt, {
    model: "sonar",
    maxTokens: 700,
    temperature: 0.2,
    systemPrompt,
  });

  // Ensure shape
  const normalized: ResearchAgentOutput = {
    summary: res.summary,
    points: Array.isArray((res as any).points) ? (res as any).points : (res.points || []).map((p: any) => ({ claim: String(p), source: undefined })),
    sources: res.sources,
    contact: (res as any).contact,
  };
  return normalized;
}


