import { ResearchTool } from "./tools/ResearchTool";
import { VerifyTool } from "./tools/VerifyTool";
import { MessageGenerationTool } from "./tools/MessageGenerationTool";
import type { WritingTone } from "@/lib/tones";
import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";

/**
 * Input schema for OutreachAgent
 */
export interface OutreachAgentInput {
  company: string;
  domain?: string;
  role: string;
  highlights: string;
  tone?: WritingTone;
  resumeContent?: string;
}

/**
 * Output schema for OutreachAgent
 */
export interface OutreachAgentOutput {
  research: any;
  verified: any;
  messages: {
    linkedin: string;
    email: string;
  };
}

/**
 * OutreachAgent - Sequential tool orchestrator
 *
 * Executes a fixed workflow of three tools in sequence:
 * 1. ResearchTool: Company research via Perplexity
 * 2. VerifyTool: Data verification via Groq
 * 3. MessageGenerationTool: Personalized message generation via Groq
 *
 * This is a simpler, more reliable approach than using AgentExecutor
 * since our workflow is always the same sequence of steps.
 */
export class OutreachAgent {
  private researchTool: ResearchTool;
  private verifyTool: VerifyTool;
  private messageTool: MessageGenerationTool;

  constructor() {
    // Initialize tools
    this.researchTool = new ResearchTool();
    this.verifyTool = new VerifyTool();
    this.messageTool = new MessageGenerationTool();
  }

  /**
   * Run the outreach workflow sequentially
   *
   * @param input - Company, role, highlights, and optional tone/resume
   * @returns Structured output with research, verification, and messages
   */
  async run(
    input: OutreachAgentInput
  ): Promise<OutreachAgentOutput> {
    try {
      // Step 1: Research
      console.log("[OutreachAgent] Starting research phase");

      const researchResult = await this.researchTool.invoke({
        company: input.company,
        domain: input.domain,
        role: input.role
      });

      const research = JSON.parse(researchResult);
      console.log("[OutreachAgent] Research phase complete");

      // Step 2: Verify
      console.log("[OutreachAgent] Starting verification phase");

      const verifyResult = await this.verifyTool.invoke({
        research_data: researchResult
      });

      const verified = JSON.parse(verifyResult);
      console.log("[OutreachAgent] Verification phase complete");

      // Step 3: Generate Messages
      console.log("[OutreachAgent] Starting message generation phase");

      const messageResult = await this.messageTool.invoke({
        verified_data: verifyResult,
        company: input.company,
        role: input.role,
        highlights: input.highlights,
        tone: input.tone,
        resume_content: input.resumeContent
      });

      const messages = JSON.parse(messageResult);
      console.log("[OutreachAgent] Message generation phase complete");

      return {
        research,
        verified,
        messages: {
          linkedin: messages.linkedin || "",
          email: messages.email || ""
        }
      };
    } catch (error) {
      console.error("[OutreachAgent] Workflow error:", error);
      throw error;
    }
  }

  /**
   * Get available tools (for compatibility)
   */
  getTools(): any[] {
    return [this.researchTool, this.verifyTool, this.messageTool];
  }
}

/**
 * Factory function to create OutreachAgent instance
 */
export function createOutreachAgent(): OutreachAgent {
  return new OutreachAgent();
}
