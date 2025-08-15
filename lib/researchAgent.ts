import { callPerplexity, ResearchResult } from "./api";

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

**Objective:** Produce a **human-readable** company research report in markdown format with clear headings, bullet points, and clickable links.  
Do **not** output JSON, code blocks, numbered citations like [1], [2], [3], or any other technical formatting.

---

## Core Rules
1. **No Hallucination:** If information is uncertain or unavailable, explicitly state the limitation.  
2. **Source Priority:** Only use trusted sources:
   - Official company websites/domains
   - Official blogs or press releases
   - LinkedIn company profile
   - Crunchbase or reputable VC/startup databases (Sequoia Capital, Y Combinator, etc.)
   - Major tech/business press (TechCrunch, BusinessWire, Forbes, etc.)
3. **Citation Style:** Each claim from an external source must end with a clickable markdown link:  
   [Source Title](https://...)  
   No numeric references (e.g., [1][3][5]).

---

## 1) Disambiguation
- Identify the **official domain** via official website, LinkedIn, Crunchbase, or trusted press.  
- If multiple matches exist, list up to two candidates with: Domain – reason – confidence x.xx.  
- Only continue research if the top candidate’s confidence ≥ 0.70; otherwise, state low confidence and list candidates without guessing.

---

## 2) Trusted Sources & Claims
- Treat only the above sources as trusted.  
- If a claim comes from a less reliable source, mark it “(untrusted)” and lower overall confidence.  
- Every claim must include an inline markdown link to its source.

---

## 3) Contact & Emails
- Identify key people (CEO, CTO, founders, hiring managers, or senior engineers) from LinkedIn or official pages.  
- If a public email is found on a trusted source, include it.  
- If no public email:
  - Infer a likely email only if a **consistent pattern** (e.g., first.last@domain) appears in ≥ 2 trusted sources.
  - Briefly explain the evidence and mark as "(inferred)".
- Provide a **confidence score** (0.00–1.00) for contact details.

---

## 4) Output Format (Markdown, no code blocks)

### Company Overview
2–3 sentences summarizing the company’s core business, products, and market focus.

### Key Business Points
- Funding summary and latest round … [Crunchbase](https://...)
- Top technologies used … [Company Blog](https://...)
- Recent product updates or launches … [TechCrunch](https://...)
- Technical challenges or market pain points … [BusinessWire](https://...)
- Leadership details if relevant … [LinkedIn](https://...)

### Contact Information
- Name: Jane Doe  
- Title: CEO  
- Email: jane.doe@company.com (inferred via consistent pattern)  
- Contact Confidence: 0.85

### Confidence Assessment
High/Medium/Low – brief explanation referencing source quality.

---

If any section cannot be completed with high confidence, clearly state so instead of fabricating.
`;

const prompt = [
  `Company: ${input.company}${input.domain ? ` (${input.domain})` : ''}`,
  `Role: ${input.role}`,
  `\nUse the above instructions to generate a complete, verified company research report.`
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


