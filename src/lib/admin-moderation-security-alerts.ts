import type { AdminModerationSecurityAlert } from "@/lib/admin-moderation";
import {
  describeSecurityEvent,
  isKnownSecurityEventReason,
  type SecurityEventConfidence,
  type SecurityEventSeverity,
} from "@/lib/security-events";

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
  severity: SecurityEventSeverity;
  confidence: AdminModerationSecurityAlert["confidence"];
  repeatCount: number;
}): Pick<AdminModerationSecurityAlert, "reviewPriority" | "priorityLabel"> {
  if (input.severity === "high" && input.confidence === "confirmed") {
    return { reviewPriority: "urgent", priorityLabel: "Review now" };
  }
  if (input.severity === "high" || input.repeatCount >= 3) {
    return { reviewPriority: "elevated", priorityLabel: "Needs review" };
  }
  if (input.severity === "low") {
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
  severity: SecurityEventSeverity;
  detectionKind: string;
  knownReason: boolean;
}): string {
  if (!input.knownReason || input.confidence === "unknown") {
    return "Check the raw log before acting.";
  }
  if (input.confidence === "heuristic") {
    return "Review repeated signals before taking action.";
  }
  if (input.severity === "high") {
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
  const serverConfirmed = value.serverConfirmed === true || source === "protected_viewer";
  const sourceVerified = serverConfirmed || value.sourceVerified === true;
  const pagePath = toNullableString(value.pagePath);
  const dropId = toNullableString(value.dropId);
  const assetKey = toNullableString(value.assetKey);
  const priority = resolvePriority({ severity, confidence, repeatCount });

  return {
    id,
    userId: toStringValue(value.userId),
    username: toStringValue(value.username) || "Unknown user",
    label: knownReason ? descriptor.label : toStringValue(value.label) || "Security event needs review",
    message: knownReason ? descriptor.message : toStringValue(value.message) || "A security log was recorded but its reason is not in the catalog.",
    reason: descriptor.reason,
    severity,
    confidence,
    accuracyLabel: resolveAccuracyLabel(confidence),
    falsePositiveRisk: resolveFalsePositiveRisk({ confidence, detectionKind: descriptor.detectionKind, knownReason }),
    ...priority,
    actionLabel: resolveActionLabel({ confidence, severity, detectionKind: descriptor.detectionKind, knownReason }),
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
    clustered.set(signature, {
      ...alert,
      repeatCount,
      evidenceCount: repeatCount,
      priorityLabel: repeatCount >= 3 && alert.reviewPriority !== "urgent" ? "Needs review" : alert.priorityLabel,
      reviewPriority: repeatCount >= 3 && alert.reviewPriority !== "urgent" ? "elevated" : alert.reviewPriority,
    });
  }

  return Array.from(clustered.values()).sort((left, right) => right.timestamp - left.timestamp);
}
