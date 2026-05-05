export type CreatorLaneParityStatus = "live" | "review" | "stale" | "failed" | "unavailable";
export type CreatorLaneMaterializationFreshnessState = "live" | "stale" | "not_recorded" | "failed";
export type CreatorLaneMismatchSurface =
  | "queue"
  | "role"
  | "agreement"
  | "id"
  | "settings"
  | "history"
  | "experience_records";
export type CreatorLaneMismatchSeverity = "info" | "review" | "critical";

export type CreatorLaneSourceSnapshots = {
  queueEntries: number;
  userProjections: number;
  settingsRecords: number;
  experienceRecords: number;
  historyRecords: number;
};

export type CreatorLaneParityMismatch = {
  creatorId: string;
  surface: CreatorLaneMismatchSurface;
  severity: CreatorLaneMismatchSeverity;
  expected: string;
  actual: string;
  sourceFiles: string[];
  suggestedAction: string;
  validator: string;
  title?: string;
};

export type CreatorLaneDebugParityReport = {
  generatedAt: string;
  generatedAtUtc: string;
  status: CreatorLaneParityStatus;
  overallStatus?: CreatorLaneParityStatus;
  lastMaterializedAtUtc: string | null;
  materializationFreshnessState: CreatorLaneMaterializationFreshnessState;
  sourceSnapshots: CreatorLaneSourceSnapshots;
  issueCount: number;
  historyGapCount: number;
  mismatches: CreatorLaneParityMismatch[];
  nextActions: string[];
  localTruthNote?: string;
};

type CreatorLaneIssueLike = {
  key?: string;
  severity?: string;
  userId?: string;
  creatorId?: string;
  creatorDisplayName?: string;
  message?: string;
  detail?: string;
  recommendedFix?: string;
  mismatches?: Array<{ field?: string; expected?: unknown; actual?: unknown }>;
  missingHistoryEvents?: string[];
  missingEvidenceFields?: string[];
};

const SURFACE_BY_ISSUE_KEY: Record<string, CreatorLaneMismatchSurface> = {
  missing_queue_record: "queue",
  missing_source_onboarding: "queue",
  projection_without_source: "queue",
  queue_parity_mismatch: "queue",
  user_projection_mismatch: "queue",
  role_status_mismatch: "role",
  owner_override_missing_reason: "role",
  legal_signed_without_matching_signatures: "agreement",
  creator_signature_missing_evidence: "agreement",
  admin_signature_missing_evidence: "agreement",
  id_missing_metadata: "id",
  id_verified_missing_metadata: "id",
  creator_settings_missing: "settings",
  creator_restrictions_conflict: "settings",
  sensitive_history_missing: "history",
};

const SOURCE_FILES_BY_SURFACE: Record<CreatorLaneMismatchSurface, string[]> = {
  queue: [
    "src/lib/server/creator-review-queue-materializer.ts",
    "src/lib/server/creator-projection-normalizer.ts",
  ],
  role: [
    "src/lib/server/creator-admin-actions.ts",
    "src/lib/server/creator-onboarding-diagnostics.ts",
  ],
  agreement: [
    "src/lib/server/creator-onboarding.ts",
    "src/lib/server/creator-onboarding-diagnostics.ts",
  ],
  id: [
    "src/lib/server/creator-onboarding.ts",
    "src/lib/server/creator-onboarding-diagnostics.ts",
  ],
  settings: [
    "src/lib/server/creator-projection-normalizer.ts",
    "src/lib/server/creator-onboarding-diagnostics.ts",
  ],
  history: [
    "src/lib/server/creator-onboarding.ts",
    "src/lib/server/creator-onboarding-diagnostics.ts",
  ],
  experience_records: [
    "src/lib/server/creator-onboarding-diagnostics.ts",
  ],
};

export function getCreatorLaneSurfaceForIssue(issueKey: string): CreatorLaneMismatchSurface {
  return SURFACE_BY_ISSUE_KEY[issueKey] ?? "queue";
}

export function getCreatorLaneMaterializationFreshnessState(lastMaterializedAt?: number | null, nowMs = Date.now()) {
  if (!lastMaterializedAt || !Number.isFinite(lastMaterializedAt)) {
    return "not_recorded" as const;
  }

  return nowMs - lastMaterializedAt > 24 * 60 * 60 * 1000 ? "stale" as const : "live" as const;
}

export function getCreatorLaneStatus(input: {
  issueCount: number;
  materializationFreshnessState: CreatorLaneMaterializationFreshnessState;
}): CreatorLaneParityStatus {
  if (input.materializationFreshnessState === "failed") return "failed";
  if (input.materializationFreshnessState === "not_recorded") return "review";
  if (input.materializationFreshnessState === "stale") return "stale";
  return input.issueCount > 0 ? "review" : "live";
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((entry) => String(entry)).join(", ") : "none";
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value).slice(0, 220);
  }
  if (value === undefined || value === null || value === "") {
    return "not recorded";
  }
  return String(value);
}

function getSeverity(value: unknown): CreatorLaneMismatchSeverity {
  if (value === "error" || value === "critical") return "critical";
  if (value === "info") return "info";
  return "review";
}

function getExpectedActual(issue: CreatorLaneIssueLike) {
  if (Array.isArray(issue.mismatches) && issue.mismatches.length > 0) {
    return {
      expected: issue.mismatches.map((entry) => `${entry.field ?? "field"}=${formatValue(entry.expected)}`).join("; "),
      actual: issue.mismatches.map((entry) => `${entry.field ?? "field"}=${formatValue(entry.actual)}`).join("; "),
    };
  }

  if (Array.isArray(issue.missingHistoryEvents) && issue.missingHistoryEvents.length > 0) {
    return {
      expected: `History event(s): ${issue.missingHistoryEvents.join(", ")}`,
      actual: "Missing from creator onboarding history",
    };
  }

  if (Array.isArray(issue.missingEvidenceFields) && issue.missingEvidenceFields.length > 0) {
    return {
      expected: `Evidence field(s): ${issue.missingEvidenceFields.join(", ")}`,
      actual: "Missing from creator source record",
    };
  }

  return {
    expected: issue.detail || issue.message || "Creator lane source evidence should align",
    actual: issue.key || "mismatch requires review",
  };
}

export function toCreatorLaneParityMismatch(issue: CreatorLaneIssueLike): CreatorLaneParityMismatch {
  const surface = getCreatorLaneSurfaceForIssue(issue.key || "");
  const expectedActual = getExpectedActual(issue);

  return {
    creatorId: issue.userId || issue.creatorId || "unknown_creator",
    surface,
    severity: getSeverity(issue.severity),
    expected: expectedActual.expected,
    actual: expectedActual.actual,
    sourceFiles: SOURCE_FILES_BY_SURFACE[surface],
    suggestedAction: issue.recommendedFix || "Open Admin Roster and verify the creator lane source evidence.",
    validator: surface === "queue"
      ? "npm run check:creator-review-queue-materializer"
      : surface === "history"
        ? "npm run check:creator-lane-debug-parity"
        : "npm run check:creator-projection-normalizer",
    title: issue.message || issue.creatorDisplayName || issue.key || "Creator lane mismatch",
  };
}

