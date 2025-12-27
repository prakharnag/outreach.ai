/**
 * Message Storage
 *
 * Handles database operations for storing and retrieving messages.
 * Provides utilities for saving user/assistant messages and managing
 * message metadata.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Message } from './conversationManager';

// ============================================================================
// TYPES
// ============================================================================

export interface SaveMessageParams {
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export interface MessageWithCount {
  message: Message;
  totalCount: number;
}

// ============================================================================
// MESSAGE STORAGE CLASS
// ============================================================================

export class MessageStorage {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Save a single message to the database
   */
  async saveMessage(params: SaveMessageParams): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        user_id: params.userId,
        role: params.role,
        content: params.content,
        metadata: params.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save message: ${error.message}`);
    }

    return data as Message;
  }

  /**
   * Save multiple messages in a batch
   */
  async saveMessages(messages: SaveMessageParams[]): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert(
        messages.map((msg) => ({
          conversation_id: msg.conversationId,
          user_id: msg.userId,
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata || {},
        }))
      )
      .select();

    if (error) {
      throw new Error(`Failed to save messages: ${error.message}`);
    }

    return data as Message[];
  }

  /**
   * Get messages for a conversation (with pagination)
   */
  async getMessages(
    conversationId: string,
    options?: {
      limit?: number;
      offset?: number;
      ascending?: boolean;
    }
  ): Promise<Message[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const ascending = options?.ascending !== false; // Default true

    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    return data as Message[];
  }

  /**
   * Get recent messages for context (last N messages)
   */
  async getRecentMessages(conversationId: string, limit = 20): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent messages: ${error.message}`);
    }

    // Reverse to get chronological order
    return (data as Message[]).reverse();
  }

  /**
   * Get message count for a conversation
   */
  async getMessageCount(conversationId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (error) {
      throw new Error(`Failed to get message count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get the first user message in a conversation (for title generation)
   */
  async getFirstUserMessage(conversationId: string): Promise<Message | null> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to get first message: ${error.message}`);
    }

    return data as Message;
  }

  /**
   * Get the last message in a conversation
   */
  async getLastMessage(conversationId: string): Promise<Message | null> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get last message: ${error.message}`);
    }

    return data as Message;
  }

  /**
   * Search messages by content (full-text search)
   */
  async searchMessages(
    userId: string,
    query: string,
    limit = 20
  ): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .textSearch('content', query)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search messages: ${error.message}`);
    }

    return data as Message[];
  }

  /**
   * Delete all messages in a conversation
   * (Usually handled by CASCADE, but provided for explicit use)
   */
  async deleteConversationMessages(conversationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (error) {
      throw new Error(`Failed to delete messages: ${error.message}`);
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format message for display (truncate if too long)
 */
export function formatMessagePreview(content: string, maxLength = 100): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '...';
}

/**
 * Extract intent from message metadata
 */
export function getMessageIntent(message: Message): string | null {
  return message.metadata?.intent || null;
}

/**
 * Check if message has specific metadata flag
 */
export function hasMetadataFlag(message: Message, flag: string): boolean {
  return message.metadata?.[flag] === true;
}

/**
 * Group messages by date (for UI display)
 */
export function groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
  const grouped = new Map<string, Message[]>();

  messages.forEach((msg) => {
    const date = new Date(msg.created_at).toLocaleDateString();
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(msg);
  });

  return grouped;
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a MessageStorage instance
 */
export function createMessageStorage(supabase: SupabaseClient): MessageStorage {
  return new MessageStorage(supabase);
}
