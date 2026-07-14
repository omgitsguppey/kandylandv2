import "server-only";

import type { RuntimeFact } from "@/lib/runtime-facts/runtime-fact-contract";
import type {
  BehavioralConsentState,
  BehavioralTimelineFact,
  BehavioralTimelineSourceTruth,
} from "@/lib/behavioral/behavioral-timeline-contract";

function normalizeSourceTruth(value: string): BehavioralTimelineSourceTruth {
  if (value === "canonical") return "canonical";
  if (value === "server") return "server";
  if (value === "materialized") return "materialized";
  if (value === "legacy") return "legacy";
  if (value === "client") return "client";
  return "legacy";
}

function resolveSurface(route: string) {
  if (route.startsWith("/admin")) return "admin" as const;
  if (route.startsWith("/dashboard/creator") || route.startsWith("/creators/")) return "creator" as const;
  if (route.startsWith("/api/")) return "server" as const;
  if (route) return "user" as const;
  return "unknown" as const;
}

function sourceReliabilityFromTruth(sourceTruth: BehavioralTimelineSourceTruth) {
  if (sourceTruth === "canonical") return 1;
  if (sourceTruth === "server") return 0.95;
  if (sourceTruth === "materialized") return 0.9;
  if (sourceTruth === "client") return 0.7;
  if (sourceTruth === "ga4_optional") return 0.35;
  return 0.3;
}

export function mapRuntimeFactToBehavioralTimelineFact(input: {
  runtimeFact: RuntimeFact;
  consentState: BehavioralConsentState;
  identityLinkId?: string;
}): BehavioralTimelineFact {
  const sourceTruth = normalizeSourceTruth(input.runtimeFact.sourceTruth);
  const actorType = input.runtimeFact.actor.actorType === "guest"
    ? "guest"
    : input.runtimeFact.actor.actorType === "creator"
      ? "creator"
      : input.runtimeFact.actor.actorType === "admin" || input.runtimeFact.actor.actorType === "owner_admin"
        ? "admin"
        : input.runtimeFact.actor.actorType === "system"
          ? "system"
          : "user";

  return {
    factId: input.runtimeFact.eventId,
    idempotencyKey: input.runtimeFact.eventId,
    actorType,
    ...(input.runtimeFact.actor.actorUserId
      ? { actorUserId: input.runtimeFact.actor.actorUserId }
      : {}),
    ...(input.runtimeFact.actor.anonymousVisitorId
      ? { anonymousVisitorId: input.runtimeFact.actor.anonymousVisitorId }
      : {}),
    ...(input.runtimeFact.actor.sessionId
      ? { sessionId: input.runtimeFact.actor.sessionId }
      : {}),
    ...(input.identityLinkId || input.runtimeFact.actor.identityLinkId
      ? { identityLinkId: input.identityLinkId || input.runtimeFact.actor.identityLinkId }
      : {}),
    normalizedAction: input.runtimeFact.normalizedAction,
    eventName: input.runtimeFact.canonicalEventName,
    timestampMs: input.runtimeFact.timestampMs,
    route: input.runtimeFact.route || "/",
    sourceComponent: input.runtimeFact.source_component || "runtime_ingest",
    surface: resolveSurface(input.runtimeFact.route || ""),
    target: {
      ...(input.runtimeFact.target.targetUserId
        ? { userId: input.runtimeFact.target.targetUserId }
        : {}),
      ...(input.runtimeFact.target.targetCreatorId
        ? { creatorId: input.runtimeFact.target.targetCreatorId }
        : {}),
      ...(input.runtimeFact.target.targetDropId
        ? { dropId: input.runtimeFact.target.targetDropId }
        : {}),
      ...(input.runtimeFact.target.targetFileId
        ? { fileId: input.runtimeFact.target.targetFileId }
        : {}),
      ...(input.runtimeFact.target.transactionId
        ? { transactionId: input.runtimeFact.target.transactionId }
        : {}),
      ...(input.runtimeFact.target.targetThreadId
        ? { threadId: input.runtimeFact.target.targetThreadId }
        : {}),
    },
    sourceTruth,
    sourceReliability: sourceReliabilityFromTruth(sourceTruth),
    consentState: input.consentState,
    includeInGlobalEvents: input.runtimeFact.includeInGlobalEvents,
    includeInPersonMetrics: input.runtimeFact.includeInUserBehavior,
    adminExcludedCount: input.runtimeFact.adminExcludedCount,
    systemExcludedCount: input.runtimeFact.systemExcludedCount,
    metricEligible: input.runtimeFact.metricEligible,
    ...(input.runtimeFact.metricExclusionReason
      ? { metricExclusionReason: input.runtimeFact.metricExclusionReason }
      : {}),
    confidenceInputs: {
      schemaComplete: Boolean(
        input.runtimeFact.eventId
          && input.runtimeFact.canonicalEventName
          && input.runtimeFact.timestampMs
          && input.runtimeFact.normalizedAction,
      ),
      hasActor: Boolean(
        input.runtimeFact.actor.actorUserId
          || input.runtimeFact.actor.actorCreatorId
          || input.runtimeFact.actor.actorAdminId
          || input.runtimeFact.actor.anonymousVisitorId,
      ),
      hasTargetWhenRequired: Boolean(
        !input.runtimeFact.normalizedAction.includes("drop")
          || input.runtimeFact.target.targetDropId,
      ),
      hasSession: Boolean(input.runtimeFact.actor.sessionId),
      hasServerTruth: input.runtimeFact.sourceTruth === "server" || input.runtimeFact.sourceTruth === "canonical",
    },
  };
}
