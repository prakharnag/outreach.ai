import { NextRequest } from "next/server";
import { ChatGroq } from "@langchain/groq";
import { WritingTone, getToneConfig } from "lib/tones";
import { sanitizeMessageContent } from "lib/utils";

// Changed to nodejs runtime for consistency with other API routes
export const runtime = "nodejs";

// Helper functions for rephrasing
async function rephraseWithGroq(content: string, prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return content; // Fallback to original if no API key
  }

  const llm = new ChatGroq({
    apiKey,
    model: "llama-3.3-70b-versatile",
    temperature: 0.5
  });

  const result = await llm.invoke([
    { role: "system", content: prompt },
    { role: "user", content }
  ]);

  return result.content.toString();
}

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

    // Check rate limits for rephrasing
    // Note: Edge runtime doesn't support dynamic imports, so we'll skip rate limiting for now
    // TODO: Implement rate limiting for Edge runtime routes
    console.log('Rate limiting check needed for rephrase operations');

    let result: any = {};

    // Prepare context for resume-enhanced rephrasing
    const context = useResumeInPersonalization && resumeContent ? {
      resumeContent,
      company: company || '',
      role: role || '',
      highlights: highlights || ''
    } : undefined;

    if (linkedin) {
      const toneConfig = getToneConfig((tone as WritingTone) || 'formal');
      let systemPrompt = '';

      if (type === "22words") {
        // Special 22-word rephrase
        systemPrompt = `You are a professional message editor. Rewrite the given LinkedIn message to exactly 22 words while preserving the core value proposition and maintaining a ${toneConfig.label.toLowerCase()} tone. ${toneConfig.systemPrompt}`;
        if (context?.resumeContent) {
          systemPrompt += `\n\nPersonalization Context:\nCompany: ${context.company}\nRole: ${context.role}\nHighlights: ${context.highlights}\nResume: ${context.resumeContent}\n\nUse this context to make the 22-word message more personalized.`;
        }
        systemPrompt += '\n\nReturn ONLY the 22-word message, no explanations.';
      } else {
        // Tone-based rephrase (44 words)
        systemPrompt = `Rewrite this LinkedIn message maintaining the core message but applying ${toneConfig.label.toLowerCase()} tone: ${toneConfig.systemPrompt}\n\nStyle Reference: ${toneConfig.exampleLinkedIn}`;
        if (context?.resumeContent) {
          systemPrompt += `\n\nPersonalization Context:\nCompany: ${context.company}\nRole: ${context.role}\nResume: ${context.resumeContent}`;
        }
        systemPrompt += '\n\nKeep it around 44 words. Return ONLY the message.';
      }

      const text = await rephraseWithGroq(String(linkedin), systemPrompt);
      result.linkedin = sanitizeMessageContent(text);
    }

    if (email && tone) {
      const toneConfig = getToneConfig(tone as WritingTone);
      let systemPrompt = `Rewrite this email maintaining structure and core message but applying ${toneConfig.label.toLowerCase()} tone: ${toneConfig.systemPrompt}\n\nStyle Reference: ${toneConfig.exampleEmail}`;

      if (context?.resumeContent) {
        systemPrompt += `\n\nPersonalization Context:\nCompany: ${context.company}\nRole: ${context.role}\nResume: ${context.resumeContent}`;
      }

      systemPrompt += '\n\nKeep it 90-100 words with Subject line. Return ONLY the email.';

      const text = await rephraseWithGroq(String(email), systemPrompt);
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


