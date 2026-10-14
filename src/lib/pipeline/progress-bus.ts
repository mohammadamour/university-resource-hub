import { EventEmitter } from "events";

/**
 * Pipeline progress event payload streamed to the client via SSE.
 */
export type PipelineStage = "uploading" | "processing" | "synthesizing" | "done" | "error";

export interface PipelineProgressEvent {
  stage: PipelineStage;
  percent: number;
  message: string;
  resourceId?: string;
  error?: string;
  timestamp: number;
}

/**
 * In-memory Progress Event Bus for local & single-instance environments.
 *
 * WHY THIS EXISTS:
 * When a file is uploaded, the background worker (Ghostscript -> Storage -> Gemini)
 * runs asynchronously in Node.js. Instead of hitting Supabase with continuous polling queries,
 * the background worker publishes granular events to this bus with zero latency.
 *
 * SSE handlers subscribe to the bus for their specific resourceId. If an SSE connection
 * arrives late or reconnects, `getLatestProgress` provides the last recorded state.
 */
class ProgressBus {
  private emitter = new EventEmitter();
  private cache = new Map<string, PipelineProgressEvent>();
  private cacheTimers = new Map<string, NodeJS.Timeout>();

  constructor() {
    // Increase max listeners to prevent warnings during multiple simultaneous uploads
    this.emitter.setMaxListeners(50);
  }

  /**
   * Publish a progress event for a specific resource upload.
   */
  publish(resourceId: string, event: Omit<PipelineProgressEvent, "timestamp">) {
    const fullEvent: PipelineProgressEvent = {
      ...event,
      resourceId,
      timestamp: Date.now(),
    };

    // Cache the latest event for late subscribers / reconnections
    this.cache.set(resourceId, fullEvent);

    // Auto-expire cached events after 10 minutes to prevent memory leaks
    const existingTimer = this.cacheTimers.get(resourceId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      this.cache.delete(resourceId);
      this.cacheTimers.delete(resourceId);
    }, 10 * 60 * 1000);

    this.cacheTimers.set(resourceId, timer);

    // Emit event to active SSE stream listeners
    this.emitter.emit(`progress:${resourceId}`, fullEvent);
  }

  /**
   * Subscribe to live progress updates for a specific resourceId.
   * Returns an unsubscribe function.
   */
  subscribe(resourceId: string, callback: (event: PipelineProgressEvent) => void): () => void {
    const channel = `progress:${resourceId}`;
    this.emitter.on(channel, callback);

    return () => {
      this.emitter.off(channel, callback);
    };
  }

  /**
   * Retrieve the latest known progress event for a resourceId.
   */
  getLatest(resourceId: string): PipelineProgressEvent | undefined {
    return this.cache.get(resourceId);
  }
}

// Global singleton instance across Next.js module evaluations
const globalForProgress = globalThis as unknown as {
  __molakhasatProgressBus?: ProgressBus;
};

export const progressBus =
  globalForProgress.__molakhasatProgressBus ?? new ProgressBus();

if (process.env.NODE_ENV !== "production") {
  globalForProgress.__molakhasatProgressBus = progressBus;
}
