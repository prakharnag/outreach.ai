/**
 * Conversation Manager
 *
 * Manages conversation state and context for multi-turn AI conversations.
 * Handles loading conversation history, formatting context for LLM, and
 * managing conversation metadata.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ICPProfile {
  id: string;
  user_id: string;
  conversation_id: string | null;
  target_roles: string[];
  industries: string[];
  company_sizes: string[];
  locations: string[];
  tech_stack: string[];
  additional_criteria: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ConversationContext {
  conversation: Conversation;
  messages: Message[];
  icp?: ICPProfile;
  resumeContent?: string;
  messageCount: number;
}

// ============================================================================
// CONVERSATION MANAGER CLASS
// ============================================================================

export class ConversationManager {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Create a new conversation for a user
   */
  async createConversation(userId: string, title?: string): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: title || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return data as Conversation;
  }

  /**
   * Get a conversation by ID (with auth check)
   */
  async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to get conversation: ${error.message}`);
    }

    return data as Conversation;
  }

  /**
   * List all conversations for a user
   */
  async listConversations(userId: string, limit = 50): Promise<Conversation[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list conversations: ${error.message}`);
    }

    return data as Conversation[];
  }

  /**
   * Delete a conversation (cascades to messages)
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }
  }

  /**
   * Load conversation context for LLM
   *
   * Loads:
   * - Conversation metadata
   * - Recent message history (last N messages)
   * - User's ICP if available
   * - User's resume content if enabled
   */
  async loadContext(
    conversationId: string,
    userId: string,
    options?: {
      messageLimit?: number;
      includeICP?: boolean;
      includeResume?: boolean;
    }
  ): Promise<ConversationContext> {
    const messageLimit = options?.messageLimit || 20;

    // Load conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Load recent messages
    const { data: messages, error: messagesError } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(messageLimit);

    if (messagesError) {
      throw new Error(`Failed to load messages: ${messagesError.message}`);
    }

    const context: ConversationContext = {
      conversation,
      messages: messages as Message[],
      messageCount: messages.length,
    };

    // Load ICP if requested
    if (options?.includeICP) {
      const { data: icp } = await this.supabase
        .from('icp_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (icp) {
        context.icp = icp as ICPProfile;
      }
    }

    // Load resume if requested
    if (options?.includeResume) {
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('resume_content, use_resume_in_personalization')
        .eq('user_id', userId)
        .single();

      if (profile?.use_resume_in_personalization && profile?.resume_content) {
        context.resumeContent = profile.resume_content;
      }
    }

    return context;
  }

  /**
   * Format conversation context for LLM prompt
   *
   * Converts conversation history into a format suitable for LLM context
   */
  formatContextForLLM(context: ConversationContext): string {
    const parts: string[] = [];

    // Add resume if available
    if (context.resumeContent) {
      parts.push('=== USER RESUME ===');
      parts.push(context.resumeContent.substring(0, 2000)); // Limit resume length
      parts.push('');
    }

    // Add ICP if available
    if (context.icp) {
      parts.push('=== USER ICP (IDEAL CUSTOMER PROFILE) ===');
      parts.push(`Target Roles: ${context.icp.target_roles.join(', ')}`);
      parts.push(`Industries: ${context.icp.industries.join(', ')}`);
      parts.push(`Company Sizes: ${context.icp.company_sizes.join(', ')}`);
      parts.push(`Locations: ${context.icp.locations.join(', ')}`);
      parts.push(`Tech Stack: ${context.icp.tech_stack.join(', ')}`);
      parts.push('');
    }

    // Add conversation history
    if (context.messages.length > 0) {
      parts.push('=== CONVERSATION HISTORY ===');
      context.messages.forEach((msg) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        parts.push(`${role}: ${msg.content}`);
      });
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Format messages as array for LLM (OpenAI format)
   */
  formatMessagesForLLM(context: ConversationContext): Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }> {
    const formatted = [];

    // Add system message with context if available
    if (context.resumeContent || context.icp) {
      const systemParts: string[] = [];

      if (context.resumeContent) {
        systemParts.push('User Resume (first 2000 chars):');
        systemParts.push(context.resumeContent.substring(0, 2000));
      }

      if (context.icp) {
        systemParts.push('\nUser ICP:');
        systemParts.push(`Roles: ${context.icp.target_roles.join(', ')}`);
        systemParts.push(`Industries: ${context.icp.industries.join(', ')}`);
        systemParts.push(`Sizes: ${context.icp.company_sizes.join(', ')}`);
        systemParts.push(`Locations: ${context.icp.locations.join(', ')}`);
        systemParts.push(`Tech: ${context.icp.tech_stack.join(', ')}`);
      }

      formatted.push({
        role: 'system' as const,
        content: systemParts.join('\n'),
      });
    }

    // Add conversation messages
    context.messages.forEach((msg) => {
      formatted.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    });

    return formatted;
  }

  /**
   * Update conversation's updated_at timestamp
   */
  async touchConversation(conversationId: string): Promise<void> {
    await this.supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a ConversationManager instance with Supabase client
 */
export function createConversationManager(supabase: SupabaseClient): ConversationManager {
  return new ConversationManager(supabase);
}

/**
 * Create a ConversationManager for server-side use (with service role)
 */
export function createServerConversationManager(): ConversationManager {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return new ConversationManager(supabase);
}
