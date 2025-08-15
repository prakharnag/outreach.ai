import { NextRequest } from "next/server";
import { rephraseLinkedInTo22Words } from "lib/messagingAgent";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { linkedin } = await req.json();
    if (!linkedin) return new Response(JSON.stringify({ error: "Missing linkedin" }), { status: 400 });
    const text = await rephraseLinkedInTo22Words(String(linkedin));
    return new Response(JSON.stringify({ linkedin: text }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500 });
  }
}


