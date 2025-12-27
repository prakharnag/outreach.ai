'use client';

/**
 * ChatInterface
 *
 * Main conversational AI chat interface component.
 * Handles message display, input, streaming responses, and settings.
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Settings, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { WRITING_TONES, WritingTone } from '../../lib/tones';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
  metadata?: any;
}

interface ChatSettings {
  tone: WritingTone;
  useResume: boolean;
}

interface StreamEvent {
  type: 'thinking' | 'message' | 'icp' | 'companies' | 'draft' | 'complete' | 'error';
  content?: string;
  data?: any;
  metadata?: any;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ChatSettings>({
    tone: 'professional',
    useResume: false,
  });
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingMessage]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Send message to API
   */
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setThinkingMessage('Processing...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          conversationId,
          settings: {
            tone: settings.tone,
            useResume: settings.useResume,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Parse NDJSON stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event: StreamEvent = JSON.parse(line);

            switch (event.type) {
              case 'thinking':
                setThinkingMessage(event.content || 'Thinking...');
                break;

              case 'message':
                assistantMessage.content += (assistantMessage.content ? '\n\n' : '') + event.content;
                setMessages((prev) => {
                  const existing = prev.find((m) => m.id === assistantMessage.id);
                  if (existing) {
                    return prev.map((m) =>
                      m.id === assistantMessage.id ? { ...assistantMessage } : m
                    );
                  }
                  return [...prev, { ...assistantMessage }];
                });
                setThinkingMessage(null);
                break;

              case 'icp':
                assistantMessage.data = {
                  ...assistantMessage.data,
                  icp: event.data,
                };
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMessage.id ? { ...assistantMessage } : m))
                );
                break;

              case 'companies':
                assistantMessage.data = {
                  ...assistantMessage.data,
                  companies: event.data,
                  searchSummary: event.metadata?.searchSummary,
                };
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMessage.id ? { ...assistantMessage } : m))
                );
                break;

              case 'draft':
                assistantMessage.data = {
                  ...assistantMessage.data,
                  draft: {
                    content: event.content,
                    ...event.metadata,
                  },
                };
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMessage.id ? { ...assistantMessage } : m))
                );
                break;

              case 'complete':
                if (event.data?.conversationId) {
                  setConversationId(event.data.conversationId);
                }
                setThinkingMessage(null);
                break;

              case 'error':
                setThinkingMessage(null);
                const errorMessage: Message = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: `Error: ${event.content || 'An error occurred'}`,
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
                break;
            }
          } catch (e) {
            console.error('[ChatInterface] Error parsing event:', e, line);
          }
        }
      }
    } catch (error) {
      console.error('[ChatInterface] Error:', error);
      setThinkingMessage(null);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, an error occurred. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /**
   * Clear conversation
   */
  const clearConversation = () => {
    setMessages([]);
    setConversationId(null);
    setThinkingMessage(null);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Job Search Assistant</h1>
          <p className="text-sm text-gray-500">
            Find jobs, research companies, and draft personalized messages
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Settings */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Chat Settings</SheetTitle>
                <SheetDescription>Customize your job search assistant</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Tone Selection */}
                <div className="space-y-2">
                  <Label htmlFor="tone">Writing Tone</Label>
                  <Select
                    value={settings.tone}
                    onValueChange={(value) =>
                      setSettings((prev) => ({ ...prev, tone: value as WritingTone }))
                    }
                  >
                    <SelectTrigger id="tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WRITING_TONES.map((tone) => (
                        <SelectItem key={tone.id} value={tone.id}>
                          <div>
                            <div className="font-medium">{tone.label}</div>
                            <div className="text-xs text-gray-500">{tone.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Resume Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="resume">Use Resume for Personalization</Label>
                    <p className="text-xs text-gray-500">
                      Include your resume in message generation
                    </p>
                  </div>
                  <Switch
                    id="resume"
                    checked={settings.useResume}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, useResume: checked }))
                    }
                  />
                </div>

                {/* Clear Conversation */}
                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={clearConversation} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Clear Conversation
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {messages.length === 0 && !thinkingMessage && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-md">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to your AI Job Search Assistant!
              </h2>
              <p className="text-gray-600 mb-6">
                I can help you find jobs, research companies, and draft personalized outreach
                messages. Try asking me:
              </p>
              <ul className="text-left text-sm text-gray-500 space-y-2">
                <li>• "I'm looking for ML engineer roles in AI startups"</li>
                <li>• "Find me companies hiring for remote positions"</li>
                <li>• "Research OpenAI and their open roles"</li>
                <li>• "Draft a LinkedIn message for Anthropic"</li>
              </ul>
            </div>
          </div>
        )}

        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {thinkingMessage && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                AI
              </div>
              <div className="flex-1 bg-white rounded-lg px-4 py-3 shadow-sm border">
                <p className="text-sm text-gray-500 italic">{thinkingMessage}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your job search..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!inputValue.trim() || isLoading}>
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MESSAGE BUBBLE COMPONENT
// ============================================================================

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
          isUser ? 'bg-gray-700' : 'bg-blue-500'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Content */}
      <div
        className={`flex-1 rounded-lg px-4 py-3 shadow-sm ${
          isUser ? 'bg-gray-700 text-white' : 'bg-white border'
        }`}
      >
        {/* Text content */}
        {message.content && (
          <div className="prose prose-sm max-w-none">
            {message.content.split('\n').map((line, i) => (
              <p key={i} className={isUser ? 'text-white' : ''}>
                {line}
              </p>
            ))}
          </div>
        )}

        {/* ICP Data */}
        {message.data?.icp && (
          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="font-semibold text-sm text-blue-900 mb-2">Ideal Customer Profile</p>
            <div className="text-xs text-blue-800 space-y-1">
              {message.data.icp.target_roles?.length > 0 && (
                <p>Roles: {message.data.icp.target_roles.join(', ')}</p>
              )}
              {message.data.icp.industries?.length > 0 && (
                <p>Industries: {message.data.icp.industries.join(', ')}</p>
              )}
              {message.data.icp.locations?.length > 0 && (
                <p>Locations: {message.data.icp.locations.join(', ')}</p>
              )}
            </div>
          </div>
        )}

        {/* Companies */}
        {message.data?.companies && message.data.companies.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.data.companies.map((company: any, i: number) => (
              <div key={i} className="p-3 bg-green-50 rounded border border-green-200">
                <p className="font-semibold text-sm text-green-900">{company.name}</p>
                <p className="text-xs text-green-800 mt-1">{company.description}</p>
                {company.open_roles && company.open_roles.length > 0 && (
                  <p className="text-xs text-green-700 mt-1">
                    Roles: {company.open_roles.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Draft */}
        {message.data?.draft && (
          <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-200">
            <p className="font-semibold text-sm text-purple-900 mb-2">
              {message.data.draft.messageType === 'email' ? 'Email Draft' : 'LinkedIn Draft'}
            </p>
            {message.data.draft.subject && (
              <p className="text-xs text-purple-800 font-semibold mb-1">
                Subject: {message.data.draft.subject}
              </p>
            )}
            <p className="text-xs text-purple-800 whitespace-pre-wrap">
              {message.data.draft.content}
            </p>
          </div>
        )}

        {/* Timestamp */}
        <p className={`text-xs mt-2 ${isUser ? 'text-gray-300' : 'text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
