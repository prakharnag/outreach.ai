/**
 * Intent Detection
 *
 * Classifies user messages into intent categories using Groq LLM
 */

import Groq from 'groq-sdk';
import { INTENT_CLASSIFICATION_PROMPT, formatPrompt } from '@/lib/prompts/systemPrompts';

export type Intent =
  | 'icp_generation'
  | 'job_discovery'
  | 'company_research'
  | 'message_drafting'
  | 'application_help'
  | 'general_question';

export interface IntentResult {
  intent: Intent;
  confidence: number;
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Detect user intent from message
 */
export async function detectIntent(
  message: string,
  context?: string
): Promise<IntentResult> {
  try {
    const prompt = formatPrompt(INTENT_CLASSIFICATION_PROMPT, {
      USER_MESSAGE: message,
      CONTEXT: context || 'No previous context',
    });

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistent classification
      max_tokens: 20,
    });

    const intentText = response.choices[0]?.message?.content?.trim().toLowerCase() || 'general_question';

    // Map response to valid intent
    const intent = mapToValidIntent(intentText);

    return {
      intent,
      confidence: 0.9, // TODO: Calculate actual confidence
    };
  } catch (error) {
    console.error('[intentDetection] Error:', error);
    // Default to general_question on error
    return {
      intent: 'general_question',
      confidence: 0.5,
    };
  }
}

/**
 * Map LLM response to valid intent type
 */
function mapToValidIntent(text: string): Intent {
  const validIntents: Intent[] = [
    'icp_generation',
    'job_discovery',
    'company_research',
    'message_drafting',
    'application_help',
    'general_question',
  ];

  // Check if response contains any valid intent
  for (const intent of validIntents) {
    if (text.includes(intent)) {
      return intent;
    }
  }

  // Fallback: keyword matching
  if (text.includes('icp') || text.includes('criteria') || text.includes('looking for')) {
    return 'icp_generation';
  }
  if (text.includes('find') || text.includes('discover') || text.includes('search')) {
    return 'job_discovery';
  }
  if (text.includes('research') || text.includes('about') || text.includes('tell me')) {
    return 'company_research';
  }
  if (text.includes('draft') || text.includes('message') || text.includes('email')) {
    return 'message_drafting';
  }
  if (text.includes('apply') || text.includes('application')) {
    return 'application_help';
  }

  return 'general_question';
}
