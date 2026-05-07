"use client";

import { useEffect, useRef, useState } from "react";

import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import type { AdminSurfaceState } from "@/lib/admin-parity";

type AdminUsersRealtimeMessage = {
  type?: "connected" | "heartbeat" | "invalidate" | "failed";
  source?: string;
  emittedAt?: number;
  metricScope?: "operational_pulse_only";
};

type UseAdminUsersRealtimeInput = {
  enabled?: boolean;
  hasSnapshotValue: boolean;
  onInvalidate: (reason: string) => void;
};

export function useAdminUsersRealtime(input: UseAdminUsersRealtimeInput) {
  const { enabled = true, hasSnapshotValue, onInvalidate } = input;
  const [pulseState, setPulseState] = useState<AdminSurfaceState>(
    hasSnapshotValue ? "fallback" : "loading",
  );
  const [pulseLabel, setPulseLabel] = useState(
    hasSnapshotValue
      ? "Showing last verified snapshot while refresh pulse connects."
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
        return "Showing last verified snapshot while refresh pulse connects.";
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

    const connect = async () => {
      setPulseState((current) => {
        if (hasSnapshotRef.current) {
          return current === "live" ? "fallback" : current;
        }
        return "loading";
      });
      setPulseLabel(
        hasSnapshotRef.current
          ? "Showing last verified snapshot while refresh pulse reconnects."
          : "Waiting for first verified snapshot.",
      );

      try {
        const response = await authFetch("/api/admin/users/realtime", {
          signal: controller.signal,
          headers: { Accept: "text/event-stream" },
        });
        if (!response.ok || !response.body) {
          throw new Error(`Realtime stream failed with ${response.status}`);
        }

        setPulseState("live");
        setPulseLabel("Operational pulse connected. Snapshot totals refresh in the background.");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) {
            setPulseState(hasSnapshotRef.current ? "fallback" : "degraded");
            setPulseLabel(
              hasSnapshotRef.current
                ? "Showing last verified snapshot while the refresh pulse reconnects."
                : "Realtime pulse disconnected before the first verified snapshot loaded.",
            );
            if (!cancelled) {
              reconnectTimer = setTimeout(() => {
                controller = new AbortController();
                attempt += 1;
                void connect();
              }, Math.min(10_000, 1_000 * (attempt + 1)));
            }
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split("\n\n");
          buffer = messages.pop() || "";
          messages.forEach((message) => {
            const line = message.split("\n").find((entry) => entry.startsWith("data: "));
            if (!line) {
              return;
            }

            try {
              const payload = JSON.parse(line.slice(6)) as AdminUsersRealtimeMessage;
              const emittedAt = payload.emittedAt ?? Date.now();
              setLastPulseAt(emittedAt);
              if (payload.type === "invalidate") {
                setLastInvalidateAt(emittedAt);
                onInvalidate(payload.source || "admin_users_realtime");
              }
              if (payload.type === "failed") {
                setLastFailureAt(emittedAt);
                setPulseState(hasSnapshotRef.current ? "degraded" : "failed");
                setPulseLabel(
                  hasSnapshotRef.current
                    ? "Realtime pulse is delayed. Showing the last verified snapshot."
                    : "Realtime pulse failed before a verified snapshot was available.",
                );
              }
            } catch {
              setPulseState(hasSnapshotRef.current ? "degraded" : "failed");
              setPulseLabel(
                hasSnapshotRef.current
                  ? "Realtime pulse data was malformed. Showing the last verified snapshot."
                  : "Realtime pulse data was malformed before a verified snapshot loaded.",
              );
            }
          });
        }
      } catch (error) {
        if (!cancelled) {
          setLastFailureAt(Date.now());
          setPulseState(hasSnapshotRef.current ? "degraded" : "failed");
          setPulseLabel(
            hasSnapshotRef.current
              ? "Realtime pulse failed. Showing the last verified snapshot."
              : "Realtime pulse failed before a verified snapshot was available.",
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
          reconnectTimer = setTimeout(() => {
            controller = new AbortController();
            attempt += 1;
            void connect();
          }, Math.min(15_000, 2_000 * (attempt + 1)));
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
      controller.abort();
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
