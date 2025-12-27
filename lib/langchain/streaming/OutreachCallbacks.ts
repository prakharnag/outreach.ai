import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { AgentAction, AgentFinish } from "@langchain/core/agents";

/**
 * NDJSON stream event types
 */
export type StreamEventType = "status" | "intermediate" | "final" | "error";

export interface StreamEvent {
  type: StreamEventType;
  data: any;
}

/**
 * Status object for tracking agent progress
 */
export interface AgentStatus {
  research?: "running" | "complete" | "error" | "from-cache";
  verify?: "running" | "complete" | "error" | "from-cache";
  messaging?: "running" | "complete" | "error" | "from-cache";
}

/**
 * OutreachStreamingCallbacks - LangChain callback handler for NDJSON streaming
 *
 * This replaces the manual callback system in chain.ts with a LangChain-native
 * implementation that integrates with AgentExecutor.
 *
 * Features:
 * - Emits NDJSON events for real-time UI updates
 * - Maps tool names to step names (company_research → research)
 * - Tracks status for each agent step
 * - Handles errors gracefully
 *
 * Usage:
 * ```typescript
 * const encoder = new TextEncoder();
 * const controller = new ReadableStreamDefaultController();
 * const callbacks = new OutreachStreamingCallbacks(encoder, controller);
 * await agent.run(input, { callbacks: [callbacks] });
 * ```
 */
export class OutreachStreamingCallbacks extends BaseCallbackHandler {
  name = "outreach_streaming";

  private encoder: TextEncoder;
  private controller: ReadableStreamDefaultController<Uint8Array>;
  private currentStatus: AgentStatus = {};
  private currentTool: string | null = null;

  /**
   * Tool name to status step mapping
   */
  private readonly toolToStepMap: Record<string, keyof AgentStatus> = {
    "company_research": "research",
    "verify_research": "verify",
    "generate_messages": "messaging"
  };

  constructor(
    encoder: TextEncoder,
    controller: ReadableStreamDefaultController<Uint8Array>
  ) {
    super();
    this.encoder = encoder;
    this.controller = controller;
  }

  /**
   * Called when agent starts using a tool
   */
  async handleToolStart(
    tool: any,
    input: string,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    runName?: string
  ): Promise<void> {
    const toolName = tool?.name || runName || '';
    this.currentTool = toolName;
    const step = this.getStepFromTool(toolName);

    if (step) {
      this.currentStatus[step] = "running";
      this.emitStatus();
    }
  }

  /**
   * Called when tool execution completes
   */
  async handleToolEnd(
    output: string,
    runId: string,
    parentRunId?: string,
    tags?: string[]
  ): Promise<void> {
    if (!this.currentTool) return;

    const step = this.getStepFromTool(this.currentTool);

    if (step) {
      this.currentStatus[step] = "complete";
      this.emitStatus();

      // Emit intermediate data for UI display
      try {
        const parsed = JSON.parse(output);
        this.emitIntermediate(step, parsed);
      } catch (error) {
        console.warn(`[OutreachCallbacks] Could not parse tool output as JSON:`, error);
      }
    }

    this.currentTool = null;
  }

  /**
   * Called when tool execution errors
   */
  async handleToolError(error: Error): Promise<void> {
    if (!this.currentTool) return;

    const step = this.getStepFromTool(this.currentTool);

    if (step) {
      this.currentStatus[step] = "error";
      this.emitStatus();
      this.emitError(step, error);
    }

    this.currentTool = null;
  }

  /**
   * Called when agent completes successfully
   */
  async handleAgentEnd(output: AgentFinish): Promise<void> {
    this.emitFinal(output.returnValues);
  }

  /**
   * Called when agent encounters an error
   */
  async handleChainError(error: Error): Promise<void> {
    this.emitError("agent", error);
  }

  /**
   * Map tool name to status step name
   * @private
   */
  private getStepFromTool(toolName: string): keyof AgentStatus | null {
    return this.toolToStepMap[toolName] || null;
  }

  /**
   * Emit status update event
   * @private
   */
  private emitStatus(): void {
    this.emit({
      type: "status",
      data: { ...this.currentStatus }
    });
  }

  /**
   * Emit intermediate data event
   * @private
   */
  private emitIntermediate(step: keyof AgentStatus, data: any): void {
    const eventData: any = {};

    if (step === "research") {
      eventData.research = data;
    } else if (step === "verify") {
      eventData.verified = data.summary;
      eventData.verified_points = data.points;
    }

    this.emit({
      type: "intermediate",
      data: eventData
    });
  }

  /**
   * Emit final result event
   * @private
   */
  private emitFinal(data: any): void {
    this.emit({
      type: "final",
      data
    });
  }

  /**
   * Emit error event
   * @private
   */
  private emitError(step: string, error: Error): void {
    this.emit({
      type: "error",
      data: {
        step,
        message: error.message,
        stack: error.stack
      }
    });
  }

  /**
   * Encode and enqueue NDJSON event to stream
   * @private
   */
  private emit(event: StreamEvent): void {
    try {
      const ndjson = JSON.stringify(event) + "\n";
      const encoded = this.encoder.encode(ndjson);
      this.controller.enqueue(encoded);
    } catch (error) {
      console.error("[OutreachCallbacks] Failed to emit event:", error);
    }
  }

  /**
   * Get current status snapshot
   */
  getStatus(): AgentStatus {
    return { ...this.currentStatus };
  }

  /**
   * Set cached status (for when cache is used)
   */
  setCachedStatus(): void {
    this.currentStatus = {
      research: "from-cache",
      verify: "from-cache",
      messaging: "complete"
    };
    this.emitStatus();
  }
}

/**
 * Factory function to create streaming callbacks with a ReadableStream
 *
 * Usage:
 * ```typescript
 * const { stream, callbacks } = createStreamingCallbacks();
 * agent.run(input, { callbacks: [callbacks] });
 * return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
 * ```
 */
export function createStreamingCallbacks(): {
  stream: ReadableStream<Uint8Array>;
  callbacks: OutreachStreamingCallbacks;
} {
  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
    cancel() {
      // Cleanup when stream is cancelled
    }
  });

  const callbacks = new OutreachStreamingCallbacks(encoder, controllerRef!);

  return { stream, callbacks };
}
