import { NextRequest } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FirestoreUnsubscribe = () => void;

function encodeRealtimeMessage(payload: Record<string, unknown>) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

async function GET_handler(request: NextRequest) {
  await guardApiRequest(request, {
    routeName: "admin/users/realtime",
    rateLimit: ADMIN,
    requireTrustedOrigin: true,
    auth: "admin",
  });

  const encoder = new TextEncoder();
  const unsubscribers: FirestoreUnsubscribe[] = [];
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(encodeRealtimeMessage(payload)));
        } catch {
          // The client disconnected between snapshot scheduling and enqueue.
        }
      };

      heartbeat = setInterval(() => {
        send({
          type: "heartbeat",
          source: "admin_users_realtime",
          metricScope: "operational_pulse_only",
          emittedAt: Date.now(),
        });
      }, 25_000);

      const watch = (source: string, subscribe: (onChange: () => void, onError: (error: unknown) => void) => FirestoreUnsubscribe) => {
        const unsubscribe = subscribe(
          () => {
            send({
              type: "invalidate",
              source,
              metricScope: "operational_pulse_only",
              emittedAt: Date.now(),
            });
          },
          (error) => {
            recordServerDiagnostic({
              channel: "analytics",
              severity: "warn",
              message: "Admin users realtime source failed",
              detail: {
                source,
                message: error instanceof Error ? error.message : String(error),
              },
            }).catch(() => undefined);
            send({
              type: "failed",
              source,
              metricScope: "operational_pulse_only",
              emittedAt: Date.now(),
            });
          },
        );
        unsubscribers.push(unsubscribe);
      };

      watch("users", (onChange, onError) => adminDb.collection("users").onSnapshot(onChange, onError));
      watch("analytics_users_rollup", (onChange, onError) => adminDb.collection("analytics_users_rollup").onSnapshot(onChange, onError));
      watch("analytics_user_daily", (onChange, onError) => adminDb.collection("analytics_user_daily").onSnapshot(onChange, onError));
      watch("analytics_commerce_rollup/summary", (onChange, onError) => adminDb.collection("analytics_commerce_rollup").doc("summary").onSnapshot(onChange, onError));

      send({
        type: "connected",
        source: "admin_users_realtime",
        metricScope: "operational_pulse_only",
        emittedAt: Date.now(),
      });

    },
    cancel() {
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}

export let GET = withRouteRuntimeHealth("admin/users/realtime:GET", GET_handler);
