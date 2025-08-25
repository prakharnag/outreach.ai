import { callGroq } from "./api";

export type VerifyAgentInput = {
  research: {
    summary: string;
    points: Array<{ claim: string; source?: { title: string; url: string } }>;
    sources?: Array<{ title: string; url: string }>;
    contact?: { 
      primary_contact?: { name: string; title: string; email?: string; source?: { title: string; url: string }; contact_type?: string };
      secondary_contact?: { name: string; title: string; email?: string; source?: { title: string; url: string }; contact_type?: string };
    } | { name: string; title: string; email?: string; source?: { title: string; url: string } }; // legacy format
  };
};

export type VerifyAgentOutput = {
  summary: string;
  points: Array<{ claim: string; source: { title: string; url: string } }>;
  contact?: { 
    primary_contact: { name: string; title: string; email?: string; source?: { title: string; url: string }; contact_type?: string };
    secondary_contact: { name: string; title: string; email?: string; source?: { title: string; url: string }; contact_type?: string };
  };
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
7. For company and contact details:
   - Cross-check the company name against trusted sources to prevent hallucinations.
   - ALWAYS try to provide TWO contacts: primary (hiring manager/talent acquisition) and secondary (leadership/engineering).
   - Primary contact MUST be hiring-related when possible (hiring manager, talent acquisition, HR director).
   - If no hiring contact available, promote best leadership contact to primary and find another for secondary.
   - Secondary contact should be leadership (CEO, CTO, department head) relevant to the role.
   - Use actual job titles from research sources - never use generic labels like "Inferred Hiring Manager".
   - For emails, first attempt to find them from trusted sources.
   - If no reliable email found, infer a plausible one based on common corporate patterns (firstname.lastname@domain), and clearly mark it as "inferred".
   - Only omit contacts if absolutely no reasonable inference can be made from any sources.
   - NEVER include "N/A", "Not Available", or placeholder text in contact fields.
   - If contact information is not available or unreliable, omit the entire contact object rather than including empty/placeholder values.
   - Each contact must have at least a name AND title to be included.

CRITICAL: Output ONLY valid JSON matching this exact schema. No explanations, no extra text, no markdown formatting:
{
  "summary": "string",
  "points": [
    {
      "claim": "string",
      "source": { "title": "string", "url": "string" }
    }
  ],
  "contact": {
    "primary_contact": {
      "name": "string",
      "title": "string",
      "email": "string",
      "inferred": boolean,
      "contact_type": "hiring",
      "source": { "title": "string", "url": "string" }
    },
    "secondary_contact": {
      "name": "string",
      "title": "string",
      "email": "string",
      "inferred": boolean,
      "contact_type": "leadership",
      "source": { "title": "string", "url": "string" }
    }
  }
}
    "inferred": boolean,
    "source": { "title": "string", "url": "string" }
  }
}

Return ONLY the JSON object. No markdown, no explanations, no additional text.`;
const user = `
Verify and refine the following research data. Return ONLY valid JSON with no extra text:

${JSON.stringify(input.research)}

Requirements:
- Keep only claims with credible sources; attach title + URL.
- Exclude unverifiable or outdated claims (>12 months old), unless explicitly noted as historical.
- Check company names for accuracy from trusted sources.
- ALWAYS provide TWO contacts when any contact information is available.
- Primary contact should be hiring/talent acquisition role when possible; otherwise use senior leadership.
- Secondary contact should be leadership or department head relevant to the role.
- Use actual job titles from sources - avoid generic labels like "Inferred Hiring Manager".
- Search for contact emails in official/trusted sources; if unavailable, infer likely format and mark as "inferred".
- Each contact must have name AND title - never include partial or placeholder data.
- Do NOT include contacts with "N/A", "Not Available", or empty values - omit contact fields entirely if no valid information available.
- Only include contact information when you have actual names, titles, or verifiable emails.
- Return ONLY the JSON object specified in the schema. No explanations, no markdown, no extra text.
`;

  const { content } = await callGroq(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { model: "llama3-70b-8192", temperature: 0.2 }
  );

  try {
    // Clean the content to ensure it's valid JSON - similar to messaging agent
    let cleanContent = content.trim();
    
    // Remove any text before the first {
    const firstBrace = cleanContent.indexOf('{');
    if (firstBrace > 0) {
      cleanContent = cleanContent.substring(firstBrace);
    }
    
    // Remove any text after the last }
    const lastBrace = cleanContent.lastIndexOf('}');
    if (lastBrace >= 0 && lastBrace < cleanContent.length - 1) {
      cleanContent = cleanContent.substring(0, lastBrace + 1);
    }
    
    const parsed = JSON.parse(cleanContent);
    // Ensure shape and sources present for each point
    const points = Array.isArray(parsed.points)
      ? parsed.points.filter((p: any) => p?.claim && p?.source?.url)
      : [];
    const summary: string = typeof parsed.summary === "string" ? parsed.summary : "";
    const contact = parsed.contact;
    return { summary, points, contact } as VerifyAgentOutput;
  } catch (parseError) {
    // Return a more structured fallback instead of using raw content as summary
    return { 
      summary: "Verification step encountered parsing issues. Original research data should be preserved.", 
      points: [],
      contact: undefined 
    };
  }
}


