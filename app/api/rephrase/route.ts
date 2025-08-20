import { NextRequest } from "next/server";
import { rephraseLinkedInTo22Words, rephraseEmailWithTone, rephraseLinkedInWithTone } from "lib/messagingAgent";
import { WritingTone } from "lib/tones";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { linkedin, email, tone, type } = await req.json();
    
    if (!linkedin && !email) {
      return new Response(JSON.stringify({ error: "Missing linkedin or email content" }), { status: 400 });
    }

    let result: any = {};

    if (linkedin) {
      if (type === "22words") {
        // Special 22-word rephrase
        const text = await rephraseLinkedInTo22Words(String(linkedin), tone as WritingTone);
        result.linkedin = text;
      } else if (tone) {
        // Tone-based rephrase
        const text = await rephraseLinkedInWithTone(String(linkedin), tone as WritingTone);
        result.linkedin = text;
      } else {
        // Default 22-word rephrase for backward compatibility
        const text = await rephraseLinkedInTo22Words(String(linkedin));
        result.linkedin = text;
      }
    }

    if (email && tone) {
      const text = await rephraseEmailWithTone(String(email), tone as WritingTone);
      result.email = text;
    }

    return new Response(JSON.stringify(result), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500 });
  }
}


