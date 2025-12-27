/**
 * Message Generator
 *
 * Generates personalized LinkedIn and email messages
 */

import Groq from 'groq-sdk';
import { MESSAGE_DRAFTING_PROMPT, formatPrompt } from '@/lib/prompts/systemPrompts';

export interface MessageGenerationParams {
  company: string;
  contactName?: string;
  contactTitle?: string;
  role: string;
  companyResearch?: string;
  resumeContent?: string;
  tone?: string;
  messageType: 'linkedin' | 'email';
}

export interface GeneratedMessage {
  subject?: string; // Email only
  message: string;
  wordCount: number;
  personalizationNotes: string;
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Generate personalized message
 */
export async function generateMessage(
  params: MessageGenerationParams
): Promise<GeneratedMessage> {
  try {
    const {
      company,
      contactName,
      contactTitle,
      role,
      companyResearch,
      resumeContent,
      tone,
      messageType,
    } = params;

    const wordCount = messageType === 'linkedin' ? '44 words' : '90-100 words';

    const prompt = formatPrompt(MESSAGE_DRAFTING_PROMPT, {
      MESSAGE_TYPE: messageType,
      COMPANY_NAME: company,
      CONTACT_NAME: contactName || 'Hiring Manager',
      CONTACT_TITLE: contactTitle || '',
      TARGET_ROLE: role,
      COMPANY_RESEARCH: companyResearch || 'No specific research available',
      USER_RESUME: resumeContent || 'No resume provided',
      TONE: tone || 'professional',
      WORD_COUNT: wordCount,
    });

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7, // Higher for creative writing
      max_tokens: 500,
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

    return {
      subject: parsed.subject,
      message: parsed.message,
      wordCount: parsed.word_count || 0,
      personalizationNotes: parsed.personalization_notes || '',
    };
  } catch (error) {
    console.error('[messageGenerator] Error:', error);
    throw new Error('Failed to generate message');
  }
}
