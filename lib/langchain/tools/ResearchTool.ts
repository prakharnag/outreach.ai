import { DynamicStructuredTool } from "@langchain/core/tools";
import { ResearchToolInputSchema, ResearchSchema, type Research } from "../schemas";
import { PromptManager } from "../prompts/PromptManager";
import { safeParseWithSchema } from "../schemas";

/**
 * ResearchTool - Company research using Groq Compound (with Perplexity fallback)
 *
 * This tool uses Groq Compound as the primary research engine with built-in web search,
 * falling back to Perplexity AI if Groq fails. Uses Zod schemas for type-safe validation
 * and withStructuredOutput() for automatic JSON parsing (eliminating ~50 lines of manual parsing code).
 *
 * Architecture:
 * - Primary: Groq Compound (groq/compound) with real-time web search
 * - Fallback: Perplexity AI (sonar) if Groq fails or is unavailable
 * - Output: Structured JSON validated against ResearchSchema
 *
 * Security: Includes built-in guardrails against prompt injection via system prompt
 * Reliability: Uses Zod validation instead of brittle JSON parsing
 * Performance: Integrates with LangChain caching for 7-day research cache
 * Cost: Consolidates to single API provider (Groq) for most requests
 */
export class ResearchTool extends DynamicStructuredTool {
  name = "company_research";
  description = `Research a company to gather business intelligence, technical details, and contact information.
    Use this tool when you need to:
    - Understand a company's products, services, and market position
    - Find recent news, funding, or product updates
    - Identify hiring managers and leadership contacts
    - Gather technical stack and engineering challenges information

    Input: company name (required), optional domain, and target role
    Output: Structured research data with company overview, key points, contacts, and sources`;

  schema = ResearchToolInputSchema;

  constructor() {
    super({
      name: "company_research",
      description: `Research a company to gather business intelligence, technical details, and contact information.
        Use this tool when you need to:
        - Understand a company's products, services, and market position
        - Find recent news, funding, or product updates
        - Identify hiring managers and leadership contacts
        - Gather technical stack and engineering challenges information

        Input: company name (required), optional domain, and target role
        Output: Structured research data with company overview, key points, contacts, and sources`,
      schema: ResearchToolInputSchema,
      func: async ({ company, domain, role }) => {
        return await this.runResearch(company, role, domain);
      }
    });
  }

  /**
   * Execute company research using Groq Compound (primary) with Perplexity fallback
   * @private
   */
  private async runResearch(
    company: string,
    role: string,
    domain?: string
  ): Promise<string> {
    // Try Groq Compound first
    const groqApiKey = process.env.GROQ_API_KEY;

    if (groqApiKey) {
      try {
        console.log("[ResearchTool] Using Groq Compound for research");
        return await this.runGroqCompoundResearch(company, role, domain, groqApiKey);
      } catch (error) {
        console.warn("[ResearchTool] Groq Compound failed, falling back to Perplexity:", error);
        // Continue to Perplexity fallback
      }
    } else {
      console.warn("[ResearchTool] GROQ_API_KEY not found, falling back to Perplexity");
    }

    // Fallback to Perplexity
    const pplxApiKey = process.env.PPLX_API_KEY;

    if (pplxApiKey) {
      try {
        console.log("[ResearchTool] Using Perplexity as fallback");
        return await this.runPerplexityResearch(company, role, domain, pplxApiKey);
      } catch (error) {
        console.error("[ResearchTool] Perplexity fallback also failed:", error);
        throw error;
      }
    }

    // No API keys available
    console.warn("[ResearchTool] No API keys available, returning mock data");
    return this.getMockResearchData(company, role);
  }

  /**
   * Research using Groq Compound (primary method)
   * @private
   */
  private async runGroqCompoundResearch(
    company: string,
    role: string,
    domain: string | undefined,
    apiKey: string
  ): Promise<string> {
    // Load and format research prompt with security guardrails
    const systemPrompt = PromptManager.formatResearchPrompt(company, role, domain);
    const userPrompt = `Company: ${company}${domain ? ` (${domain})` : ''}\nTarget role: ${role}\n\nGenerate a complete, verified company research report with real-time web search. Keep responses concise and focused. Return ONLY valid JSON matching the schema.`;

    console.log("[ResearchTool] Calling Groq Compound API for:", company);

    // Call Groq Compound API with web search enabled
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "groq/compound",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Slightly higher for more detailed responses
        max_tokens: 2000, // Reduced from 4000 to optimize token usage and stay within TPM limits
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq Compound API error: ${response.status} - ${errorText}`);
    }

    const json = await response.json();

    // Debug logging to diagnose empty response issues
    console.log("[ResearchTool] Groq Compound response structure:", {
      hasChoices: !!json?.choices,
      choicesLength: json?.choices?.length,
      hasMessage: !!json?.choices?.[0]?.message,
      hasContent: !!json?.choices?.[0]?.message?.content,
      contentLength: json?.choices?.[0]?.message?.content?.length || 0,
      finishReason: json?.choices?.[0]?.finish_reason,
      model: json?.model
    });

    const content: string = json?.choices?.[0]?.message?.content || "";

    if (!content) {
      console.error("[ResearchTool] Full Groq response:", JSON.stringify(json, null, 2));
      throw new Error("Groq Compound returned empty response");
    }

    // Parse JSON response
    const parsed = JSON.parse(content);

    // Validate with safe parsing
    const parseResult = safeParseWithSchema(ResearchSchema, parsed);

    if (!parseResult.success) {
      throw new Error("Groq Compound research data validation failed");
    }

    // Return as JSON string for agent reasoning
    return JSON.stringify(parseResult.data, null, 2);
  }

  /**
   * Research using Perplexity AI (fallback method)
   * @private
   */
  private async runPerplexityResearch(
    company: string,
    role: string,
    domain: string | undefined,
    apiKey: string
  ): Promise<string> {
    // Load and format research prompt with security guardrails
    const systemPrompt = PromptManager.formatResearchPrompt(company, role, domain);
    const userPrompt = `Company: ${company}${domain ? ` (${domain})` : ''}\nTarget role: ${role}\n\nGenerate a complete, verified company research report.`;

    // Call Perplexity API directly
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    const content: string = json?.choices?.[0]?.message?.content || "";

    if (!content) {
      throw new Error("Perplexity returned empty response");
    }

    // Parse JSON response
    const parsed = JSON.parse(content);

    // Validate with safe parsing
    const parseResult = safeParseWithSchema(ResearchSchema, parsed);

    if (!parseResult.success) {
      throw new Error("Perplexity research data validation failed");
    }

    // Return as JSON string for agent reasoning
    return JSON.stringify(parseResult.data, null, 2);
  }

  /**
   * Mock research data for development/testing when API key unavailable
   * @private
   */
  private getMockResearchData(company: string, role: string): string {
    const mockData: Research = {
      company_overview: `${company} is a simulated company for development purposes. This is mock data returned when PPLX_API_KEY is not available.`,
      key_business_points: {
        funding_summary: {
          description: "Mock: Series A funding of $10M (simulated data)",
          source_url: "https://example.com/funding"
        },
        top_technologies: {
          description: "Mock: Uses React, Next.js, TypeScript, Postgres (simulated data)",
          source_url: "https://example.com/tech-stack"
        },
        recent_product_updates: {
          description: "Mock: Launched AI-powered features in Q4 2024 (simulated data)",
          source_url: "https://example.com/product-updates"
        },
        technical_challenges: {
          description: "Mock: Scaling to 1M users, optimizing database performance (simulated data)",
          source_url: "https://example.com/engineering-blog"
        },
        leadership_details: {
          description: "Mock: Led by experienced engineers from FAANG companies (simulated data)",
          source_url: "https://example.com/team"
        }
      },
      contact_information: {
        primary_contact: {
          name: "Jane Doe",
          title: "Senior Talent Acquisition Specialist",
          email: "jane.doe@example.com",
          inferred: true,
          confidence_score: 0.7,
          contact_type: "hiring",
          source: {
            title: "Company LinkedIn (Mock)",
            url: "https://linkedin.com/company/example"
          }
        },
        secondary_contact: {
          name: "John Smith",
          title: "VP of Engineering",
          email: "john.smith@example.com",
          inferred: false,
          confidence_score: 0.85,
          contact_type: "leadership",
          source: {
            title: "Company Website (Mock)",
            url: "https://example.com/team"
          }
        }
      },
      confidence_assessment: {
        level: "Low",
        explanation: "This is mock data for development. Set PPLX_API_KEY for real research."
      }
    };

    return JSON.stringify(mockData, null, 2);
  }
}

/**
 * Factory function to create ResearchTool instance
 * Useful for dependency injection in tests
 */
export function createResearchTool(): ResearchTool {
  return new ResearchTool();
}
