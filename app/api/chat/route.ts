/**
 * Chat API Endpoint
 *
 * Main conversational AI endpoint that handles multi-turn conversations.
 * Streams responses as NDJSON for real-time UI updates.
 *
 * Features:
 * - Multi-turn conversation support
 * - NDJSON streaming for real-time responses
 * - Supabase Auth integration
 * - Conversation history management
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ConversationManager } from '@/lib/conversation/conversationManager';
import { MessageStorage } from '@/lib/conversation/messageStorage';
import { JobSearchAgent } from '@/lib/agents/JobSearchAgent';
import { getUserResumeData } from '@/lib/resumeUtils';

// ============================================================================
// TYPES
// ============================================================================

interface ChatRequest {
  message: string;
  conversationId?: string | null;
  settings?: {
    tone?: string;
    useResume?: boolean;
  };
}

interface StreamEvent {
  type: 'thinking' | 'message' | 'icp' | 'companies' | 'draft' | 'complete' | 'error';
  content?: string;
  data?: any;
  metadata?: Record<string, any>;
}

// ============================================================================
// STREAM HELPER
// ============================================================================

/**
 * Create a streaming response encoder
 */
function createStreamEncoder() {
  const encoder = new TextEncoder();

  return {
    encode(event: StreamEvent): Uint8Array {
      return encoder.encode(JSON.stringify(event) + '\n');
    },
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // 1. Parse request body
    const body: ChatRequest = await req.json();
    const { message, conversationId, settings } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // 2. Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore if called from Server Component
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Initialize managers
    const conversationManager = new ConversationManager(supabase);
    const messageStorage = new MessageStorage(supabase);

    // 4. Get or create conversation
    let currentConversationId = conversationId;

    if (!currentConversationId) {
      // Create new conversation
      const newConversation = await conversationManager.createConversation(
        user.id
      );
      currentConversationId = newConversation.id;
    } else {
      // Verify conversation exists and belongs to user
      const conversation = await conversationManager.getConversation(
        currentConversationId,
        user.id
      );
      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
    }

    // 5. Save user message
    await messageStorage.saveMessage({
      conversationId: currentConversationId,
      userId: user.id,
      role: 'user',
      content: message,
    });

    // 6. Get resume content if needed
    let resumeContent: string | undefined;
    if (settings?.useResume) {
      try {
        const resumeData = await getUserResumeData(user.id);
        if (resumeData?.content) {
          resumeContent = resumeData.content;
        }
      } catch (error) {
        console.error('[Chat API] Error loading resume:', error);
        // Continue without resume
      }
    }

    // 7. Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = createStreamEncoder();

        try {
          // Initialize agent
          const agent = new JobSearchAgent();

          // Process message and stream responses
          const agentSettings = {
            tone: settings?.tone,
            useResume: settings?.useResume,
            resumeContent,
          };

          for await (const response of agent.processMessage(
            supabase,
            message,
            currentConversationId!,
            user.id,
            agentSettings
          )) {
            controller.enqueue(encoder.encode(response));
          }

          // Update conversation timestamp
          await conversationManager.touchConversation(currentConversationId!);

          // Send final complete event with conversationId
          controller.enqueue(
            encoder.encode({
              type: 'complete',
              data: {
                conversationId: currentConversationId,
              },
            })
          );

          controller.close();
        } catch (error: any) {
          console.error('[Chat API] Error:', error);

          controller.enqueue(
            encoder.encode({
              type: 'error',
              content: error.message || 'An error occurred',
            })
          );

          controller.close();
        }
      },
    });

    // 8. Return streaming response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Chat API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS HANDLER (for CORS)
// ============================================================================

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
