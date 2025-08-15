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
7. For company and contact details:
   - Cross-check the company name against trusted sources to prevent hallucinations.
   - For emails, first attempt to find them from trusted sources.
   - If no reliable email found, infer a plausible one based on common corporate patterns (firstname.lastname@domain), and clearly mark it as "inferred".
   - Always try to provide contact information - only omit if absolutely no reasonable inference can be made.
   - When inferring contacts, use the most senior relevant person (CEO, department head, etc.).

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
    "name": "string",
    "title": "string",
    "email": "string",
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
- Search for contact emails in official/trusted sources; if unavailable, infer a likely format and mark as "inferred".
- Return ONLY the JSON object specified in the schema. No explanations, no markdown, no extra text.
`;

  console.log('[VerifyAgent] Starting verification with input research data:', {
    hasSummary: !!input.research?.summary,
    pointsCount: input.research?.points?.length || 0,
    hasContact: !!input.research?.contact
  });

  const { content } = await callGroq(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { model: "llama3-70b-8192", temperature: 0.2 }
  );

  console.log('[VerifyAgent] Raw response from Groq:', content.slice(0, 300) + '...');

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
    
    console.log('[VerifyAgent] Cleaned content for parsing:', cleanContent.slice(0, 200) + '...');
    
    const parsed = JSON.parse(cleanContent);
    // Ensure shape and sources present for each point
    const points = Array.isArray(parsed.points)
      ? parsed.points.filter((p: any) => p?.claim && p?.source?.url)
      : [];
    const summary: string = typeof parsed.summary === "string" ? parsed.summary : "";
    const contact = parsed.contact;
    console.log("Verified Output: ", { summary, points, contact });
    return { summary, points, contact } as VerifyAgentOutput;
  } catch (parseError) {
    console.error('[VerifyAgent] Failed to parse JSON response:', parseError);
    console.log('[VerifyAgent] Raw content:', content);
    // Return a more structured fallback instead of using raw content as summary
    return { 
      summary: "Verification step encountered parsing issues. Original research data should be preserved.", 
      points: [],
      contact: undefined 
    };
  }
}


