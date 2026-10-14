import { createClient } from "@supabase/supabase-js";
import { progressBus, type PipelineProgressEvent } from "@/lib/pipeline/progress-bus";

// Force dynamic execution for Next.js App Router (never pre-render or cache SSE)
export const dynamic = "force-dynamic";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase credentials for SSE admin client.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Server-Sent Events (SSE) Progress Route Handler (Phase 4)
 *
 * Provides real-time ingestion pipeline telemetry for a given resourceId.
 * Next.js 16 requirement: `params` is a Promise and must be awaited.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  const { resourceId } = await params;

  if (!resourceId) {
    return Response.json({ error: "Missing resourceId parameter." }, { status: 400 });
  }

  // ── Auth Gate: check x-admin-secret header OR ?key= query parameter ─────────
  // Native EventSource in browsers cannot send custom headers, so ?key= is supported.
  // Fetch-based streams (like our UploadForm) can use x-admin-secret header.
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const keyParam = url.searchParams.get("key");
  const authHeader = req.headers.get("x-admin-secret");

  if (!adminSecret || (authHeader !== adminSecret && keyParam !== adminSecret)) {
    return Response.json({ error: "Unauthorized access to telemetry stream." }, { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribeBus: (() => void) | null = null;
  let pollingInterval: NodeJS.Timeout | null = null;
  let timeoutTimer: NodeJS.Timeout | null = null;
  let isStreamClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      /**
       * Safely enqueue SSE data lines.
       */
      const sendEvent = (event: PipelineProgressEvent) => {
        if (isStreamClosed) return;
        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream might have closed on the client side
          cleanup();
        }
      };

      /**
       * Cleanup all listeners and timers when the stream terminates.
       */
      const cleanup = () => {
        if (isStreamClosed) return;
        isStreamClosed = true;

        if (unsubscribeBus) {
          unsubscribeBus();
          unsubscribeBus = null;
        }
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }

        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
      };

      // Listen for client disconnection (e.g. user closes tab or aborts)
      req.signal.addEventListener("abort", () => {
        cleanup();
      });

      // 1. Subscribe to the in-memory ProgressBus for zero-latency local events
      unsubscribeBus = progressBus.subscribe(resourceId, (event) => {
        sendEvent(event);
        if (event.stage === "done" || event.stage === "error") {
          // Allow small flush window so the final frame is transmitted cleanly
          setTimeout(() => cleanup(), 250);
        }
      });

      // 2. Immediately send the latest cached event if one exists
      const latest = progressBus.getLatest(resourceId);
      if (latest) {
        sendEvent(latest);
        if (latest.stage === "done" || latest.stage === "error") {
          setTimeout(() => cleanup(), 250);
          return;
        }
      } else {
        // Initial handshake event
        sendEvent({
          stage: "uploading",
          percent: 15,
          message: "تم الاتصال بقناة التحديثات الحية للمورد...",
          resourceId,
          timestamp: Date.now(),
        });
      }

      // 3. Database Polling Fallback (Every 2 seconds)
      // Acts as a resilient fallback in case events were published before connection
      // or if running in a multi-instance/serverless environment.
      let pollAttempts = 0;
      const MAX_POLL_ATTEMPTS = 30; // 60 seconds max

      pollingInterval = setInterval(async () => {
        if (isStreamClosed) return;

        pollAttempts++;
        if (pollAttempts > MAX_POLL_ATTEMPTS) {
          sendEvent({
            stage: "error",
            percent: 100,
            message: "انتهت مهلة انتظار المعالجة (تجاوزت 60 ثانية). يرجى مراجعة حالة المورد لاحقاً.",
            error: "PIPELINE_TIMEOUT",
            resourceId,
            timestamp: Date.now(),
          });
          cleanup();
          return;
        }

        try {
          const supabase = createAdminClient();
          const { data: resource, error } = await supabase
            .from("resources")
            .select("status, storage_url, source_text, quiz_data")
            .eq("id", resourceId)
            .single();

          if (error || !resource) return;

          if (resource.status === "active") {
            sendEvent({
              stage: "done",
              percent: 100,
              message: resource.quiz_data
                ? "اكتملت جميع المراحل وتوليد الكويز بنجاح!"
                : "تم حفظ ونشر المورد بنجاح!",
              resourceId,
              timestamp: Date.now(),
            });
            cleanup();
          } else if (resource.status === "rejected") {
            sendEvent({
              stage: "error",
              percent: 100,
              message: "تم رفض المورد أو فشلت معالجته في الخادم.",
              error: "RESOURCE_REJECTED",
              resourceId,
              timestamp: Date.now(),
            });
            cleanup();
          } else if (
            resource.status === "processing" &&
            resource.storage_url &&
            resource.storage_url !== "__processing__" &&
            resource.source_text === "__PENDING_EXTRACTION__"
          ) {
            // Document uploaded to Supabase, now synthesizing quiz via Gemini
            sendEvent({
              stage: "synthesizing",
              percent: 80,
              message: "تم رفع المستند، وجارٍ استخراج المفاهيم وتوليد الكويز عبر Gemini...",
              resourceId,
              timestamp: Date.now(),
            });
          }
        } catch (dbErr) {
          console.warn("[sse] Polling fallback error (non-fatal):", dbErr);
        }
      }, 2000);

      // Hard safety timer: close after 70 seconds to prevent zombie connections
      timeoutTimer = setTimeout(() => {
        cleanup();
      }, 70 * 1000);
    },
    cancel() {
      // Called if client cancels/aborts the ReadableStream
      if (unsubscribeBus) unsubscribeBus();
      if (pollingInterval) clearInterval(pollingInterval);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      isStreamClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disables response buffering in Nginx / proxy layers
    },
  });
}
