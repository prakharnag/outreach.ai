import { createClient } from '@supabase/supabase-js';
import { researchAgent, ResearchAgentOutput } from "./researchAgent";
import { verifierAgent, VerifyAgentOutput } from "./verifyAgent";
import { messagingAgent, MessagingAgentOutput } from "./messagingAgent";
import { SourceTracker } from "./source-tracker";

export interface ChainInput {
  company: string;
  domain?: string;
  role: string;
  highlights: string;
  userId?: string;
}

export interface ChainOutput {
  research: ResearchAgentOutput;
  verified: VerifyAgentOutput;
  messages: MessagingAgentOutput;
  contactResultId?: string;
}

export interface StepCallbacks {
  onStepStart?: (step: string) => void;
  onStepComplete?: (step: string, data: any) => void;
  onError?: (step: string, error: Error) => void;
}

class OutreachOrchestrator {
  private supabase: any;
  private callbacks: StepCallbacks;
  private sourceTracker: SourceTracker;

  constructor(callbacks: StepCallbacks = {}) {
    this.callbacks = callbacks;
    this.sourceTracker = new SourceTracker();
  }

  private async initSupabase() {
    if (!this.supabase) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return this.supabase;
  }

  private async saveToSupabase(step: string, data: any, input: ChainInput) {
    try {
      const supabase = await this.initSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      if (step === 'research') {
        // Track sources from research content
        const sourceMetrics = this.sourceTracker.extractSourcesFromContent(data.summary || '');
        
        const { data: result } = await supabase
          .from('contact_results')
          .upsert({
            user_id: user.id,
            company_name: input.company,
            research_data: data,
            confidence_score: 0.5,
            source_metrics: {
              unique_source_count: sourceMetrics.uniqueSourceCount,
              source_urls: sourceMetrics.sourceUrls,
              source_types: sourceMetrics.sourceTypes,
              tracked_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,company_name'
          })
          .select()
          .single();
        
        return result?.id;
      } else if (step === 'verify') {
        const { data: result } = await supabase
          .from('contact_results')
          .update({
            contact_name: data.contact?.name,
            contact_title: data.contact?.title,
            contact_email: data.contact?.email,
            email_inferred: (data.contact as any)?.inferred || false,
            confidence_score: this.calculateConfidence(data),
            source_url: data.contact?.source?.url,
            source_title: data.contact?.source?.title,
            research_data: { ...data, step: 'verified' },
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('company_name', input.company)
          .select()
          .single();
        
        return result?.id;
      } else if (step === 'messaging') {
        const emailLines = data.email.split('\n');
        const subjectLine = emailLines.find((line: string) => 
          line.toLowerCase().includes('subject:')
        )?.replace(/subject:\s*/i, '') || `Outreach to ${input.company}`;

        await Promise.all([
          supabase.from('email_history').insert({
            user_id: user.id,
            company_name: input.company,
            role: input.role,
            subject_line: subjectLine,
            content: data.email
          }),
          supabase.from('linkedin_history').insert({
            user_id: user.id,
            company_name: input.company,
            role: input.role,
            content: data.linkedin
          })
        ]);
      }

      return null;
    } catch (error) {
      console.error(`Failed to save ${step} data to Supabase:`, error);
      return null;
    }
  }

  private calculateConfidence(verifiedData: VerifyAgentOutput): number {
    let confidence = 0.5;
    
    if (verifiedData.points && verifiedData.points.length > 0) {
      confidence += 0.2;
    }
    
    if (verifiedData.contact) {
      confidence += 0.2;
      if (verifiedData.contact.email && !(verifiedData.contact as any).inferred) {
        confidence += 0.1;
      }
    }
    
    return Math.min(confidence, 1.0);
  }

  async runChain(input: ChainInput): Promise<ChainOutput> {
    // Step 1: Research
    this.callbacks.onStepStart?.('research');
    let research: ResearchAgentOutput;
    try {
      research = await researchAgent({
        company: input.company,
        domain: input.domain,
        role: input.role
      });
      await this.saveToSupabase('research', research, input);
      this.callbacks.onStepComplete?.('research', research);
    } catch (error) {
      this.callbacks.onError?.('research', error as Error);
      throw error;
    }

    // Step 2: Verify
    this.callbacks.onStepStart?.('verify');
    let verified: VerifyAgentOutput;
    try {
      verified = await verifierAgent({ research });
      await this.saveToSupabase('verify', verified, input);
      this.callbacks.onStepComplete?.('verify', verified);
    } catch (error) {
      this.callbacks.onError?.('verify', error as Error);
      throw error;
    }

    // Step 3: Messaging
    this.callbacks.onStepStart?.('messaging');
    let messages: MessagingAgentOutput;
    try {
      messages = await messagingAgent({
        verified,
        company: input.company,
        role: input.role,
        highlights: input.highlights
      });
      await this.saveToSupabase('messaging', messages, input);
      this.callbacks.onStepComplete?.('messaging', messages);
    } catch (error) {
      this.callbacks.onError?.('messaging', error as Error);
      throw error;
    }

    return {
      research,
      verified,
      messages
    };
  }
}

export { OutreachOrchestrator };