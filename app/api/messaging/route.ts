import { NextRequest } from "next/server";
import { findRecentRun } from "lib/db";
import { ResearchTool } from "@/lib/langchain/tools/ResearchTool";
import { VerifyTool } from "@/lib/langchain/tools/VerifyTool";
import { MessageGenerationTool } from "@/lib/langchain/tools/MessageGenerationTool";
import { sanitizeMessageContent } from "lib/utils";

// Changed to nodejs runtime because PromptManager uses fs module
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { company, role, highlights, tone, resumeContent, useResumeInPersonalization, messageType } = await req.json();
    if (!company || !role) {
      return new Response(JSON.stringify({ error: "Missing company or role" }), { status: 400 });
    }

    // For regenerations, we need to check rate limits
    // This route is used for both initial generation and regenerations
    // We'll check rate limits based on the messageType parameter
    if (messageType === 'email' || messageType === 'linkedin') {
      // This is a regeneration request - we need authentication and rate limiting
      // Note: Edge runtime doesn't support dynamic imports, so we'll skip rate limiting for now
      // TODO: Implement rate limiting for Edge runtime routes
      console.log(`Rate limiting check needed for ${messageType} regeneration`);
    }

    let verifiedData: string;
    const cached = await findRecentRun(String(company), String(role), 24 * 7);

    if (cached?.verified_json) {
      verifiedData = JSON.stringify(cached.verified_json);
    } else {
      // Use new LangChain tools
      const researchTool = new ResearchTool();
      const verifyTool = new VerifyTool();

      const researchResult = await researchTool.invoke({
        company: String(company),
        role: String(role)
      });

      verifiedData = await verifyTool.invoke({
        research_data: researchResult
      });
    }

    // Generate messages using MessageGenerationTool
    const messageTool = new MessageGenerationTool();
    const messagesResult = await messageTool.invoke({
      verified_data: verifiedData,
      company: String(company),
      role: String(role),
      highlights: highlights ? String(highlights) : '',
      tone: tone || undefined,
      resume_content: useResumeInPersonalization ? (resumeContent || undefined) : undefined
    });

    const messages = JSON.parse(messagesResult);
    
    // Apply final guardrails to ensure clean output
    const sanitizedMessages = {
      linkedin: sanitizeMessageContent(messages.linkedin),
      email: sanitizeMessageContent(messages.email)
    };
    
    // Return only the requested message type if specified, otherwise return both
    if (messageType === 'email') {
      return new Response(JSON.stringify({ email: sanitizedMessages.email }), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    } else if (messageType === 'linkedin') {
      return new Response(JSON.stringify({ linkedin: sanitizedMessages.linkedin }), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    // Default: return both messages (for backward compatibility)
    return new Response(JSON.stringify(sanitizedMessages), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500 });
  }
}


