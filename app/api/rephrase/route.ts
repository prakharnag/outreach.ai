import { NextRequest } from "next/server";
import { rephraseLinkedInTo22Words, rephraseEmailWithTone, rephraseLinkedInWithTone } from "lib/messagingAgent";
import { WritingTone } from "lib/tones";
import { sanitizeMessageContent } from "lib/utils";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { 
      linkedin, 
      email, 
      tone, 
      type, 
      resumeContent, 
      useResumeInPersonalization,
      company,
      role,
      highlights
    } = await req.json();
    
    if (!linkedin && !email) {
      return new Response(JSON.stringify({ error: "Missing linkedin or email content" }), { status: 400 });
    }

    let result: any = {};

    // Prepare context for resume-enhanced rephrasing
    const context = useResumeInPersonalization && resumeContent ? {
      resumeContent,
      company: company || '',
      role: role || '',
      highlights: highlights || ''
    } : undefined;

    if (linkedin) {
      if (type === "22words") {
        // Special 22-word rephrase with resume context
        const text = await rephraseLinkedInTo22Words(String(linkedin), tone as WritingTone, context);
        result.linkedin = sanitizeMessageContent(text);
      } else if (tone) {
        // Tone-based rephrase with resume context
        const text = await rephraseLinkedInWithTone(String(linkedin), tone as WritingTone, context);
        result.linkedin = sanitizeMessageContent(text);
      } else {
        // Default 22-word rephrase for backward compatibility
        const text = await rephraseLinkedInTo22Words(String(linkedin), undefined, context);
        result.linkedin = sanitizeMessageContent(text);
      }
    }

    if (email && tone) {
      const text = await rephraseEmailWithTone(String(email), tone as WritingTone, context);
      result.email = sanitizeMessageContent(text);
    }

    return new Response(JSON.stringify(result), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500 });
  }
}


