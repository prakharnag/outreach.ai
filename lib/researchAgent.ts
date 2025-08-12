import { callPerplexity, ResearchResult } from "@/lib/api";

export type TrustedContact = {
  name: string;
  title: string;
  email?: string; // clickable in UI if present
  source?: { title: string; url: string };
};

export type ResearchAgentInput = { company: string; domain?: string; role: string };
export type ResearchPoint = { claim: string; source?: { title: string; url: string } };
export type ResearchAgentOutput = ResearchResult & {
  points: ResearchPoint[];
  contact?: TrustedContact;
};

export async function researchAgent(input: ResearchAgentInput): Promise<ResearchAgentOutput> {
  const systemPrompt = `
You are a precision-focused company research assistant.

Your task is to generate a detailed, accurate, and well-structured company research report.

Always output human-readable text using markdown formatting: clear headings, bullet points, and clickable links.

Avoid JSON, code syntax, brackets, or any technical formatting.

Do NOT hallucinate facts — if information is uncertain or unavailable, clearly state limitations.

Prioritize official and trusted sources, including:
- Official company domains and websites
- Company blogs or press pages
- LinkedIn company profiles
- Crunchbase and reputable VC/startup databases
- Major tech and business press (e.g., TechCrunch, BusinessWire, Forbes)

Always include a confidence assessment (High/Medium/Low) with explanation.

Cite sources clearly using clickable markdown links: [Source Title](URL).

---

1) DISAMBIGUATION:
- Identify the company’s official domain by checking the official website, LinkedIn, Crunchbase, and trusted news.
- If multiple candidates appear, list up to two with domain and brief reason for the match.
- Only research the candidate with confidence ≥ 0.7.
- If confidence < 0.7, state low confidence and provide candidate options; do NOT invent data.

2) TRUSTED SOURCES & CLAIMS:
- Consider only trusted sources as defined above.
- Mark any claims from less reliable sources as “untrusted” and lower confidence.
- Every claim must cite a trusted source with a clickable markdown link.

3) CONTACT & EMAILS:
- Find CEO, CTO, founders, hiring managers, or senior engineers from LinkedIn or official pages.
- Include official emails from trusted sources; mark contact.likely = false.
- If no official email, infer a likely email pattern only if consistent patterns appear in ≥ 2 trusted sources.
- Provide brief evidence for inferred patterns and mark contact.likely = true.
- If uncertain, omit email and mark confidence accordingly.
- Provide a confidence score (0.0 to 1.0) for the contact details.

4) OUTPUT FORMAT:

Generate a human readble report with proper headlines as follows:

## Company Overview

Two to three sentences summarizing the company’s core business, products, and market focus.

## Key Business Points

- Bullet 1: Funding history summary and latest round, e.g., "Raised $38M in Series B led by QED Investors." [Crunchbase](https://crunchbase.com/link)
- Bullet 2: Top technologies used, e.g., "Uses AI-powered tax engine, API-first infrastructure." [Company Blog](https://company.com/blog)
- Bullet 3: Recent product updates or launches. [TechCrunch](https://techcrunch.com/link)
- Bullet 4: Technical challenges or market pain points. [BusinessWire](https://businesswire.com/link)
- Bullet 5: Leadership details if relevant. [LinkedIn](https://linkedin.com/company)

## Contact Information

- Name: Jane Doe
- Title: CEO
- Email: jane.doe@company.com (likely inferred from consistent email pattern)
- Confidence Score: 0.85

## Confidence Assessment

High confidence: The information is sourced from multiple official and reputable sources including the company website and Crunchbase. The contact email is inferred with consistent patterns verified across official domains.

---

If any data is unavailable or confidence is low, explicitly mention this instead of fabricating details.

`;

const prompt = [
  `Company: ${input.company}${input.domain ? ` (${input.domain})` : ''}`,
  `Role: ${input.role}`,
  `
Use the instructions above to generate a detailed company research report.
`
].join("\n");


  const res = await callPerplexity(prompt, {
    model: "sonar",
    maxTokens: 1000,
    temperature: 0.2,
    systemPrompt,
  });
  console.log("Research agent: ", res);

  
  // Return the raw text response - no JSON parsing needed
  const normalized: ResearchAgentOutput = {
    summary: typeof res === 'string' ? res : res.summary || String(res),
    points: [],
    sources: [],
    contact: undefined,
  };
  return normalized;
}


