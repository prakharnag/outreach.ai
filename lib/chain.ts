import { OutreachOrchestrator } from "./langchain-orchestrator";
import { saveRun, findRecentRun } from "./db";

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

// Map orchestrator status to chain status
const mapStatus = (step: string): keyof NonNullable<ChainOutput["_status"]> => {
  switch (step) {
    case 'research': return 'research';
    case 'verify': return 'verify';
    case 'messaging': return 'messaging';
    default: return 'research';
  }
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
        research: research.summary,
        verified: verified.summary,
        verified_points: verified.points,
      },
      _status: status,
      verified_points: Array.isArray(verified.points) ? verified.points : [],
      contact: verified.contact,
    };
  }

  // Create orchestrator with callbacks
  const orchestrator = new OutreachOrchestrator({
    onStepStart: (step: string) => {
      const mappedStep = mapStatus(step);
      status[mappedStep] = "running";
      cb?.onStatus?.({ ...status });
    },
    onStepComplete: (step: string, data: any) => {
      const mappedStep = mapStatus(step);
      status[mappedStep] = "complete";
      cb?.onStatus?.({ ...status });
      
      if (step === 'research') {
        cb?.onIntermediate?.({ research: data.summary });
      } else if (step === 'verify') {
        cb?.onIntermediate?.({ 
          verified: data.summary, 
          verified_points: data.points 
        });
      }
    },
    onError: (step: string, error: Error) => {
      console.error(`[chain] ${step} failed:`, error);
      throw new Error(`${step} failed: ${error.message}`);
    }
  });

  try {
    const result = await orchestrator.runChain(input);
    
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
      research: result.research.summary,
      verified: result.verified.summary,
      outputs: result.messages,
      _intermediate: {
        research: result.research.summary,
        verified: result.verified.summary,
        verified_points: result.verified.points,
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


