import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatGroq } from "@langchain/groq";
import { MessageToolInputSchema, MessageSchema, type Message } from "../schemas";
import { PromptManager } from "../prompts/PromptManager";
import { safeParseWithSchema } from "../schemas";
import { getContactNameForGreeting } from "../schemas/contact";
import type { WritingTone } from "@/lib/tones";

/**
 * MessageGenerationTool - Generate personalized outreach messages with tone support
 *
 * This tool replaces the old messagingAgent.ts with a LangChain-based implementation
 * that eliminates ALL manual JSON cleaning and parsing code (~170 lines).
 *
 * Key improvements over old implementation:
 * - Uses withStructuredOutput() for automatic Zod validation (no manual parsing)
 * - No JSON artifact cleaning (cleanJsonArtifacts, validateLinkedInMessage, etc.)
 * - No manual newline escaping or control character handling
 * - Type-safe output guaranteed by Zod schema
 * - Automatic fallback handling through schema refinements
 *
 * Security: Built-in prompt injection guardrails
 * Reliability: Zod validation catches malformed output
 * Maintainability: Prompts in .txt files, tone composition via PromptManager
 */
export class MessageGenerationTool extends DynamicStructuredTool {
  name = "generate_messages";
  description = `Generate personalized LinkedIn and email outreach messages.
    Use this tool after verifying research data to create:
    - LinkedIn connection message (exactly 44 words, conversational)
    - Cold email (90-100 words, professional with proper structure)

    Both messages will be personalized with company insights, contact names,
    and user's background/highlights. Tone can be customized (formal, casual, etc.).

    Input: verified data, company, role, highlights, tone, optional resume
    Output: JSON with linkedin and email message strings`;

  schema = MessageToolInputSchema;

  constructor() {
    super({
      name: "generate_messages",
      description: `Generate personalized LinkedIn and email outreach messages.
        Use this tool after verifying research data to create:
        - LinkedIn connection message (exactly 44 words, conversational)
        - Cold email (90-100 words, professional with proper structure)

        Both messages will be personalized with company insights, contact names,
        and user's background/highlights. Tone can be customized (formal, casual, etc.).

        Input: verified data, company, role, highlights, tone, optional resume
        Output: JSON with linkedin and email message strings`,
      schema: MessageToolInputSchema,
      func: async (input) => {
        return await this.generateMessages(input);
      }
    });
  }

  /**
   * Generate outreach messages using Groq LLM
   * @private
   */
  private async generateMessages(input: {
    verified_data: string;
    company: string;
    role: string;
    highlights: string;
    tone?: WritingTone;
    resume_content?: string;
  }): Promise<string> {
    // Check for API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("[MessageGenerationTool] GROQ_API_KEY not found, returning mock messages");
      return this.getMockMessages(input);
    }

    try {
      // Parse verified data to extract contact info
      let contactInfo = "Contact not available";
      let contactForGreeting = "there"; // Default fallback

      try {
        const verified = JSON.parse(input.verified_data);
        if (verified.contact) {
          contactForGreeting = getContactNameForGreeting(verified.contact);

          // Format contact info for prompt
          if (verified.contact.primary_contact) {
            contactInfo = `Primary Contact: ${verified.contact.primary_contact.name || 'N/A'} - ${verified.contact.primary_contact.title || 'N/A'}`;
            if (verified.contact.secondary_contact) {
              contactInfo += `\nSecondary Contact: ${verified.contact.secondary_contact.name || 'N/A'} - ${verified.contact.secondary_contact.title || 'N/A'}`;
            }
          } else if (verified.contact.name) {
            // Legacy single contact format
            contactInfo = `Contact: ${verified.contact.name} - ${verified.contact.title || 'N/A'}`;
          }
        }
      } catch (parseError) {
        console.warn("[MessageGenerationTool] Could not parse verified_data for contact info");
      }

      // Load and format message prompt with tone composition
      const tone = (input.tone || 'formal') as WritingTone;
      const systemPrompt = PromptManager.formatMessagePrompt({
        company: input.company,
        role: input.role,
        highlights: input.highlights,
        verified_data: input.verified_data,
        contact_info: contactInfo,
        tone,
        resume_content: input.resume_content
      });

      // Initialize Groq LLM
      const llm = new ChatGroq({
        apiKey,
        model: "llama-3.3-70b-versatile",
        temperature: 0.5, // Higher temperature for creative messaging
      });

      // Use withStructuredOutput for automatic Zod validation
      // This eliminates ALL manual JSON parsing, cleaning, and validation code
      const structuredLLM = llm.withStructuredOutput(MessageSchema, {
        name: "message_output",
      });

      // Execute message generation
      const userPrompt = `Generate outreach messages now.

Contact for greeting: ${contactForGreeting}
Company: ${input.company}
Role: ${input.role}

Return the JSON with linkedin and email messages.`;

      const result = await structuredLLM.invoke([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]);

      // Validate result with safe parsing
      const parseResult = safeParseWithSchema(MessageSchema, result);

      if (!parseResult.success) {
        throw new Error("Message generation validation failed");
      }

      // Additional validation for message quality
      const finalResult = this.validateMessageQuality(parseResult.data, input, contactForGreeting);

      // Return as JSON string for agent
      return JSON.stringify(finalResult, null, 2);

    } catch (error) {
      console.error("[MessageGenerationTool] Error during message generation:", error);

      // Return fallback messages
      return this.getMockMessages(input);
    }
  }

  /**
   * Validate message quality and apply fallbacks if needed
   * @private
   */
  private validateMessageQuality(
    messages: Message,
    input: { company: string; role: string; highlights: string },
    contactName: string
  ): Message {
    let { linkedin, email } = messages;

    // Validate LinkedIn has greeting
    if (!linkedin.match(/^(Hi|Hey|Hello)/i)) {
      linkedin = `Hi ${contactName}! ${linkedin}`;
    }

    // Validate email has Subject line
    if (!email.toLowerCase().includes('subject:')) {
      email = `Subject: Interest in ${input.role} Position at ${input.company}\n\n${email}`;
    }

    // Ensure email has proper greeting
    const emailLines = email.split('\n');
    const bodyStart = emailLines.findIndex(line =>
      !line.toLowerCase().startsWith('subject:') && line.trim().length > 0
    );
    if (bodyStart > 0 && !emailLines[bodyStart].match(/^(Hi|Hey|Dear|Hello)/i)) {
      emailLines.splice(bodyStart, 0, `Dear ${contactName},`);
      email = emailLines.join('\n');
    }

    return { linkedin, email };
  }

  /**
   * Mock messages for development/testing when API key unavailable
   * @private
   */
  private getMockMessages(input: {
    company: string;
    role: string;
    highlights: string;
    tone?: WritingTone;
  }): string {
    const mockMessages: Message = {
      linkedin: `Hi there! I'm interested in the ${input.role} position at ${input.company}. With my background in ${input.highlights.split(',')[0] || 'relevant experience'}, I'd love to connect and learn more about your team's goals. Would you be open to a brief conversation? (Mock data - set GROQ_API_KEY)`,
      email: `Subject: Interest in ${input.role} Position at ${input.company}

Dear Hiring Manager,

I hope this email finds you well. I'm writing to express my interest in the ${input.role} position at ${input.company}.

With my background in ${input.highlights.split('.')[0] || 'relevant experience'}, I believe I could contribute meaningfully to your team. I'm particularly drawn to ${input.company}'s innovative approach and would love to discuss how my skills align with your current needs.

Would you be available for a brief conversation to explore this opportunity further?

Best regards

(Mock data - set GROQ_API_KEY for real messages)`
    };

    return JSON.stringify(mockMessages, null, 2);
  }
}

/**
 * Factory function to create MessageGenerationTool instance
 * Useful for dependency injection in tests
 */
export function createMessageGenerationTool(): MessageGenerationTool {
  return new MessageGenerationTool();
}
