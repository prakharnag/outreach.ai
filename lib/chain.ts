import { researchAgent } from "@/lib/researchAgent";
import { verifierAgent } from "@/lib/verifyAgent";
import { messagingAgent } from "@/lib/messagingAgent";
import { saveRun, findRecentRun } from "@/lib/db";

export type ChainInput = { company: string; domain?: string; role: string; highlights: string };
export type ChainOutput = {
  research: string;
  verified: string;
  outputs: { linkedin: string; email: string };
  _intermediate?: { research?: string; verified?: string; verified_points?: Array<{ claim: string; source: { title: string; url: string } }> };
  _status?: { research?: string; verify?: string; messaging?: string };
  verified_points?: Array<{ claim: string; source: { title: string; url: string } }>;
  contact?: { name: string; title: string; email?: string; source?: { title: string; url: string } };
};

type StreamCallbacks = {
  onStatus?: (s: NonNullable<ChainOutput["_status"]>) => void;
  onIntermediate?: (i: { research?: string; verified?: string; verified_points?: Array<{ claim: string; source: { title: string; url: string } }> }) => void;
};

export async function runChain(input: ChainInput, cb?: StreamCallbacks): Promise<ChainOutput> {
  let research;
  let verified;
  let messages;
  const status: NonNullable<ChainOutput["_status"]> = {};

  // Cache: reuse a recent run for the same company/role within 7 days to avoid re-calling research
  const cached = await findRecentRun(input.company, input.role, 24 * 7);
  if (cached?.research_json && cached?.verified_json) {
    research = cached.research_json as any;
    verified = cached.verified_json as any;
    status.research = "from-cache";
    status.verify = "from-cache";
    cb?.onStatus?.({ ...status });
  } else {
  try {
    research = await researchAgent({ company: input.company, domain: input.domain, role: input.role });
    status.research = "complete";
    console.log("[chain] Research complete");
    cb?.onStatus?.({ ...status });
    cb?.onIntermediate?.({ research: research.summary });
  } catch (e: any) {
    console.error("[chain] Research failed", e);
    throw new Error(`Research failed: ${e?.message || e}`);
  }

  try {
    verified = await verifierAgent({ research });
    status.verify = "complete";
    console.log("[chain] Verification complete");
    cb?.onStatus?.({ ...status });
    cb?.onIntermediate?.({ verified: verified.summary, verified_points: verified.points });
  } catch (e: any) {
    console.error("[chain] Verification failed", e);
    throw new Error(`Verification failed: ${e?.message || e}`);
  }
  }

  try {
    messages = await messagingAgent({ verified, company: input.company, role: input.role, highlights: input.highlights });
    status.messaging = "complete";
    console.log("[chain] Messaging complete");
    cb?.onStatus?.({ ...status });
  } catch (e: any) {
    console.error("[chain] Messaging failed", e);
    throw new Error(`Messaging failed: ${e?.message || e}`);
  }

  // Fire-and-forget persistence (no auth for MVP)
  saveRun({
    company: input.company,
    role: input.role,
    research_json: research,
    verified_json: verified,
    linkedin: messages.linkedin,
    email: messages.email,
  }).catch(() => {});

  const toClaim = (p: any) => (typeof p === "string" ? p : p?.claim);
  const researchPoints = Array.isArray(research.points) ? research.points.map(toClaim).filter(Boolean).slice(0, 5) : [];
  const verifiedPoints = Array.isArray(verified.points) ? verified.points.map(toClaim).filter(Boolean).slice(0, 5) : [];

  return {
    research: research.summary,
    verified: verified.summary,
    outputs: messages,
    _intermediate: {
      research: research.summary,
      verified: verified.summary,
      verified_points: verified.points,
    },
    _status: status,
    verified_points: Array.isArray(verified.points) ? verified.points : [],
    contact: verified.contact,
  };
}


