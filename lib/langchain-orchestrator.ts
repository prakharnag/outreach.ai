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
  private currentRecordId: string | null = null; // Track the current record ID

  constructor(callbacks: StepCallbacks = {}) {
    this.callbacks = callbacks;
    this.sourceTracker = new SourceTracker();
    this.currentRecordId = null;
  }

  private async initSupabase() {
    if (!this.supabase) {
      // Use service role key for backend operations to bypass RLS
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        console.log('[Orchestrator] Using service role key for database operations');
        this.supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        );
      } else {
        console.log('[Orchestrator] Using anon key for database operations');
        this.supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
      }
    }
    return this.supabase;
  }

  private async saveToSupabase(step: string, data: any, input: ChainInput) {
    console.log(`[Orchestrator] Saving step ${step} to Supabase`, { 
      data: JSON.stringify(data).slice(0, 200) + '...',
      company: input.company,
      step 
    });
    
    if (!input.userId) {
      console.error('[Orchestrator] No userId provided in input');
      return null;
    }

    try {
      const supabase = await this.initSupabase();
      const userId = input.userId;

      console.log(`[Orchestrator] Processing step ${step} for user: ${userId}`);

      if (step === 'research') {
        console.log('[Orchestrator] Inserting research data to contact_results');
        console.log('[Orchestrator] Research data keys:', Object.keys(data));
        
        // For service role operations, we need to bypass RLS by setting the user context
        const { data: result, error } = await supabase.rpc('insert_contact_result', {
          p_user_id: userId,
          p_company_name: input.company,
          p_research_data: data
        });
        
        if (error) {
          console.error('[Orchestrator] RPC failed, trying direct insert:', error);
          // Fallback to direct insert with service role
          const { data: directResult, error: directError } = await supabase
            .from('contact_results')
            .insert({
              user_id: userId,
              company_name: input.company,
              research_data: data,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (directError) {
            console.error('[Orchestrator] Failed to insert research data:', directError);
            return null;
          }
          
          console.log('[Orchestrator] Successfully inserted research data (direct):', directResult?.id);
          this.currentRecordId = directResult?.id; // Store the record ID
          
          if (!this.currentRecordId) {
            console.error('[Orchestrator] Failed to get record ID from direct insert');
            throw new Error('Failed to get record ID from direct insert');
          }
          
          return directResult?.id;
        }
        
        console.log('[Orchestrator] Successfully inserted research data (RPC):', result);
        this.currentRecordId = result; // Store the record ID
        
        if (!this.currentRecordId) {
          console.error('[Orchestrator] Failed to get record ID from research step');
          throw new Error('Failed to get record ID from research step');
        }
        
        return result;
      } else if (step === 'verify') {
        console.log('[Orchestrator] Updating contact_results with verified data');
        
        if (!this.currentRecordId) {
          console.error('[Orchestrator] No current record ID available for verify step');
          return null;
        }

        // Get the existing record using the stored ID
        const { data: existingRecord, error: fetchError } = await supabase
          .from('contact_results')
          .select('*')
          .eq('id', this.currentRecordId)
          .single();

        if (fetchError) {
          console.error('[Orchestrator] Failed to fetch existing record for verify step:', fetchError);
          return null;
        }

        // Merge verified data with existing research data, preserving the original structure
        const mergedResearchData = {
          ...existingRecord.research_data, // Keep the original rich research data
          // Only add verification data if it contains meaningful content
          ...(data.points && data.points.length > 0 ? {
            verified_points: data.points,
            verification_confidence: data.confidence || 0.5
          } : {}),
          // Always preserve contact info if available from either source
          contact: data.contact || existingRecord.research_data?.contact || existingRecord.research_data?.contact_information || null,
          verification_timestamp: new Date().toISOString(),
          last_step: 'verified'
        };

        console.log('[Orchestrator] Merging verification data:', {
          originalDataKeys: Object.keys(existingRecord.research_data || {}),
          hasVerifiedPoints: !!(data.points && data.points.length > 0),
          hasContact: !!data.contact,
          mergedDataKeys: Object.keys(mergedResearchData),
          preservedOriginalData: !!(mergedResearchData.company_overview || mergedResearchData.key_business_points)
        });

        const { data: result, error } = await supabase
          .from('contact_results')
          .update({
            contact_name: data.contact?.name,
            contact_title: data.contact?.title,
            contact_email: data.contact?.email,
            email_inferred: (data.contact as any)?.inferred || false,
            confidence_score: this.calculateConfidence(data),
            source_url: data.contact?.source?.url,
            source_title: data.contact?.source?.title,
            research_data: mergedResearchData, // Use merged data
            updated_at: new Date().toISOString()
          })
          .eq('id', this.currentRecordId)
          .select()
          .single();
        
        if (error) {
          console.error('[Orchestrator] Failed to update with verified data:', error);
          return null;
        }
        
        console.log('[Orchestrator] Successfully updated with verified data:', result?.id);
        return result?.id;
      } else if (step === 'messaging') {
        console.log('[Orchestrator] Processing messaging step');
        const emailLines = data.email.split('\n');
        const subjectLine = emailLines.find((line: string) => 
          line.toLowerCase().includes('subject:')
        )?.replace(/subject:\s*/i, '') || `Outreach to ${input.company}`;

        // Get the existing record
        console.log('[Orchestrator] Getting current contact_results data');
        
        if (!this.currentRecordId) {
          console.error('[Orchestrator] No current record ID available for messaging step');
          return null;
        }

        const { data: currentData, error: fetchError } = await supabase
          .from('contact_results')
          .select('*')
          .eq('id', this.currentRecordId)
          .single();

        if (fetchError) {
          console.error('[Orchestrator] Failed to fetch current data:', fetchError);
        } else {
          const updatedResearchData = {
            ...currentData.research_data,
            messages: data,
            messaging_timestamp: new Date().toISOString(),
            last_step: 'messaging'
          };

          console.log('[Orchestrator] Updating contact_results with messages');
          const { data: updateResult, error: updateError } = await supabase
            .from('contact_results')
            .update({
              research_data: updatedResearchData,
              updated_at: new Date().toISOString()
            })
            .eq('id', this.currentRecordId)
            .select()
            .single();

          if (updateError) {
            console.error('[Orchestrator] Failed to update with messages:', updateError);
          } else {
            console.log('[Orchestrator] Successfully updated with messages:', updateResult?.id);
          }
        }

        // Save to history tables
        console.log('[Orchestrator] Saving to history tables');
        const historyPromises = await Promise.allSettled([
          supabase.from('email_history').insert({
            user_id: userId,
            company_name: input.company,
            role: input.role,
            subject_line: subjectLine,
            content: data.email
          }),
          supabase.from('linkedin_history').insert({
            user_id: userId,
            company_name: input.company,
            role: input.role,
            content: data.linkedin
          })
        ]);

        console.log('[Orchestrator] History save results:', {
          historyResults: historyPromises.map(p => p.status)
        });
      }

      return null;
    } catch (error) {
      console.error(`[Orchestrator] Failed to save ${step} data to Supabase:`, error);
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
    let research: any;
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

    // --- Normalize research output for verifierAgent ---
    let normalizedResearch: any = research;
    if (research && (research.company_overview || research.key_business_points)) {
      normalizedResearch = {
        summary: research.company_overview || '',
        points: research.key_business_points
          ? Object.entries(research.key_business_points).map(([key, value]: [string, any]) => ({
              claim: value.description,
              source: { title: key.replace(/_/g, ' '), url: value.source_url }
            }))
          : [],
        contact: research.contact_information
          ? {
              name: research.contact_information.name,
              title: research.contact_information.title,
              email: research.contact_information.email,
              inferred: research.contact_information.inferred,
              source: research.contact_information.source_url
                ? { title: 'Contact Source', url: research.contact_information.source_url }
                : undefined
            }
          : undefined
      };
    }

    // Step 2: Verify
    this.callbacks.onStepStart?.('verify');
    let verified: VerifyAgentOutput;
    try {
      verified = await verifierAgent({ research: normalizedResearch });
      await this.saveToSupabase('verify', verified, input);
      this.callbacks.onStepComplete?.('verify', verified);
    } catch (error) {
      this.callbacks.onError?.('verify', error as Error);
      throw error;
    }

    // Step 3: Messaging - Get the merged data from database instead of using in-memory verified data
    this.callbacks.onStepStart?.('messaging');
    let messages: MessagingAgentOutput;
    try {
      // Fetch the current merged research data from database
      const supabase = await this.initSupabase();
      const { data: currentRecord, error: fetchError } = await supabase
        .from('contact_results')
        .select('*')
        .eq('id', this.currentRecordId)
        .single();

      if (fetchError || !currentRecord) {
        console.error('[Orchestrator] Failed to fetch record for messaging step:', fetchError);
        throw new Error('Failed to fetch current research data for messaging');
      }

      // Use the merged research data for messaging, with fallback to verified data
      const dataForMessaging = currentRecord.research_data || verified;
      
      // Create a proper verified structure for messaging agent
      let messagingInput: any = verified; // fallback
      
      if (currentRecord.research_data) {
        // If we have rich research data, create a proper structure for messaging
        messagingInput = {
          summary: currentRecord.research_data.company_overview || verified.summary || '',
          points: [],
          contact: currentRecord.research_data.contact || verified.contact
        };
        
        // Extract business points as messaging points
        if (currentRecord.research_data.key_business_points) {
          messagingInput.points = Object.entries(currentRecord.research_data.key_business_points).map(([key, value]: [string, any]) => ({
            claim: value.description || key,
            source: { title: key.replace(/_/g, ' '), url: value.source_url || '' }
          }));
        }
        
        // Use verified points if they exist and are meaningful
        if (currentRecord.research_data.verified_points && currentRecord.research_data.verified_points.length > 0) {
          messagingInput.points = currentRecord.research_data.verified_points;
        }
      }

      console.log('[Orchestrator] Using messaging input:', {
        hasRichData: !!currentRecord.research_data,
        pointsCount: messagingInput.points?.length || 0,
        hasSummary: !!messagingInput.summary,
        hasContact: !!messagingInput.contact
      });

      messages = await messagingAgent({
        verified: messagingInput,
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