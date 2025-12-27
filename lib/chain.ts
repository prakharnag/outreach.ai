import { OutreachAgent } from "./langchain/OutreachAgent";
import { saveRun, findRecentRun } from "./db";
import { WritingTone } from "./tones";

export type ChainInput = { company: string; domain?: string; role: string; highlights: string; userId?: string; tone?: WritingTone; resumeContent?: string };
export type ChainOutput = {
  research: string;
  verified: string;
  outputs: { linkedin: string; email: string };
  _intermediate?: { research?: any; verified?: string; verified_points?: Array<{ claim: string; source: { title: string; url: string } }> };
  _status?: { research?: string; verify?: string; messaging?: string };
  verified_points?: Array<{ claim: string; source: { title: string; url: string } }>;
  contact?: {
    primary_contact: { name: string; title: string; email?: string; source?: { title: string; url: string }; contact_type?: string };
    secondary_contact: { name: string; title: string; email?: string; source?: { title: string; url: string }; contact_type?: string };
  } | { name: string; title: string; email?: string; source?: { title: string; url: string } }; // legacy format
};

type StreamCallbacks = {
  onStatus?: (s: NonNullable<ChainOutput["_status"]>) => void;
  onIntermediate?: (i: { research?: any; verified?: string; verified_points?: Array<{ claim: string; source: { title: string; url: string } }> }) => void;
};

export async function runChain(input: ChainInput, cb?: StreamCallbacks): Promise<ChainOutput> {
  const status: NonNullable<ChainOutput["_status"]> = {};

  // Cache: reuse a recent run for the same company/role within 7 days
  const cached = await findRecentRun(input.company, input.role, 24 * 7);
  if (cached?.research_json && cached?.verified_json) {
    const research = cached.research_json as any;
    const verified = cached.verified_json as any;
    status.research = "from-cache";
    status.verify = "from-cache";
    status.messaging = "complete";
    cb?.onStatus?.({ ...status });
    
    return {
      research: research.summary,
      verified: verified.summary,
      outputs: { 
        linkedin: cached.linkedin || "", 
        email: cached.email || "" 
      },
      _intermediate: {
        research: research,
        verified: verified.summary,
        verified_points: verified.points,
      },
      _status: status,
      verified_points: Array.isArray(verified.points) ? verified.points : [],
      contact: verified.contact,
    };
  }

  try {
    // Create OutreachAgent
    const agent = new OutreachAgent();

    // Manual status tracking since agent is sequential
    status.research = "running";
    cb?.onStatus?.({ ...status });

    // Run agent workflow
    const result = await agent.run({
      company: input.company,
      domain: input.domain,
      role: input.role,
      highlights: input.highlights,
      tone: input.tone,
      resumeContent: input.resumeContent
    });

    // Update status - all steps complete
    status.research = "complete";
    status.verify = "complete";
    status.messaging = "complete";
    cb?.onStatus?.({ ...status });

    // Send intermediate data
    cb?.onIntermediate?.({
      research: result.research,
      verified: result.verified.summary,
      verified_points: result.verified.points
    });
    
    // Fire-and-forget persistence
    saveRun({
      company: input.company,
      role: input.role,
      research_json: result.research,
      verified_json: result.verified,
      linkedin: result.messages.linkedin,
      email: result.messages.email,
    }).catch(() => {});

    return {
      research: (result.research as any).company_overview || (result.research as any).summary || JSON.stringify(result.research),
      verified: result.verified.summary || JSON.stringify(result.verified),
      outputs: result.messages,
      _intermediate: {
        research: result.research,
        verified: result.verified.summary || JSON.stringify(result.verified),
        verified_points: result.verified.points || [],
      },
      _status: status,
      verified_points: Array.isArray(result.verified.points) ? result.verified.points : [],
      contact: result.verified.contact,
    };
  } catch (error) {
    console.error('[chain] Orchestration failed:', error);
    throw error;
  }
}


