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
  Always output STRICT valid compact JSON only (no extra commentary).
  Do not hallucinate facts — if you are uncertain, return empty fields and a confidence score.
  Prefer official sources (company domains, official blog, LinkedIn company page, Crunchbase, TechCrunch, reputable press).
  When you generate a likely/fallback email, mark it explicitly with "likely": true and provide the inference rationale and any observed email pattern in "email_inference".
  Always include a "confidence" score (0.0 - 1.0) for the overall research and for the contact if present.
  `
const prompt = [
  `Company: ${input.company}`,
  `Role: ${input.role}`,
  `
  1) DISAMBIGUATION STEP (required):
     - Try to find the company's official domain first (company.com) by checking: official website, LinkedIn company page, Crunchbase, and top reputable news.
     - If multiple matches exist, return the top 2 matches in "candidates" with domain and a short match_reason, and DO NOT invent data for a non-confirmed match.
     - Only proceed to full research on the highest-confidence matched company (candidate.confidence >= 0.7). If below 0.7, set overall confidence < 0.7 and include candidate list.

  2) TRUSTED-SOURCE RULES:
     - Consider a source "trusted" if it is:
         * The official company domain,
         * The company's own blog or press page,
         * LinkedIn company page,
         * Crunchbase / reputable VC sites,
         * Major tech press (TechCrunch, BusinessWire, Forbes).
     - Claims should cite a trusted source. If the only evidence is untrusted or personal blogs, include it but mark source as untrusted and lower confidence.

  3) CONTACT & EMAIL RULES:
     - Locate CEO/CTO/founding engineer/hiring manager/most-active engineer via LinkedIn or official About/Team pages.
     - If an official email is publicly available on a trusted source, include it and set contact.likely = false.
     - If no public email exists, infer a likely email **only if** you can detect a consistent company email pattern from at least 2 distinct trusted sources (e.g., firstname.lastname@company.com or f.lastname@company.com). Put the pattern and brief evidence in contact.email_inference and set contact.likely = true.
     - If no pattern can be inferred confidently, leave contact.email undefined and set contact.likely = false.
     - Add contact.confidence (0.0 - 1.0) reflecting how confident you are about the contact/email.

  4) REQUIRED OUTPUT (strict JSON schema):
  {
    "summary": string (<=80 words),
    "confidence": number,              // overall confidence 0.0 - 1.0
    "candidates"?: [                   // only if disambiguation needed
      { name:string, domain:string, match_reason:string, confidence:number }
    ],
    "points": [
      { "claim": string, "source"?: { "title": string, "url": string, "trusted": boolean } }
    ],
    "sources"?: [ { "title": string, "url": string, "trusted": boolean } ],
    "contact"?: {
      "name": string,
      "title": string,
      "email"?: string,
      "likely"?: boolean,             // true if invented/inferred
      "email_inference"?: string,     // short rationale for invented email
      "source"?: { "title": string, "url": string },
      "confidence"?: number
    }
  }

  5) FORMATTING & SAFETY:
     - Every claim with an external fact must include a source object with a URL (prefer trusted sources).
     - Deduplicate sources.
     - If overall confidence < 0.6, include a brief "warning" field in the JSON (string) to indicate low confidence.
     - Minify JSON (no extra commentary). Keep URLs fully qualified.
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


