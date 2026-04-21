"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { getClientSessionId, getClientSubjectId } from "@/lib/client-session";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { buildRolloutTelemetryContext, resolveRolloutAssignments, type RolloutAssignment } from "@/lib/rollouts";
import { getReleaseTelemetryContext } from "@/lib/release-tracking";
import { syncTelemetryReleaseContext, syncTelemetryRolloutContext, trackEvent } from "@/lib/telemetry";

interface RolloutContextValue {
  assignments: RolloutAssignment[];
  getVariant: (rolloutId: string, fallback?: string) => string;
  isEnabled: (rolloutId: string) => boolean;
}

const ROLLOUT_EXPOSURE_STORAGE_KEY = "kandydrops.rolloutExposure";

const RolloutContext = createContext<RolloutContextValue | null>(null);

function readExposureKeys() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = window.sessionStorage.getItem(ROLLOUT_EXPOSURE_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }

    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

function writeExposureKeys(exposureKeys: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(ROLLOUT_EXPOSURE_STORAGE_KEY, JSON.stringify(Array.from(exposureKeys)));
  } catch {
    // Ignore storage failures in restricted contexts.
  }
}

export function RolloutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, userProfile } = useAuth();
  const [clientIdentity, setClientIdentity] = useState<{ sessionId: string; subjectId: string } | null>(null);
  const [remoteFetched, setRemoteFetched] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setClientIdentity({
        sessionId: getClientSessionId(),
        subjectId: getClientSubjectId(),
      });
    });
    
    import("@/lib/rollouts").then(({ initializeRemoteRollouts }) => {
      initializeRemoteRollouts().then(() => setRemoteFetched(true));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const assignments = useMemo(
    () => resolveRolloutAssignments({
      uid: user?.uid ?? null,
      role: userProfile?.role ?? null,
      sessionId: clientIdentity?.sessionId ?? null,
      subjectId: clientIdentity?.subjectId ?? null,
      path: pathname || "/",
    }),
    [clientIdentity?.sessionId, clientIdentity?.subjectId, pathname, user?.uid, userProfile?.role],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !clientIdentity) {
      return;
    }

    const exposureKeys = readExposureKeys();
    let changed = false;

    assignments.forEach((assignment) => {
      const exposureKey = `${assignment.id}:${assignment.variant}:${assignment.reason}`;
      if (exposureKeys.has(exposureKey)) {
        return;
      }

      exposureKeys.add(exposureKey);
      changed = true;
      recordClientDiagnostic("rollout", "Rollout assignment evaluated", {
        rolloutId: assignment.id,
        variant: assignment.variant,
        reason: assignment.reason,
        path: pathname || "/",
      });
      trackEvent(
        assignment.kind === "experiment" ? "experiment_variant_exposed" : "feature_flag_exposed",
        {
          rollout_id: assignment.id,
          rollout_variant: assignment.variant,
          rollout_reason: assignment.reason,
          rollout_active: assignment.active,
          rollout_audience: assignment.audience,
          path: pathname || "/",
        },
      );
    });

    if (changed) {
      writeExposureKeys(exposureKeys);
    }
  }, [assignments, clientIdentity, pathname]);

  useEffect(() => {
    syncTelemetryRolloutContext(buildRolloutTelemetryContext(assignments));
    syncTelemetryReleaseContext(getReleaseTelemetryContext());
    return () => {
      syncTelemetryRolloutContext(null);
      syncTelemetryReleaseContext(null);
    };
  }, [assignments]);

  const value = useMemo<RolloutContextValue>(() => ({
    assignments,
    getVariant: (rolloutId, fallback = "control") => (
      assignments.find((assignment) => assignment.id === rolloutId)?.variant || fallback
    ),
    isEnabled: (rolloutId) => {
      const assignment = assignments.find((candidate) => candidate.id === rolloutId);
      return Boolean(assignment?.active && assignment.variant !== assignment.defaultVariant);
    },
  }), [assignments]);

  return (
    <RolloutContext.Provider value={value}>
      {children}
    </RolloutContext.Provider>
  );
}

export function useRollouts() {
  const context = useContext(RolloutContext);
  if (!context) {
    throw new Error("useRollouts must be used within RolloutProvider");
  }
  return context;
}

export function useRolloutVariant(rolloutId: string, fallback = "control") {
  return useRollouts().getVariant(rolloutId, fallback);
}

export function useRolloutEnabled(rolloutId: string) {
  return useRollouts().isEnabled(rolloutId);
}
