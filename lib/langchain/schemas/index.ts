/**
 * LangChain Structured Output Schemas
 *
 * These Zod schemas define the structure for AI agent outputs.
 * Used with LangChain's `withStructuredOutput()` for type-safe parsing,
 * eliminating all manual JSON parsing code (~100 lines removed).
 */

import { z } from "zod";
import { ContactSchema } from "./contact";

// Re-export contact schema
export { ContactSchema, normalizeLegacyContact, isValidContact, getBestContact, getContactNameForGreeting } from "./contact";
export type { Contact, ContactPerson } from "./contact";

/**
 * Research Schema - Output from ResearchTool
 *
 * Defines the structure of company research data from Perplexity AI.
 * Includes company overview, key business points with sources, and contact information.
 */
export const ResearchSchema = z.object({
  company_overview: z.string()
    .min(50, "Company overview must be at least 50 characters")
    .max(500, "Company overview must be at most 500 characters")
    .describe("2-3 sentence company summary covering core business and market focus"),

  key_business_points: z.object({
    funding_summary: z.object({
      description: z.string().describe("Latest funding round, amount, investors"),
      source_url: z.string().url().describe("Source URL for funding information")
    }),
    top_technologies: z.object({
      description: z.string().describe("Top 5 technologies used by the company"),
      source_url: z.string().url().describe("Source URL for technology stack")
    }),
    recent_product_updates: z.object({
      description: z.string().describe("Recent product launches or updates (last 12 months)"),
      source_url: z.string().url().describe("Source URL for product information")
    }),
    technical_challenges: z.object({
      description: z.string().describe("Technical challenges the company is facing"),
      source_url: z.string().url().describe("Source URL for challenges")
    }),
    leadership_details: z.object({
      description: z.string().describe("Key leadership team members and their backgrounds"),
      source_url: z.string().url().describe("Source URL for leadership information")
    })
  }).describe("Structured business intelligence with source attribution"),

  contact_information: ContactSchema.optional().describe("Primary and secondary contacts with confidence scores"),

  confidence_assessment: z.object({
    level: z.enum(["High", "Medium", "Low"]).describe("Overall confidence in research quality"),
    explanation: z.string().describe("Brief explanation of confidence level based on source quality")
  })
});

export type Research = z.infer<typeof ResearchSchema>;

/**
 * Verification Schema - Output from VerifyTool
 *
 * Defines the structure of verified research data.
 * Filters out stale/unverifiable information and standardizes format.
 */
export const VerificationSchema = z.object({
  summary: z.string()
    .describe("Concise summary of verified company information"),

  points: z.array(z.object({
    claim: z.string().describe("Verified claim about the company"),
    source: z.object({
      title: z.string().describe("Source title or publication name"),
      url: z.string().url().describe("Source URL")
    }).describe("Trusted source for this claim")
  })).describe("Array of verified claims with source attribution"),

  contact: ContactSchema.optional().describe("Verified contact information (primary + secondary)")
});

export type Verification = z.infer<typeof VerificationSchema>;

/**
 * Message Schema - Output from MessageGenerationTool
 *
 * Defines the structure of generated outreach messages.
 * Includes strict validation for LinkedIn (20-80 words) and Email (90-150 words with subject).
 */
export const MessageSchema = z.object({
  linkedin: z.string()
    .min(20, "LinkedIn message too short")
    .max(500, "LinkedIn message too long")
    .refine(msg => {
      const words = msg.split(/\s+/).filter(word => word.length > 0);
      return words.length >= 20 && words.length <= 80;
    }, {
      message: "LinkedIn message must be 20-80 words"
    })
    .describe("LinkedIn connection message (exactly 44 words preferred, 20-80 words allowed)"),

  email: z.string()
    .min(100, "Email too short")
    .refine(email => email.toLowerCase().includes("subject:"), {
      message: "Email must include 'Subject:' line at the beginning"
    })
    .refine(email => {
      // Check for proper paragraph structure (not one long paragraph)
      const lines = email.split('\n').filter(line => line.trim().length > 0);
      return lines.length >= 4; // Subject + greeting + body paragraphs + closing
    }, {
      message: "Email must have proper paragraph structure with line breaks"
    })
    .refine(email => {
      const words = email.split(/\s+/).filter(word => word.length > 0);
      return words.length >= 90 && words.length <= 150;
    }, {
      message: "Email should be 90-150 words (excluding subject line)"
    })
    .describe("Cold email with Subject line, greeting, body paragraphs, and closing (90-100 words)")
});

export type Message = z.infer<typeof MessageSchema>;

/**
 * Rephrase Schema - Output from RephraseTool
 *
 * Simpler schema for rephrasing operations (tone changes).
 */
export const RephraseSchema = z.object({
  content: z.string()
    .min(10, "Rephrased content too short")
    .describe("Rephrased message with new tone applied")
});

export type Rephrase = z.infer<typeof RephraseSchema>;

/**
 * Agent Input Schemas
 *
 * Define the input structure for each tool.
 */

export const ResearchToolInputSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  domain: z.string().optional().describe("Company domain (e.g., stripe.com)"),
  role: z.string().min(1, "Role is required").describe("Target job role (e.g., Software Engineer)")
});

export type ResearchToolInput = z.infer<typeof ResearchToolInputSchema>;

export const VerifyToolInputSchema = z.object({
  research_data: z.string().describe("JSON string of research data to verify")
});

export type VerifyToolInput = z.infer<typeof VerifyToolInputSchema>;

export const MessageToolInputSchema = z.object({
  verified_data: z.string().describe("JSON string of verified research data"),
  company: z.string().min(1, "Company name is required"),
  role: z.string().min(1, "Role is required"),
  highlights: z.string().describe("User's key highlights or background"),
  tone: z.enum(["formal", "casual", "friendly", "intellectual", "confident", "conversational"])
    .optional()
    .default("formal")
    .describe("Writing tone for messages"),
  resume_content: z.string().optional().describe("Optional resume content for personalization")
});

export type MessageToolInput = z.infer<typeof MessageToolInputSchema>;

export const RephraseToolInputSchema = z.object({
  content: z.string().min(1, "Content to rephrase is required"),
  tone: z.enum(["formal", "casual", "friendly", "intellectual", "confident", "conversational"])
    .describe("Target tone for rephrasing"),
  type: z.enum(["email", "linkedin"]).describe("Type of message being rephrased"),
  context: z.object({
    company: z.string().optional(),
    role: z.string().optional(),
    highlights: z.string().optional(),
    resume_content: z.string().optional()
  }).optional().describe("Additional context for personalization")
});

export type RephraseToolInput = z.infer<typeof RephraseToolInputSchema>;

/**
 * Utility function to safely parse and validate data with Zod schema
 */
export function safeParseWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string = "data"
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`Schema validation failed for ${context}:`, error.errors);
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Format Zod errors for user-friendly display
 */
export function formatZodError(error: z.ZodError): string {
  return error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
}
