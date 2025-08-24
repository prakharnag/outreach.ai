import { callPerplexity, ResearchResult } from "./api";

export type TrustedContact = {
  name: string;
  title: string;
  email?: string; // clickable in UI if present
  source?: { title: string; url: string };
  inferred?: boolean;
  confidence_score?: number;
  contact_type?: 'hiring' | 'leadership';
};

export type ContactInformation = {
  primary_contact: TrustedContact;
  secondary_contact: TrustedContact;
};

export type ResearchAgentInput = { company: string; domain?: string; role: string };
export type ResearchPoint = { claim: string; source?: { title: string; url: string } };
export type ResearchAgentOutput = ResearchResult & {
  points: ResearchPoint[];
  contact?: ContactInformation;
};

export async function researchAgent(input: ResearchAgentInput): Promise<ResearchAgentOutput> {
  const systemPrompt = `
You are a precision-focused company research assistant.

**Objective:** Produce a **human-readable** company research report **in JSON format** with clearly labeled keys and structured data.  
Do **not** output markdown formatting, code blocks, or numbered citations like [1], [2], [3].  

---

## Core Rules
1. **No Hallucination:** If information is uncertain or unavailable, explicitly state the limitation.  
2. **Recent Information Priority:** Prioritize information from the last 12-18 months. Mark older information with timeframes.
3. **Source Priority:** Only use trusted sources:
   - Official company websites/domains
   - Official blogs or press releases  
   - LinkedIn company profile (check for recent updates)
   - Crunchbase or reputable VC/startup databases (Sequoia Capital, Y Combinator, etc.)
   - Major tech/business press (TechCrunch, BusinessWire, Forbes, etc.)
   - Recent company announcements, product launches, or funding rounds
4. **Citation Style:** Each claim from an external source must include a "source_url" field with the clickable link.  
   No numeric references (e.g., [1][3][5]).

---

## 1) Disambiguation
- Identify the **official domain** via official website, LinkedIn, Crunchbase, or trusted press.  
- If multiple matches exist, list up to two candidates with: domain, reason, and confidence (0.00–1.00).  
- Only continue research if the top candidate's confidence ≥ 0.70; otherwise, set "confidence": "low" and list candidates without guessing.

---

## 2) Trusted Sources & Claims
- Treat only the above sources as trusted.  
- If a claim comes from a less reliable source, mark "trusted": false and lower overall confidence.  
- Every claim must include a "source_url" field.

---

## 3) Contact & Emails
- Identify TWO key contacts with this priority structure:
  1. **Primary Contact**: MUST be either a hiring manager, talent acquisition specialist, or HR director
  2. **Secondary Contact**: Can be CEO, CTO, founders, or senior engineers relevant to the role
- Search LinkedIn, official team pages, and company websites for both contacts
- If a public email is found on a trusted source, include it.  
- For contact email inference, try these approaches in order:
  1. Check official websites for contact patterns (team pages, press contacts, etc.)
  2. Look for executive emails in press releases or official announcements
  3. If no direct email found, infer using common corporate patterns:
     - firstname.lastname@domain.com
     - firstname@domain.com  
     - flastname@domain.com
     - first.last@domain.com
- **CONTACT REQUIREMENTS**:
  - Always prioritize finding a hiring manager or talent acquisition contact as the primary contact
  - If no hiring/talent acquisition contact can be found, clearly state this limitation
  - Only include contacts if you have at least a name OR a reasonable email inference
  - Mark inferred emails with "inferred": true and provide confidence reasoning
  - Provide a "confidence_score" (0.00–1.00) for each contact
- Prefer recent leadership information (check for recent changes or appointments)

---

## 4) Output Format (JSON only)

{
  "company_overview": "2–3 sentences summarizing the company's core business, products, and market focus.",
  "key_business_points": {
    "funding_summary": { "description": "...", "source_url": "https://..." },
    "top_technologies": { "description": "...", "source_url": "https://..." },
    "recent_product_updates": { "description": "...", "source_url": "https://..." },
    "technical_challenges": { "description": "...", "source_url": "https://..." },
    "leadership_details": { "description": "...", "source_url": "https://..." }
  },
  "contact_information": {
    "primary_contact": {
      "name": "Sarah Johnson",
      "title": "Talent Acquisition Manager", 
      "email": "sarah.johnson@company.com",
      "inferred": true,
      "confidence_score": 0.85,
      "contact_type": "hiring"
    },
    "secondary_contact": {
      "name": "John Smith",
      "title": "Engineering Director", 
      "email": "john.smith@company.com",
      "inferred": false,
      "confidence_score": 0.90,
      "contact_type": "leadership"
    }
  },
  "confidence_assessment": {
    "level": "High/Medium/Low",
    "explanation": "Brief explanation referencing source quality."
  }
}

**CRITICAL**: 
- Always provide TWO contacts: primary (hiring/talent acquisition) and secondary (leadership/engineering)
- If no hiring manager or talent acquisition specialist can be found, clearly state this in the confidence assessment
- Do NOT include "contact_information" with "N/A" values or explanatory text
- Only include contacts when you have actual name/title/email data
- Primary contact MUST be hiring-related role when possible

---

If any section cannot be completed with high confidence, clearly state so instead of fabricating.
`;

  const prompt = [
    `Company: ${input.company}${input.domain ? ` (${input.domain})` : ''}`,
    `Role: ${input.role}`,
    `Use the above instructions to generate a complete, verified company research report.`
  ].join("\n");

  const res = await callPerplexity(prompt, {
    model: "sonar",
    maxTokens: 1000,
    temperature: 0.2,
    systemPrompt,
  });

  // The callPerplexity function already parses JSON, so we can use the result directly
  // Check if the result has the expected structure
  const resAny = res as any;
  if (resAny && typeof resAny === 'object' && (resAny.company_overview || resAny.key_business_points)) {
    // The result is already in the right format, return it directly
    return resAny;
  } else {
    // Fallback: return the result as is
    return resAny;
  }
}


