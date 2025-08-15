import { NextRequest } from "next/server";
import { findRecentRun } from "lib/db";
import { verifierAgent } from "lib/verifyAgent";
import { researchAgent } from "lib/researchAgent";
import { messagingAgent } from "lib/messagingAgent";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { company, role, highlights } = await req.json();
    if (!company || !role || !highlights) {
      return new Response(JSON.stringify({ error: "Missing company, role or highlights" }), { status: 400 });
    }

    let verified: any = null;
    const cached = await findRecentRun(String(company), String(role), 24 * 7);
    if (cached?.verified_json) {
      verified = cached.verified_json as any;
    } else {
      const research = await researchAgent({ company: String(company), role: String(role) });
      verified = await verifierAgent({ research });
    }
    const messages = await messagingAgent({ verified, company: String(company), role: String(role), highlights: String(highlights) });
    return new Response(JSON.stringify(messages), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500 });
  }
}


