"use client";

import { useEffect, useRef, useState } from "react";

import { authFetch } from "@/lib/authFetch";
import { shouldRetry4xx } from "@/lib/route-hardening/route-4xx-mitigation";
import {
  ADMIN_USERS_REALTIME_POLICY,
  resolveAdminRealtimeFailureState,
} from "@/lib/admin/admin-realtime-policy";
import { reportClientIssue } from "@/lib/client-error-reporting";
import type { AdminSurfaceState } from "@/lib/admin-parity";

type AdminUsersRealtimeMessage = {
  type?: "connected" | "heartbeat" | "invalidate" | "failed";
  source?: string;
  emittedAt?: number;
  metricScope?: "operational_pulse_only";
  purpose?: "operational_pulse_only";
  owner?: string;
  cadenceMs?: number;
  costRisk?: "low" | "moderate" | "high";
};

type UseAdminUsersRealtimeInput = {
  enabled?: boolean;
  hasSnapshotValue: boolean;
  onInvalidate: (reason: string) => void;
};

type AdminUsersStreamFailure = Error & {
  status?: number;
  retryAfterSeconds?: number;
  permanent?: boolean;
};

function readRetryAfterSeconds(response: Response) {
  const value = response.headers.get("Retry-After");
  if (!value || !/^\d+$/.test(value)) return undefined;
  const seconds = Number(value);
  return seconds > 0 && seconds <= 2_147_483 ? seconds : undefined;
}

export function useAdminUsersRealtime(input: UseAdminUsersRealtimeInput) {
  const { enabled = true, hasSnapshotValue, onInvalidate } = input;
  const [pulseState, setPulseState] = useState<AdminSurfaceState>(
    hasSnapshotValue ? "fallback" : "loading",
  );
  const [pulseLabel, setPulseLabel] = useState(
    hasSnapshotValue
      ? "Showing last verified snapshot while refresh connects."
      : "Waiting for first verified snapshot.",
  );
  const [lastPulseAt, setLastPulseAt] = useState<number | null>(null);
  const [lastInvalidateAt, setLastInvalidateAt] = useState<number | null>(null);
  const [lastFailureAt, setLastFailureAt] = useState<number | null>(null);
  const hasSnapshotRef = useRef(hasSnapshotValue);

  useEffect(() => {
    hasSnapshotRef.current = hasSnapshotValue;
    setPulseState((current) => {
      if (hasSnapshotValue && (current === "loading" || current === "failed")) {
        return "fallback";
      }
      if (!hasSnapshotValue && current === "fallback") {
        return "loading";
      }
      return current;
    });
    setPulseLabel((current) => {
      if (hasSnapshotValue && current === "Waiting for first verified snapshot.") {
        return "Showing last verified snapshot while refresh connects.";
      }
      return current;
    });
  }, [hasSnapshotValue]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let controller = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let settled: "permanent" | "exhausted" | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    const scheduleReconnect = (error?: AdminUsersStreamFailure) => {
      if (cancelled || settled || reconnectTimer !== null) return;
      const preflightPermanent = error?.message === "Not authenticated"
        || error?.message === "Authentication is unavailable in this environment"
        || error?.message === "Cross-origin authenticated requests are not allowed";
      const retryable = !preflightPermanent && error?.permanent !== true
        && (typeof error?.status === "number" && error.status >= 400 && error.status < 500
          ? shouldRetry4xx({
              route: "/api/admin/users/realtime", method: "GET", statusCode: error.status,
              retryAfterSeconds: error.retryAfterSeconds,
            }).retry
          : true);
      if (!retryable || attempt >= 4) {
        settled = retryable ? "exhausted" : "permanent";
        setPulseState(resolveAdminRealtimeFailureState(hasSnapshotRef.current));
        setPulseLabel(settled === "exhausted"
          ? "Snapshot refresh paused after repeated failures. Reopen this view or reconnect after network recovery."
          : "Snapshot refresh paused. Check the admin session or source before reopening this view.");
        return;
      }
      const delay = Math.max(
        Math.min(ADMIN_USERS_REALTIME_POLICY.reconnectBackoffMaxMs ?? 15_000, 2_000 * 2 ** attempt),
        (error?.retryAfterSeconds ?? 0) * 1_000,
      );
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        controller = new AbortController();
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (cancelled || settled) return;
          setPulseState((current) => {
            if (hasSnapshotRef.current) {
              return current === "live" ? "fallback" : current;
            }
            return "loading";
      });
      setPulseLabel(
        hasSnapshotRef.current
          ? "Showing last verified snapshot while refresh reconnects."
          : "Waiting for first verified snapshot.",
      );

      try {
        const response = await authFetch("/api/admin/users/realtime", {
          signal: controller.signal,
          headers: { Accept: "text/event-stream" },
        });
        if (cancelled) {
          void response.body?.cancel().catch(() => undefined);
          return;
        }
        if (!response.ok || !response.body) {
          throw Object.assign(new Error(`Realtime stream failed with ${response.status}`), {
            status: response.status,
            retryAfterSeconds: readRetryAfterSeconds(response),
            permanent: response.ok && !response.body,
          });
        }

        setPulseState("live");
        setPulseLabel("Snapshot refresh connected. Totals update in the background.");
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (cancelled) return;
          if (done) {
            setPulseState(hasSnapshotRef.current ? "fallback" : "degraded");
            setPulseLabel(
              hasSnapshotRef.current
                ? "Showing last verified snapshot while refresh reconnects."
                : "Snapshot refresh disconnected before the first verified snapshot loaded.",
            );
            scheduleReconnect();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split("\n\n");
          buffer = messages.pop() || "";
          for (const message of messages) {
            const line = message.split("\n").find((entry) => entry.startsWith("data: "));
            if (!line) {
              continue;
            }

            let payload: AdminUsersRealtimeMessage;
            try {
              payload = JSON.parse(line.slice(6)) as AdminUsersRealtimeMessage;
              if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
            } catch {
              throw Object.assign(new Error("Snapshot refresh data is malformed"), { permanent: true });
            }
            if (payload.metricScope !== ADMIN_USERS_REALTIME_POLICY.metricScope) {
              setLastFailureAt(Date.now());
              setPulseState(resolveAdminRealtimeFailureState(hasSnapshotRef.current));
              setPulseLabel(
                hasSnapshotRef.current
                  ? "Snapshot refresh source reported an invalid scope. Showing the last verified snapshot."
                  : "Snapshot refresh source reported an invalid scope before a verified snapshot was available.",
              );
              throw Object.assign(new Error("Snapshot refresh scope is invalid"), { permanent: true });
            }
            const emittedAt = payload.emittedAt ?? Date.now();
            setLastPulseAt(emittedAt);
            if (payload.type === "invalidate") {
              setLastInvalidateAt(emittedAt);
              onInvalidate(payload.source || "admin_users_realtime");
            }
            if (payload.type === "failed") {
              setLastFailureAt(emittedAt);
              setPulseState(resolveAdminRealtimeFailureState(hasSnapshotRef.current));
              setPulseLabel(
                hasSnapshotRef.current
                  ? "Refresh due. Showing the last verified snapshot."
                  : "Snapshot refresh failed before a verified snapshot was available.",
              );
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLastFailureAt(Date.now());
          setPulseState(resolveAdminRealtimeFailureState(hasSnapshotRef.current));
          setPulseLabel(
            hasSnapshotRef.current
              ? "Snapshot refresh failed. Showing the last verified snapshot."
              : "Snapshot refresh failed before a verified snapshot was available.",
          );
          reportClientIssue({
            channel: "ui",
            message: "Admin users realtime stream failed",
            error,
            detail: {
              adminView: "users",
              action: "realtime_stream",
            },
            consoleLabel: "[Admin Users] realtime stream failed",
          });
          void reader?.cancel().catch(() => undefined);
          scheduleReconnect(error as AdminUsersStreamFailure);
        }
      }
    };

    const recoverOnline = () => {
      if (!cancelled && settled === "exhausted") {
        settled = null;
        attempt = 0;
        controller = new AbortController();
        void connect();
      }
    };

    window.addEventListener("online", recoverOnline);

    void connect();

    return () => {
      cancelled = true;
      controller.abort();
      void reader?.cancel().catch(() => undefined);
      window.removeEventListener("online", recoverOnline);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [enabled, onInvalidate]);

  return {
    pulseState,
    pulseLabel,
    lastPulseAt,
    lastInvalidateAt,
    lastFailureAt,
  };
}
