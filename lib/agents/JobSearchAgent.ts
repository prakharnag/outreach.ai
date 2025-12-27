/**
 * Job Search Agent
 *
 * Main orchestrator that coordinates all agent capabilities
 */

import Groq from 'groq-sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ConversationManager, ConversationContext } from '@/lib/conversation/conversationManager';
import { MessageStorage } from '@/lib/conversation/messageStorage';
import { detectIntent, Intent } from './intentDetection';
import { generateICP, ICPGenerationResult } from './icpGenerator';
import { discoverJobs, JobDiscoveryResult } from './jobDiscovery';
import { generateMessage, MessageGenerationParams, GeneratedMessage } from './messageGenerator';
import { JOB_SEARCH_AGENT_SYSTEM_PROMPT, formatPrompt } from '@/lib/prompts/systemPrompts';

export interface AgentSettings {
  tone?: string;
  useResume?: boolean;
  resumeContent?: string;
}

export interface AgentResponse {
  type: 'thinking' | 'message' | 'icp' | 'companies' | 'draft' | 'complete' | 'error';
  content?: string;
  data?: any;
  metadata?: any;
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export class JobSearchAgent {
  /**
   * Process user message and generate responses
   */
  async *processMessage(
    supabase: SupabaseClient,
    message: string,
    conversationId: string,
    userId: string,
    settings: AgentSettings = {}
  ): AsyncGenerator<AgentResponse> {
    // Initialize managers with supabase client
    const conversationManager = new ConversationManager(supabase);
    const messageStorage = new MessageStorage(supabase);
    try {
      // 1. Load conversation context
      yield {
        type: 'thinking',
        content: 'Loading conversation context...',
      };

      const context = await conversationManager.loadContext(conversationId, userId, {
        includeICP: true,
        includeResume: settings.useResume,
        messageLimit: 20,
      });

      // 2. Detect intent
      yield {
        type: 'thinking',
        content: 'Understanding your request...',
      };

      const contextStr = conversationManager.formatContextForLLM(context);
      const intentResult = await detectIntent(message, contextStr);

      // 3. Route to appropriate function based on intent
      yield {
        type: 'thinking',
        content: `Processing as ${intentResult.intent.replace('_', ' ')}...`,
      };

      let responseText = '';

      switch (intentResult.intent) {
        case 'icp_generation':
          yield* this.handleICPGeneration(message, context, conversationId, userId);
          break;

        case 'job_discovery':
          yield* this.handleJobDiscovery(context, conversationId, userId);
          break;

        case 'company_research':
          yield* this.handleCompanyResearch(message, context, conversationId, userId);
          break;

        case 'message_drafting':
          yield* this.handleMessageDrafting(message, context, settings, conversationId, userId);
          break;

        case 'application_help':
          yield* this.handleApplicationHelp(message, context, conversationId, userId);
          break;

        default:
          yield* this.handleGeneralQuestion(message, context, conversationId, userId);
          break;
      }

      yield {
        type: 'complete',
      };
    } catch (error) {
      console.error('[JobSearchAgent] Error processing message:', error);
      yield {
        type: 'error',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        data: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Handle ICP generation intent
   */
  private async *handleICPGeneration(
    message: string,
    context: ConversationContext,
    conversationId: string,
    userId: string
  ): AsyncGenerator<AgentResponse> {
    const result: ICPGenerationResult = await generateICP(message, context.icp || undefined);

    // Save ICP to database
    if (!result.needsClarification && Object.keys(result.icp).length > 0) {

      const { error } = await supabase.from('icp_profiles').upsert({
        user_id: userId,
        conversation_id: conversationId,
        target_roles: result.icp.target_roles || [],
        industries: result.icp.industries || [],
        company_sizes: result.icp.company_sizes || [],
        locations: result.icp.locations || [],
        tech_stack: result.icp.tech_stack || [],
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[JobSearchAgent] Error saving ICP:', error);
      }

      yield {
        type: 'icp',
        data: result.icp,
      };
    }

    yield {
      type: 'message',
      content: result.response,
    };

    // Save assistant message
    await messageStorage.saveMessage(conversationId, userId, 'assistant', result.response);
  }

  /**
   * Handle job discovery intent
   */
  private async *handleJobDiscovery(
    context: ConversationContext,
    conversationId: string,
    userId: string
  ): AsyncGenerator<AgentResponse> {
    if (!context.icp || Object.keys(context.icp).length === 0) {
      const response =
        "I need to understand your job preferences first. Could you tell me what kind of roles you're looking for?";

      yield {
        type: 'message',
        content: response,
      };

      await messageStorage.saveMessage(conversationId, userId, 'assistant', response);
      return;
    }

    yield {
      type: 'thinking',
      content: 'Searching for companies matching your criteria...',
    };

    const result: JobDiscoveryResult = await discoverJobs(context.icp);

    // Save companies to database
    if (result.companies.length > 0) {

      const jobRecords = result.companies.map((company) => ({
        user_id: userId,
        conversation_id: conversationId,
        company_name: company.name,
        company_domain: company.domain,
        role: company.open_roles?.[0] || 'Not specified',
        research_data: {
          description: company.description,
          match_reason: company.match_reason,
          open_roles: company.open_roles,
          funding_stage: company.funding_stage,
          source_url: company.source_url,
        },
        status: 'discovered',
      }));

      const { error } = await supabase.from('job_searches').insert(jobRecords);

      if (error) {
        console.error('[JobSearchAgent] Error saving jobs:', error);
      }

      yield {
        type: 'companies',
        data: result.companies,
        metadata: { searchSummary: result.searchSummary },
      };
    }

    yield {
      type: 'message',
      content: result.response,
    };

    await messageStorage.saveMessage(conversationId, userId, 'assistant', result.response);
  }

  /**
   * Handle company research intent
   */
  private async *handleCompanyResearch(
    message: string,
    context: ConversationContext,
    conversationId: string,
    userId: string
  ): AsyncGenerator<AgentResponse> {
    // Extract company name from message
    const companyMatch = message.match(
      /(?:about|research|tell me about|information on)\s+([A-Z][A-Za-z0-9\s&.]+)/i
    );
    const companyName = companyMatch?.[1]?.trim() || 'the company';

    yield {
      type: 'thinking',
      content: `Researching ${companyName}...`,
    };

    // Build research prompt
    const researchPrompt = `Provide detailed research about ${companyName}:

1. Company Overview (what they do, mission)
2. Recent News (last 12 months)
3. Funding Status (latest round, investors)
4. Tech Stack (technologies used)
5. Company Culture (work environment, values)
6. Open Roles (if available)
7. Leadership (key executives)

Format as a well-structured response with clear sections.`;

    const response = await groq.chat.completions.create({
      model: 'groq/compound', // Web search enabled
      messages: [
        {
          role: 'user',
          content: researchPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const researchContent = response.choices[0]?.message?.content || 'No research found.';

    yield {
      type: 'message',
      content: researchContent,
      metadata: { company: companyName },
    };

    await messageStorage.saveMessage(conversationId, userId, 'assistant', researchContent);
  }

  /**
   * Handle message drafting intent
   */
  private async *handleMessageDrafting(
    message: string,
    context: ConversationContext,
    settings: AgentSettings,
    conversationId: string,
    userId: string
  ): AsyncGenerator<AgentResponse> {
    // Extract company and role from message
    const companyMatch = message.match(/(?:for|to|at)\s+([A-Z][A-Za-z0-9\s&.]+)/i);
    const roleMatch = message.match(/(?:role|position|job):\s*([A-Za-z\s]+)/i);

    const company = companyMatch?.[1]?.trim() || 'the company';
    const role = roleMatch?.[1]?.trim() || context.icp?.target_roles?.[0] || 'the role';

    // Determine message type
    const messageType: 'linkedin' | 'email' = message.toLowerCase().includes('email')
      ? 'email'
      : 'linkedin';

    yield {
      type: 'thinking',
      content: `Drafting ${messageType} message for ${company}...`,
    };

    const params: MessageGenerationParams = {
      company,
      role,
      companyResearch: `Target company: ${company}`,
      resumeContent: settings.resumeContent,
      tone: settings.tone || 'professional',
      messageType,
    };

    const result: GeneratedMessage = await generateMessage(params);

    yield {
      type: 'draft',
      content: result.message,
      metadata: {
        subject: result.subject,
        wordCount: result.wordCount,
        personalizationNotes: result.personalizationNotes,
        messageType,
        company,
        role,
      },
    };

    const responseText = `Here's your ${messageType} message:\n\n${result.subject ? `Subject: ${result.subject}\n\n` : ''}${result.message}\n\n*Personalization notes:* ${result.personalizationNotes}`;

    await messageStorage.saveMessage(conversationId, userId, 'assistant', responseText);
  }

  /**
   * Handle application help intent
   */
  private async *handleApplicationHelp(
    message: string,
    context: ConversationContext,
    conversationId: string,
    userId: string
  ): AsyncGenerator<AgentResponse> {
    const response = `I can help you with job applications! Here's what I can do:

1. **Pre-fill application forms** - Provide me with a job application URL and I'll extract the form fields and suggest values based on your resume.
2. **Track applications** - I'll keep track of where you've applied and the status of each application.
3. **Follow-up reminders** - I can remind you when to follow up with companies.

What would you like help with?`;

    yield {
      type: 'message',
      content: response,
    };

    await messageStorage.saveMessage(conversationId, userId, 'assistant', response);
  }

  /**
   * Handle general questions
   */
  private async *handleGeneralQuestion(
    message: string,
    context: ConversationContext,
    conversationId: string,
    userId: string
  ): AsyncGenerator<AgentResponse> {
    yield {
      type: 'thinking',
      content: 'Thinking...',
    };

    const systemPrompt = formatPrompt(JOB_SEARCH_AGENT_SYSTEM_PROMPT, {
      USER_RESUME: context.resumeContent || 'Not provided',
      USER_ICP: context.icp ? JSON.stringify(context.icp, null, 2) : 'Not defined',
      CONVERSATION_HISTORY: conversationManager.formatContextForLLM(context),
    });

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      ...conversationManager.formatMessagesForLLM(context),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseContent = response.choices[0]?.message?.content || "I'm not sure how to help with that.";

    yield {
      type: 'message',
      content: responseContent,
    };

    await messageStorage.saveMessage(conversationId, userId, 'assistant', responseContent);
  }
}
