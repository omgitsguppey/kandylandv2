export const DEBUG_EVIDENCE_BUCKETS = {
  evidence: "debug_evidence",
  rollups: "debug_evidence_rollups",
  runtimeWarnings: "runtime_warning_records",
} as const;

export type DebugEvidenceSource =
  | "client"
  | "server"
  | "admin"
  | "route"
  | "support"
  | "telemetry"
  | "audit"
  | "self_healing";

export type DebugEvidenceSeverity = "info" | "warn" | "error" | "critical";

export type DebugEvidenceCategory =
  | "layout"
  | "hydration"
  | "chat"
  | "drops"
  | "wallet"
  | "support"
  | "permissions"
  | "auth"
  | "telemetry"
  | "content_protection"
  | "performance"
  | "runtime"
  | "network"
  | "firestore_rules"
  | "api_route";

export type DebugEvidenceStatus =
  | "new"
  | "seen"
  | "linked_to_report"
  | "triaged"
  | "resolved"
  | "ignored";

export type DebugEvidenceRecord = {
  id: string;
  createdAt: number;
  source: DebugEvidenceSource;
  severity: DebugEvidenceSeverity;
  category: DebugEvidenceCategory;
  route?: string;
  component?: string;
  userId?: string | null;
  sessionId?: string | null;
  anonymousVisitorId?: string | null;
  entityType?: string;
  entityId?: string;
  message: string;
  humanMessage: string;
  technicalDetail?: Record<string, unknown>;
  fingerprint: string;
  status: DebugEvidenceStatus;
  linkedReportId?: string | null;
  linkedSupportThreadId?: string | null;
  firstSeenAt: number;
  lastSeenAt: number;
  occurrenceCount: number;
};

export type DebugEvidenceInput = {
  source: DebugEvidenceSource;
  severity: DebugEvidenceSeverity;
  category: DebugEvidenceCategory;
  message: string;
  humanMessage: string;
  route?: string | null;
  component?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  anonymousVisitorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  technicalDetail?: Record<string, unknown>;
  fingerprint?: string | null;
  linkedReportId?: string | null;
  linkedSupportThreadId?: string | null;
  status?: DebugEvidenceStatus;
  createdAt?: number;
};

export type DebugEvidenceAuditSummary = {
  id: string;
  fingerprint: string;
  source: DebugEvidenceSource;
  severity: DebugEvidenceSeverity;
  category: DebugEvidenceCategory;
  route?: string;
  component?: string;
  message: string;
  humanMessage: string;
  occurrenceCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
  linkedSupportThreadId?: string | null;
};

export type DebugEvidenceIndexArtifact = {
  generatedAt: string;
  source: "firestore" | "local" | "unavailable";
  buckets: typeof DEBUG_EVIDENCE_BUCKETS;
  records: DebugEvidenceAuditSummary[];
  redacted: true;
  notes: string[];
};

const SEVERITY_RANK: Record<DebugEvidenceSeverity, number> = {
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

const SENSITIVE_DETAIL_KEYS = [
  "body",
  "messageBody",
  "rawBody",
  "password",
  "token",
  "authorization",
  "email",
  "userEmail",
  "phone",
  "address",
  "contentUrl",
  "contentUrls",
  "internalUrl",
  "internalUrls",
];

function clampString(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u0000-\u001f\u007f]+/g, "")
    .trim()
    .slice(0, maxLength);
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function isSensitiveDetailKey(key: string) {
  const normalized = key.toLowerCase();
  return SENSITIVE_DETAIL_KEYS.some((needle) => normalized.includes(needle.toLowerCase()));
}

export function sanitizeDebugTechnicalDetail(detail: Record<string, unknown> | undefined) {
  if (!detail) {
    return {};
  }

  const entries: Array<[string, string | number | boolean | null]> = [];
  for (const [key, value] of Object.entries(detail).slice(0, 20)) {
    const normalizedKey = clampString(key, 80);
    if (!normalizedKey) {
      continue;
    }
    if (isSensitiveDetailKey(normalizedKey)) {
      entries.push([normalizedKey, "[redacted]"]);
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean" || value === null) {
      entries.push([normalizedKey, value]);
      continue;
    }
    if (typeof value === "string") {
      entries.push([normalizedKey, clampString(value, 500)]);
      continue;
    }
    try {
      entries.push([normalizedKey, clampString(JSON.stringify(value), 500)]);
    } catch {
      entries.push([normalizedKey, clampString(value, 500)]);
    }
  }
  return Object.fromEntries(entries);
}

export function buildDebugEvidenceFingerprint(input: Pick<DebugEvidenceInput, "source" | "category" | "route" | "component" | "entityType" | "entityId" | "message">) {
  const signature = [
    input.source,
    input.category,
    input.route ?? "",
    input.component ?? "",
    input.entityType ?? "",
    input.entityId ?? "",
    clampString(input.message, 160).toLowerCase(),
  ].join("|");
  return `dbg_${stableHash(signature)}`;
}

export function buildDebugEvidenceRecord(
  input: DebugEvidenceInput,
  existing?: Partial<DebugEvidenceRecord> | null,
): DebugEvidenceRecord {
  const now = input.createdAt && Number.isFinite(input.createdAt) ? Math.trunc(input.createdAt) : Date.now();
  const fingerprint = input.fingerprint?.trim() || buildDebugEvidenceFingerprint(input);
  const occurrenceCount = Math.max(0, Number(existing?.occurrenceCount) || 0) + 1;
  const firstSeenAt = Number(existing?.firstSeenAt) > 0 ? Number(existing?.firstSeenAt) : now;

  return {
    id: existing?.id || `${fingerprint}_${now}`,
    createdAt: now,
    source: input.source,
    severity: input.severity,
    category: input.category,
    route: input.route ? clampString(input.route, 240) : undefined,
    component: input.component ? clampString(input.component, 160) : undefined,
    userId: input.userId ?? null,
    sessionId: input.sessionId ?? null,
    anonymousVisitorId: input.anonymousVisitorId ?? null,
    entityType: input.entityType ? clampString(input.entityType, 80) : undefined,
    entityId: input.entityId ? clampString(input.entityId, 160) : undefined,
    message: clampString(input.message, 240) || "Debug evidence recorded",
    humanMessage: clampString(input.humanMessage, 280) || "Runtime diagnostic evidence was recorded.",
    technicalDetail: sanitizeDebugTechnicalDetail(input.technicalDetail),
    fingerprint,
    status: input.status ?? (existing?.status as DebugEvidenceStatus | undefined) ?? "new",
    linkedReportId: input.linkedReportId ?? existing?.linkedReportId ?? null,
    linkedSupportThreadId: input.linkedSupportThreadId ?? existing?.linkedSupportThreadId ?? null,
    firstSeenAt,
    lastSeenAt: now,
    occurrenceCount,
  };
}

export function mapDebugCategoryToAuditDomains(category: DebugEvidenceCategory) {
  switch (category) {
    case "layout":
    case "chat":
    case "performance":
      return ["layout", "hydration"];
    case "wallet":
      return ["economy"];
    case "telemetry":
      return ["telemetry"];
    case "content_protection":
    case "drops":
      return ["contentProtection"];
    case "support":
    case "permissions":
    case "auth":
    case "api_route":
    case "firestore_rules":
      return ["support", "telemetry"];
    case "hydration":
    case "runtime":
    case "network":
      return ["hydration", "telemetry"];
    default:
      return ["telemetry"];
  }
}

export function redactDebugEvidenceForAudit(record: DebugEvidenceRecord | DebugEvidenceAuditSummary): DebugEvidenceAuditSummary {
  return {
    id: record.id,
    fingerprint: record.fingerprint,
    source: record.source,
    severity: record.severity,
    category: record.category,
    route: record.route,
    component: record.component,
    message: record.message,
    humanMessage: record.humanMessage,
    occurrenceCount: Math.max(1, Number(record.occurrenceCount) || 1),
    firstSeenAt: Number(record.firstSeenAt) || Number(record.lastSeenAt) || Date.now(),
    lastSeenAt: Number(record.lastSeenAt) || Date.now(),
    linkedSupportThreadId: record.linkedSupportThreadId ?? null,
  };
}

export function rankDebugEvidenceForAudit(left: DebugEvidenceAuditSummary, right: DebugEvidenceAuditSummary) {
  return (SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity])
    || ((right.occurrenceCount || 0) - (left.occurrenceCount || 0))
    || ((right.lastSeenAt || 0) - (left.lastSeenAt || 0));
}
