/**
 * Job Discovery
 *
 * Searches for companies and jobs using Groq Compound (web search)
 */

import Groq from 'groq-sdk';
import { JOB_DISCOVERY_PROMPT, formatPrompt } from '@/lib/prompts/systemPrompts';
import type { ICPProfile } from '@/lib/conversation/conversationManager';

export interface Company {
  name: string;
  domain: string;
  description: string;
  match_reason: string;
  open_roles?: string[];
  funding_stage?: string;
  source_url: string;
}

export interface JobDiscoveryResult {
  companies: Company[];
  searchSummary: string;
  response: string;
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Discover jobs/companies using web search
 */
export async function discoverJobs(
  icp: Partial<ICPProfile>
): Promise<JobDiscoveryResult> {
  try {
    const prompt = formatPrompt(JOB_DISCOVERY_PROMPT, {
      TARGET_ROLES: icp.target_roles?.join(', ') || 'Any',
      INDUSTRIES: icp.industries?.join(', ') || 'Any',
      COMPANY_SIZES: icp.company_sizes?.join(', ') || 'Any',
      LOCATIONS: icp.locations?.join(', ') || 'Any',
      TECH_STACK: icp.tech_stack?.join(', ') || 'Any',
    });

    const response = await groq.chat.completions.create({
      model: 'groq/compound', // Web search enabled
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = JSON.parse(content);
    }

    const companies: Company[] = parsed.companies || [];
    const searchSummary = parsed.search_summary || `Found ${companies.length} companies`;

    // Build response message
    const responseMessage = buildJobDiscoveryResponse(companies, searchSummary);

    return {
      companies,
      searchSummary,
      response: responseMessage,
    };
  } catch (error) {
    console.error('[jobDiscovery] Error:', error);
    throw new Error('Failed to discover jobs');
  }
}

/**
 * Build user-friendly response
 */
function buildJobDiscoveryResponse(
  companies: Company[],
  summary: string
): string {
  const parts: string[] = [];

  parts.push(summary);
  parts.push('');

  companies.forEach((company, i) => {
    parts.push(`**${i + 1}. ${company.name}**`);
    parts.push(`${company.description}`);
    parts.push(`*Why it matches:* ${company.match_reason}`);

    if (company.open_roles && company.open_roles.length > 0) {
      parts.push(`*Open roles:* ${company.open_roles.join(', ')}`);
    }

    if (company.funding_stage) {
      parts.push(`*Funding:* ${company.funding_stage}`);
    }

    parts.push('');
  });

  parts.push("Would you like me to research any of these companies in detail or draft messages?");

  return parts.join('\n');
}
