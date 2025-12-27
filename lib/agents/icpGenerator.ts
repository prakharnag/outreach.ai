/**
 * ICP Generator
 *
 * Extracts Ideal Customer Profile criteria from user messages
 */

import Groq from 'groq-sdk';
import { ICP_GENERATION_PROMPT, formatPrompt } from '@/lib/prompts/systemPrompts';
import type { ICPProfile } from '@/lib/conversation/conversationManager';

export interface ICPGenerationResult {
  icp: Partial<ICPProfile>;
  needsClarification: boolean;
  clarifyingQuestions?: string[];
  response: string;
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Generate or update ICP from user message
 */
export async function generateICP(
  message: string,
  currentICP?: ICPProfile
): Promise<ICPGenerationResult> {
  try {
    const prompt = formatPrompt(ICP_GENERATION_PROMPT, {
      USER_MESSAGE: message,
      CURRENT_ICP: currentICP ? JSON.stringify(currentICP, null, 2) : 'None',
    });

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Fallback: try parsing entire content
      parsed = JSON.parse(content);
    }

    // Build response message
    const responseMessage = buildICPResponseMessage(parsed, currentICP);

    return {
      icp: {
        target_roles: parsed.target_roles || [],
        industries: parsed.industries || [],
        company_sizes: parsed.company_sizes || [],
        locations: parsed.locations || [],
        tech_stack: parsed.tech_stack || [],
      },
      needsClarification: parsed.needs_clarification || false,
      clarifyingQuestions: parsed.clarifying_questions || [],
      response: responseMessage,
    };
  } catch (error) {
    console.error('[icpGenerator] Error:', error);
    throw new Error('Failed to generate ICP');
  }
}

/**
 * Build user-friendly response message
 */
function buildICPResponseMessage(
  parsed: any,
  currentICP?: ICPProfile
): string {
  const parts: string[] = [];

  if (parsed.needs_clarification) {
    parts.push("I'd like to understand your preferences better:\n");
    parsed.clarifying_questions?.forEach((q: string, i: number) => {
      parts.push(`${i + 1}. ${q}`);
    });
  } else {
    parts.push("Great! Here's your Ideal Customer Profile:\n");

    if (parsed.target_roles?.length > 0) {
      parts.push(`**Roles:** ${parsed.target_roles.join(', ')}`);
    }
    if (parsed.industries?.length > 0) {
      parts.push(`**Industries:** ${parsed.industries.join(', ')}`);
    }
    if (parsed.company_sizes?.length > 0) {
      parts.push(`**Company Sizes:** ${parsed.company_sizes.join(', ')}`);
    }
    if (parsed.locations?.length > 0) {
      parts.push(`**Locations:** ${parsed.locations.join(', ')}`);
    }
    if (parsed.tech_stack?.length > 0) {
      parts.push(`**Tech Stack:** ${parsed.tech_stack.join(', ')}`);
    }

    parts.push("\nWould you like me to find companies matching this profile?");
  }

  return parts.join('\n');
}
