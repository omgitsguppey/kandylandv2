import type { AdminModerationSecurityAlert } from "@/lib/admin-moderation";
import {
  describeSecurityEvent,
  isKnownSecurityEventReason,
  type SecurityEventConfidence,
  type SecurityEventSeverity,
} from "@/lib/security-events";
import { normalizeModerationEvidence } from "@/lib/moderation/moderation-evidence";
import { scoreSingleModerationEvidence } from "@/lib/moderation/scrape-risk-score";

const BURST_BUCKET_MS = 10 * 60_000;

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.trunc(numeric);
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    try {
      return Math.trunc((value as { toMillis: () => number }).toMillis());
    } catch {
      return 0;
    }
  }
  return 0;
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableString(value: unknown): string | null {
  const normalized = toStringValue(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeSeverity(value: unknown, fallback: SecurityEventSeverity): SecurityEventSeverity {
  return value === "high" || value === "low" || value === "medium" ? value : fallback;
}

function normalizeConfidence(value: unknown, fallback: SecurityEventConfidence, knownReason: boolean) {
  if (value === "confirmed" || value === "heuristic") return value;
  return knownReason ? fallback : "unknown";
}

function normalizeSource(value: unknown): string {
  return toStringValue(value) || "security_log";
}

function resolveSourceLabel(source: string, serverConfirmed: boolean): string {
  if (serverConfirmed) return "Server log";
  if (source === "protected_viewer") return "Protected viewer";
  if (source === "legacy_security_flags") return "Legacy account flag";
  return "Security log";
}

function resolveFalsePositiveRisk(input: {
  confidence: AdminModerationSecurityAlert["confidence"];
  detectionKind: string;
  knownReason: boolean;
}): AdminModerationSecurityAlert["falsePositiveRisk"] {
  if (!input.knownReason || input.confidence === "unknown") return "unknown";
  if (input.confidence === "confirmed") return "low";
  if (input.detectionKind === "screenshot" || input.detectionKind === "screen_recording") return "high";
  if (input.detectionKind === "devtools" || input.detectionKind === "runtime") return "medium";
  return "medium";
}

function resolvePriority(input: {
  riskScore: number;
  riskTier: AdminModerationSecurityAlert["riskTier"];
  confidence: AdminModerationSecurityAlert["confidence"];
  repeatCount: number;
}): Pick<AdminModerationSecurityAlert, "reviewPriority" | "priorityLabel"> {
  if (input.confidence === "unknown") {
    return { reviewPriority: "normal", priorityLabel: "Check" };
  }
  if (input.riskTier === "critical" && input.confidence === "confirmed") {
    return { reviewPriority: "urgent", priorityLabel: "Review now" };
  }
  if (input.riskTier === "high" || input.repeatCount >= 3 || input.riskScore >= 40) {
    return { reviewPriority: "elevated", priorityLabel: "Needs review" };
  }
  if (input.riskTier === "low") {
    return { reviewPriority: "low", priorityLabel: "Monitor" };
  }
  return { reviewPriority: "normal", priorityLabel: "Check" };
}

function resolveAccuracyLabel(confidence: AdminModerationSecurityAlert["confidence"]): string {
  if (confidence === "confirmed") return "Confirmed";
  if (confidence === "heuristic") return "Needs review";
  return "Source unknown";
}

function resolveActionLabel(input: {
  confidence: AdminModerationSecurityAlert["confidence"];
  riskScore: number;
  detectionKind: string;
  knownReason: boolean;
  recommendedAction: string;
}): string {
  if (!input.knownReason || input.confidence === "unknown") {
    return "Check the raw log before acting.";
  }
  if (input.recommendedAction) {
    return input.recommendedAction;
  }
  if (input.confidence === "heuristic") {
    return "Review repeated signals before taking action.";
  }
  if (input.riskScore >= 60) {
    return "Review the account and protected drop.";
  }
  if (input.detectionKind === "file_scrape" || input.detectionKind === "print") {
    return "Confirm the blocked action in the viewer log.";
  }
  return "Monitor for repeats.";
}

function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function resolveContextLabel(input: {
  pagePath: string | null;
  dropId: string | null;
  assetKey: string | null;
}): string {
  const parts = [
    input.pagePath || "Unknown surface",
    input.dropId ? `Drop ${shortId(input.dropId)}` : null,
    input.assetKey ? `Asset ${shortId(input.assetKey)}` : null,
  ].filter(Boolean);
  return parts.join(" • ");
}

export function normalizeAdminModerationSecurityAlert(id: string, value: Record<string, unknown>): AdminModerationSecurityAlert {
  const rawReason = toStringValue(value.reason);
  const descriptor = describeSecurityEvent(rawReason);
  const knownReason = isKnownSecurityEventReason(rawReason);
  const confidence = normalizeConfidence(value.confidence, descriptor.confidence, knownReason);
  const severity = normalizeSeverity(value.severity, descriptor.severity);
  const repeatCount = Math.max(1, toNumber(value.repeatCount) || 1);
  const source = normalizeSource(value.source);
  const serverConfirmed = value.serverConfirmed === true && confidence === "confirmed";
  const sourceVerified = serverConfirmed || value.sourceVerified === true || source === "protected_viewer";
  const pagePath = toNullableString(value.pagePath);
  const dropId = toNullableString(value.dropId);
  const assetKey = toNullableString(value.assetKey);
  const evidence = normalizeModerationEvidence(id, {
    ...value,
    confidence,
    source,
    rawReason,
    eventType: descriptor.detectionKind,
    humanSummary: knownReason ? descriptor.message : toStringValue(value.message) || "Uncataloged moderation signal.",
    falsePositiveRisk: resolveFalsePositiveRisk({ confidence, detectionKind: descriptor.detectionKind, knownReason }),
  });
  const risk = scoreSingleModerationEvidence(evidence);
  const priority = resolvePriority({ riskScore: risk.score, riskTier: risk.tier, confidence, repeatCount });

  return {
    id,
    userId: toStringValue(value.userId),
    username: toStringValue(value.username) || "Unknown user",
    label: knownReason ? descriptor.label : toStringValue(value.label) || "Security event needs review",
    message: knownReason ? descriptor.message : toStringValue(value.message) || "A security log was recorded but its reason is not in the catalog.",
    reason: descriptor.reason,
    severity,
    confidence,
    riskScore: risk.score,
    riskTier: risk.tier,
    riskConfidence: risk.confidence,
    reasonCodes: risk.reasonCodes,
    positiveSignals: risk.positiveSignals,
    negativeSignals: risk.negativeSignals,
    observedSummary: risk.observedSummary,
    recommendedAction: risk.recommendedAction,
    canAutoRestrict: risk.canAutoRestrict,
    accuracyLabel: resolveAccuracyLabel(confidence),
    falsePositiveRisk: resolveFalsePositiveRisk({ confidence, detectionKind: descriptor.detectionKind, knownReason }),
    ...priority,
    actionLabel: resolveActionLabel({ confidence, riskScore: risk.score, detectionKind: descriptor.detectionKind, knownReason, recommendedAction: risk.recommendedAction }),
    contextLabel: resolveContextLabel({ pagePath, dropId, assetKey }),
    source,
    sourceLabel: resolveSourceLabel(source, serverConfirmed),
    sourceVerified,
    serverConfirmed,
    evidenceCount: repeatCount,
    repeatCount,
    detectionKind: descriptor.detectionKind,
    pagePath,
    dropId,
    assetKey,
    timestamp: toNumber(value.timestamp) || toNumber(value.createdAt),
  };
}

export function clusterAdminModerationSecurityAlerts(alerts: AdminModerationSecurityAlert[]): AdminModerationSecurityAlert[] {
  const clustered = new Map<string, AdminModerationSecurityAlert>();
  const sorted = [...alerts].sort((left, right) => left.timestamp - right.timestamp);

  for (const alert of sorted) {
    const bucket = Math.floor((alert.timestamp || Date.now()) / BURST_BUCKET_MS);
    const signature = [
      alert.userId || "unknown-user",
      alert.reason,
      alert.dropId || "no-drop",
      alert.assetKey || "no-asset",
      alert.pagePath || "no-page",
      bucket,
    ].join(":");
    const existing = clustered.get(signature);
    if (!existing) {
      clustered.set(signature, alert);
      continue;
    }

    const repeatCount = (existing.repeatCount || 1) + (alert.repeatCount || 1);
    const mergedScore = Math.min(100, existing.riskScore + Math.max(0, alert.riskScore - 5));
    clustered.set(signature, {
      ...alert,
      repeatCount,
      evidenceCount: repeatCount,
      riskScore: mergedScore,
      riskTier: mergedScore >= 80 ? "critical" : mergedScore >= 60 ? "high" : mergedScore >= 40 ? "review" : mergedScore >= 20 ? "watch" : "low",
      priorityLabel: repeatCount >= 3 && alert.reviewPriority !== "urgent" ? "Needs review" : alert.priorityLabel,
      reviewPriority: repeatCount >= 3 && alert.reviewPriority !== "urgent" ? "elevated" : alert.reviewPriority,
    });
  }

  return Array.from(clustered.values()).sort((left, right) => right.timestamp - left.timestamp);
}
