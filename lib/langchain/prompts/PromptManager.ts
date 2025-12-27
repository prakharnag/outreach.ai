import { readFileSync } from 'fs';
import { join } from 'path';
import type { WritingTone } from '@/lib/tones';

/**
 * Parsed tone configuration from .txt file
 */
export interface TonePromptData {
  tone: string;
  description: string;
  systemInstruction: string;
  linkedinExample: string;
  emailExample: string;
}

/**
 * Message prompt composition parameters
 */
export interface MessagePromptParams {
  company: string;
  role: string;
  highlights: string;
  verified_data: string;
  contact_info: string;
  tone: WritingTone;
  resume_content?: string;
}

/**
 * PromptManager - Centralized prompt loading and caching
 *
 * Security: All prompts include built-in guardrails against prompt injection
 * Performance: Prompts are loaded once and cached in memory
 * Maintainability: Prompts are stored in .txt files for easy editing
 *
 * NOTE: This implementation uses Node.js fs module for server-side loading.
 * For Edge Runtime compatibility, prompts should be bundled at build time
 * or loaded via environment variables.
 */
export class PromptManager {
  private static promptCache: Map<string, string> = new Map();
  private static toneCache: Map<WritingTone, TonePromptData> = new Map();
  private static promptsDir = join(process.cwd(), 'lib', 'langchain', 'prompts');

  /**
   * Load a prompt template from file
   * @param name - Prompt name (e.g., 'research', 'verify', 'message_base')
   * @returns Raw prompt content
   */
  static load(name: string): string {
    // Check cache first
    if (this.promptCache.has(name)) {
      return this.promptCache.get(name)!;
    }

    // Load from file
    try {
      const filePath = join(this.promptsDir, `${name}.txt`);
      const content = readFileSync(filePath, 'utf-8');

      // Cache for future use
      this.promptCache.set(name, content);

      return content;
    } catch (error) {
      console.error(`Failed to load prompt '${name}':`, error);
      throw new Error(`Prompt '${name}' not found or could not be loaded`);
    }
  }

  /**
   * Load and parse a tone prompt file
   * @param tone - Writing tone (e.g., 'formal', 'casual')
   * @returns Parsed tone data
   */
  static loadTone(tone: WritingTone): TonePromptData {
    // Check cache first
    if (this.toneCache.has(tone)) {
      return this.toneCache.get(tone)!;
    }

    // Load tone file
    try {
      const filePath = join(this.promptsDir, 'tones', `${tone}.txt`);
      const content = readFileSync(filePath, 'utf-8');

      // Parse tone file format:
      // TONE: [name]
      // DESCRIPTION: [desc]
      // SYSTEM INSTRUCTION: [instruction]
      // LINKEDIN EXAMPLE (44 words): [example]
      // EMAIL EXAMPLE (90-100 words): [example]

      const parsed = this.parseToneFile(content);

      // Cache for future use
      this.toneCache.set(tone, parsed);

      return parsed;
    } catch (error) {
      console.error(`Failed to load tone '${tone}':`, error);
      throw new Error(`Tone '${tone}' not found or could not be loaded`);
    }
  }

  /**
   * Parse tone file content into structured data
   * @private
   */
  private static parseToneFile(content: string): TonePromptData {
    const lines = content.split('\n');
    const data: Partial<TonePromptData> = {};

    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      // Check for section headers
      if (line.startsWith('TONE:')) {
        data.tone = line.replace('TONE:', '').trim();
      } else if (line.startsWith('DESCRIPTION:')) {
        data.description = line.replace('DESCRIPTION:', '').trim();
      } else if (line.startsWith('SYSTEM INSTRUCTION:')) {
        currentSection = 'systemInstruction';
        currentContent = [line.replace('SYSTEM INSTRUCTION:', '').trim()];
      } else if (line.match(/^LINKEDIN EXAMPLE/)) {
        // Save previous section if any
        if (currentSection === 'systemInstruction') {
          data.systemInstruction = currentContent.join('\n').trim();
        }
        currentSection = 'linkedin';
        currentContent = [];
      } else if (line.match(/^EMAIL EXAMPLE/)) {
        // Save LinkedIn example
        if (currentSection === 'linkedin') {
          data.linkedinExample = currentContent.join('\n').trim();
        }
        currentSection = 'email';
        currentContent = [];
      } else if (line.trim() !== '') {
        // Accumulate content for current section
        currentContent.push(line);
      }
    }

    // Save last section (email example)
    if (currentSection === 'email') {
      data.emailExample = currentContent.join('\n').trim();
    }

    // Validate all required fields are present
    if (!data.tone || !data.description || !data.systemInstruction ||
        !data.linkedinExample || !data.emailExample) {
      throw new Error('Invalid tone file format: missing required sections');
    }

    return data as TonePromptData;
  }

  /**
   * Compose a complete message generation prompt
   * Combines base message prompt + tone + dynamic parameters
   *
   * @param params - Message prompt parameters
   * @returns Complete formatted prompt ready for LLM
   */
  static formatMessagePrompt(params: MessagePromptParams): string {
    // Load base message template
    const baseTemplate = this.load('message_base');

    // Load tone data
    const toneData = this.loadTone(params.tone);

    // Replace placeholders in base template
    let prompt = baseTemplate
      .replace(/{company}/g, params.company)
      .replace(/{role}/g, params.role)
      .replace(/{highlights}/g, params.highlights)
      .replace(/{verified_data}/g, params.verified_data)
      .replace(/{contact_info}/g, params.contact_info)
      .replace(/{tone}/g, params.tone)
      .replace(/{resume_content}/g, params.resume_content || 'Not provided')
      .replace(/{tone_description}/g, toneData.systemInstruction)
      .replace(/{tone_example_linkedin}/g, toneData.linkedinExample)
      .replace(/{tone_example_email}/g, toneData.emailExample);

    return prompt;
  }

  /**
   * Format research prompt with parameters
   * @param company - Company name
   * @param role - Target role
   * @param domain - Optional company domain
   */
  static formatResearchPrompt(company: string, role: string, domain?: string): string {
    const template = this.load('research');
    return template
      .replace(/{company}/g, company)
      .replace(/{role}/g, role)
      .replace(/{domain}/g, domain || 'Not provided');
  }

  /**
   * Format verification prompt with research data
   * @param research_data - JSON string of research data to verify
   */
  static formatVerifyPrompt(research_data: string): string {
    const template = this.load('verify');
    return template.replace(/{research_data}/g, research_data);
  }

  /**
   * Clear all cached prompts (useful for testing or prompt updates)
   */
  static clearCache(): void {
    this.promptCache.clear();
    this.toneCache.clear();
  }

  /**
   * Preload all prompts into cache (useful for production to avoid cold start latency)
   * Call this during application initialization
   */
  static preloadAll(): void {
    const prompts = ['research', 'verify', 'message_base'];
    const tones: WritingTone[] = ['formal', 'casual', 'friendly', 'intellectual', 'confident', 'conversational'];

    // Load all base prompts
    for (const prompt of prompts) {
      try {
        this.load(prompt);
      } catch (error) {
        console.warn(`Failed to preload prompt '${prompt}':`, error);
      }
    }

    // Load all tone prompts
    for (const tone of tones) {
      try {
        this.loadTone(tone);
      } catch (error) {
        console.warn(`Failed to preload tone '${tone}':`, error);
      }
    }

    console.log(`Preloaded ${this.promptCache.size} prompts and ${this.toneCache.size} tones`);
  }
}
