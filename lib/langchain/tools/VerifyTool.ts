import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatGroq } from "@langchain/groq";
import { VerifyToolInputSchema, VerificationSchema, type Verification } from "../schemas";
import { PromptManager } from "../prompts/PromptManager";
import { safeParseWithSchema } from "../schemas";
import { z } from "zod";

/**
 * VerifyTool - Verify and refine research data using Groq with structured output
 *
 * This tool replaces the old verifyAgent.ts with a LangChain-based implementation
 * that eliminates all manual JSON parsing and cleaning code (~40 lines).
 *
 * Key improvements:
 * - Uses withStructuredOutput() for automatic Zod validation
 * - No manual JSON cleaning (removing text before/after braces)
 * - Type-safe output guaranteed by Zod schema
 * - Built-in security guardrails against prompt injection
 *
 * Security: System prompt includes anti-injection guards
 * Reliability: Zod validation instead of try/catch JSON parsing
 * Performance: Uses fast Groq llama-3.3-70b-versatile model
 */
export class VerifyTool extends DynamicStructuredTool {
  name = "verify_research";
  description = `Verify and refine research data to ensure accuracy and reliability.
    Use this tool after receiving research results to:
    - Validate all claims have credible sources
    - Filter out outdated information (>12 months old)
    - Remove unverifiable or speculative claims
    - Ensure contact information is accurate and properly formatted
    - Cross-check company names against trusted sources

    Input: JSON string of research data to verify
    Output: Verified and refined data with credible sources only`;

  schema = VerifyToolInputSchema;

  constructor() {
    super({
      name: "verify_research",
      description: `Verify and refine research data to ensure accuracy and reliability.
        Use this tool after receiving research results to:
        - Validate all claims have credible sources
        - Filter out outdated information (>12 months old)
        - Remove unverifiable or speculative claims
        - Ensure contact information is accurate and properly formatted
        - Cross-check company names against trusted sources

        Input: JSON string of research data to verify
        Output: Verified and refined data with credible sources only`,
      schema: VerifyToolInputSchema,
      func: async ({ research_data }) => {
        return await this.runVerification(research_data);
      }
    });
  }

  /**
   * Execute verification using Groq LLM
   * @private
   */
  private async runVerification(research_data: string): Promise<string> {
    // Check for API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("[VerifyTool] GROQ_API_KEY not found, returning mock verification");
      return this.getMockVerificationData(research_data);
    }

    try {
      // Load verification prompt with security guardrails
      const systemPrompt = PromptManager.formatVerifyPrompt(research_data);

      // Initialize Groq LLM with llama-3.3-70b-versatile
      // This model replaced the deprecated llama3-70b-8192
      const llm = new ChatGroq({
        apiKey,
        model: "llama-3.3-70b-versatile",
        temperature: 0.2, // Low temperature for factual verification
      });

      // Use withStructuredOutput for automatic Zod validation
      // This eliminates all manual JSON cleaning and parsing code
      const structuredLLM = llm.withStructuredOutput(VerificationSchema, {
        name: "verification_output",
      });

      // Execute verification
      const userPrompt = `Verify and refine the following research data. Return ONLY valid JSON with no extra text:\n\n${research_data}`;

      const result = await structuredLLM.invoke([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]);

      // Validate result with safe parsing
      const parseResult = safeParseWithSchema(VerificationSchema, result);

      if (!parseResult.success) {
        throw new Error("Verification data validation failed");
      }

      // Filter out points without sources (defensive check)
      const filteredPoints = parseResult.data.points.filter(p => p.source && p.source.url);

      const finalResult = {
        summary: parseResult.data.summary,
        points: filteredPoints,
        contact: parseResult.data.contact
      };

      // Return as JSON string for agent reasoning
      return JSON.stringify(finalResult, null, 2);

    } catch (error) {
      console.error("[VerifyTool] Error during verification:", error);

      // Fallback: return minimal valid structure
      return JSON.stringify({
        summary: "Verification encountered errors. Please review research data manually.",
        points: [],
        contact: undefined
      });
    }
  }

  /**
   * Mock verification data for development/testing when API key unavailable
   * @private
   */
  private getMockVerificationData(research_data: string): string {
    // Try to parse research data to extract some info
    let companyName = "Unknown Company";
    try {
      const parsed = JSON.parse(research_data);
      if (parsed.company_overview) {
        companyName = parsed.company_overview.split(' ')[0];
      }
    } catch {
      // Ignore parsing errors in mock mode
    }

    const mockData: Verification = {
      summary: `Mock verification: Reviewed data for ${companyName}. This is simulated data when GROQ_API_KEY is not available.`,
      points: [
        {
          claim: "Verified funding information from trusted sources (mock data)",
          source: {
            title: "TechCrunch (Mock)",
            url: "https://example.com/funding"
          }
        },
        {
          claim: "Confirmed technology stack from engineering blog (mock data)",
          source: {
            title: "Engineering Blog (Mock)",
            url: "https://example.com/tech"
          }
        },
        {
          claim: "Recent product updates verified from official announcements (mock data)",
          source: {
            title: "Company Blog (Mock)",
            url: "https://example.com/blog"
          }
        }
      ],
      contact: {
        primary_contact: {
          name: "Jane Doe",
          title: "Senior Talent Acquisition Manager",
          email: "jane.doe@example.com",
          inferred: false,
          confidence_score: 0.9,
          contact_type: "hiring",
          source: {
            title: "Company LinkedIn (Mock)",
            url: "https://linkedin.com/in/janedoe"
          }
        },
        secondary_contact: {
          name: "John Smith",
          title: "Chief Technology Officer",
          email: "john.smith@example.com",
          inferred: true,
          confidence_score: 0.85,
          contact_type: "leadership",
          source: {
            title: "Company Website (Mock)",
            url: "https://example.com/team"
          }
        }
      }
    };

    return JSON.stringify(mockData, null, 2);
  }
}

/**
 * Factory function to create VerifyTool instance
 * Useful for dependency injection in tests
 */
export function createVerifyTool(): VerifyTool {
  return new VerifyTool();
}
