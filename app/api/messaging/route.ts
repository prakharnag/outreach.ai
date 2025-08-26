import { NextRequest } from "next/server";
import { findRecentRun } from "lib/db";
import { verifierAgent } from "lib/verifyAgent";
import { researchAgent } from "lib/researchAgent";
import { messagingAgent } from "lib/messagingAgent";
import { sanitizeMessageContent } from "lib/utils";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { company, role, highlights, tone, resumeContent, useResumeInPersonalization, messageType } = await req.json();
    if (!company || !role) {
      return new Response(JSON.stringify({ error: "Missing company or role" }), { status: 400 });
    }

    let verified: any = null;
    const cached = await findRecentRun(String(company), String(role), 24 * 7);
    if (cached?.verified_json) {
      verified = cached.verified_json as any;
    } else {
      const research = await researchAgent({ company: String(company), role: String(role) });
      verified = await verifierAgent({ research });
    }
    
    const messages = await messagingAgent({ 
      verified, 
      company: String(company), 
      role: String(role), 
      highlights: highlights ? String(highlights) : '',
      tone: tone || undefined,
      resumeContent: useResumeInPersonalization ? (resumeContent || undefined) : undefined
    });
    
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


