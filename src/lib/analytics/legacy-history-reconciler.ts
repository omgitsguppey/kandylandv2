import type { IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";

export type LegacyHistoryIdentityConfidence = IdentityConfidence;
export type LegacyHistoryDuplicateRisk = "low" | "medium" | "high" | "unknown";
export type LegacyHistoryRecoveryAction = "normalize_candidate" | "link_candidate" | "archive_only" | "ignore";
export type LegacyHistoryTargetTruthLayer = "product_truth_eligible" | "hot_cache_snapshot" | "legacy_directional_only" | "evidence_only" | "manual_review_required";
export type LegacyHistoryPurgatoryClassification =
  | "exact"
  | "inferred"
  | "weak"
  | "unknown"
  | "duplicate_candidate"
  | "rejected";
export type LegacyHistoryPurgatoryReasonCode =
  | "exact_current_event_match"
  | "inferred_identity_window_match"
  | "weak_identity_or_route_match"
  | "unknown_identity"
  | "external_evidence_only"
  | "legacy_directional_source"
  | "duplicate_risk"
  | "missing_first_party_corroboration"
  | "current_totals_blocked";
export type LegacyHistorySuggestedRecoveryAction =
  | "link_as_evidence_only"
  | "manual_review_identity_bridge"
  | "archive_as_debug_evidence"
  | "require_first_party_fact_or_ledger"
  | "reject_from_current_totals";

export type LegacyHistoryCandidate = {
  legacySource: string;
  legacyId: string;
  eventId?: string | null;
  mappedEventName?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  guestId?: string | null;
  anonymousVisitorId?: string | null;
  identityLinkId?: string | null;
  route?: string | null;
  source?: string | null;
  occurredAtMs?: number | null;
  canonicalEvent?: {
    eventId?: string | null;
    sessionId?: string | null;
    userId?: string | null;
    anonymousVisitorId?: string | null;
    identityLinkId?: string | null;
    route?: string | null;
    source?: string | null;
    occurredAt?: string | null;
  } | null;
};

export type LegacyHistoryCurrentEvent = {
  eventId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  guestId?: string | null;
  anonymousVisitorId?: string | null;
  identityLinkId?: string | null;
  route?: string | null;
  occurredAtMs?: number | null;
};

export type LegacyHistoryIdentityLink = {
  identityLinkId?: string | null;
  guestId?: string | null;
  anonymousVisitorId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  linkedAtMs?: number | null;
};

export type LegacyHistoryCurrentTruth = {
  events: LegacyHistoryCurrentEvent[];
  identityLinks: LegacyHistoryIdentityLink[];
};

export type LegacyHistoryCandidateMapping = {
  legacySource: string;
  legacyId: string;
  targetTruthLayer: LegacyHistoryTargetTruthLayer;
  identityConfidence: LegacyHistoryIdentityConfidence;
  duplicateRisk: LegacyHistoryDuplicateRisk;
  purgatoryClassification: LegacyHistoryPurgatoryClassification;
  reasonCodes: LegacyHistoryPurgatoryReasonCode[];
  suggestedRecoveryAction: LegacyHistorySuggestedRecoveryAction;
  recoveryAction: LegacyHistoryRecoveryAction;
  currentTotalsEligible: boolean;
  overwriteCurrentTruth: false;
  reason: string;
};

export type LegacyHistoryPurgatoryQueueItem = Pick<
  LegacyHistoryCandidateMapping,
  | "legacySource"
  | "legacyId"
  | "targetTruthLayer"
  | "identityConfidence"
  | "duplicateRisk"
  | "purgatoryClassification"
  | "reasonCodes"
  | "suggestedRecoveryAction"
  | "currentTotalsEligible"
  | "reason"
> & {
  manualReviewRequired: boolean;
};

export type LegacyHistoryPurgatorySummary = {
  exactMatch: number;
  probableMatch: number;
  weakMatch: number;
  unknown: number;
  duplicateCandidate: number;
  rejected: number;
  productTruthEligible: number;
  manualReviewRequired: number;
};

export type LegacyHistoryPurgatoryQueueReport = {
  reportKey: "analytics-legacy-purgatory-queue";
  generatedAtUtc: string;
  currentHead: string;
  sourceReportKey: "analytics-legacy-history-reconciliation";
  summary: LegacyHistoryPurgatorySummary;
  queue: LegacyHistoryPurgatoryQueueItem[];
  productTruthPolicy: {
    legacyCannotOverwriteCurrentTruth: true;
    weakMatchesRemainEvidenceOnly: true;
    unknownLegacyIsNotZero: true;
    duplicateCandidatesRequireFirstPartyDeduping: true;
  };
};

export type LegacyHistoryReconciliationResult = {
  candidateMappings: LegacyHistoryCandidateMapping[];
  summary: {
    candidateCount: number;
    exactMatchCount: number;
    probableMatchCount: number;
    weakMatchCount: number;
    unknownLegacyCount: number;
    purgatoryQueueCount: number;
    highDuplicateRiskCount: number;
    currentTotalsEligibleCount: number;
    overwritesCurrentTruth: false;
  };
};

export type LegacyHistoryReconciliationReport = LegacyHistoryReconciliationResult & {
  generatedAtUtc: string;
  reportKey: "analytics-legacy-history-reconciliation";
  currentHead: string;
  sourceCleanupFindings: Array<{
    source: string;
    status: LegacyHistoryTargetTruthLayer;
    action: string;
  }>;
  costFindings: Array<{
    lane: "cloud_run" | "cloud_sql" | "bigquery" | "gemini_cloud_assist" | "route_4xx";
    status: string;
    action: string;
  }>;
  nextFixOrder: string[];
};

const PROBABLE_WINDOW_MS = 5 * 60 * 1000;
const WEAK_WINDOW_MS = 60 * 60 * 1000;

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function readTimeMs(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function candidateEventId(candidate: LegacyHistoryCandidate) {
  return readString(candidate.eventId) || readString(candidate.canonicalEvent?.eventId);
}

function candidateSessionId(candidate: LegacyHistoryCandidate) {
  return readString(candidate.sessionId) || readString(candidate.canonicalEvent?.sessionId);
}

function candidateUserId(candidate: LegacyHistoryCandidate) {
  return readString(candidate.userId) || readString(candidate.canonicalEvent?.userId);
}

function candidateGuestId(candidate: LegacyHistoryCandidate) {
  return readString(candidate.guestId) || readString(candidate.anonymousVisitorId) || readString(candidate.canonicalEvent?.anonymousVisitorId);
}

function candidateRoute(candidate: LegacyHistoryCandidate) {
  return readString(candidate.route) || readString(candidate.canonicalEvent?.route);
}

function candidateSource(candidate: LegacyHistoryCandidate) {
  return `${readString(candidate.legacySource)} ${readString(candidate.source)} ${readString(candidate.canonicalEvent?.source)}`.toLowerCase();
}

function candidateTimeMs(candidate: LegacyHistoryCandidate) {
  return readTimeMs(candidate.occurredAtMs) || readTimeMs(candidate.canonicalEvent?.occurredAt);
}

function sameWhenPresent(left: string, right: string) {
  return !left || !right || left === right;
}

function withinWindow(left: number, right: number, windowMs: number) {
  return left > 0 && right > 0 && Math.abs(left - right) <= windowMs;
}

function isExternalEvidence(candidate: LegacyHistoryCandidate) {
  const source = candidateSource(candidate);
  return source.includes("ga4") || source.includes("bigquery") || source.includes("posthog");
}

function isRealtimeSummary(candidate: LegacyHistoryCandidate) {
  return /realtime_summary|analytics_aggregate_stats/u.test(candidateSource(candidate));
}

function hasAnyIdentity(candidate: LegacyHistoryCandidate) {
  return Boolean(candidateUserId(candidate) || candidateGuestId(candidate) || candidateSessionId(candidate));
}

function targetTruthLayer(candidate: LegacyHistoryCandidate): LegacyHistoryTargetTruthLayer {
  if (isExternalEvidence(candidate)) return "evidence_only";
  if (candidate.legacySource === "analytics_admin_metric_snapshots") return "hot_cache_snapshot";
  if (isRealtimeSummary(candidate)) return "legacy_directional_only";
  if (hasAnyIdentity(candidate)) return "product_truth_eligible";
  return "manual_review_required";
}

function matchesExact(candidate: LegacyHistoryCandidate, event: LegacyHistoryCurrentEvent) {
  const eventId = candidateEventId(candidate);
  if (!eventId || eventId !== readString(event.eventId)) return false;

  return sameWhenPresent(candidateSessionId(candidate), readString(event.sessionId))
    && sameWhenPresent(candidateUserId(candidate), readString(event.userId))
    && sameWhenPresent(candidateGuestId(candidate), readString(event.guestId) || readString(event.anonymousVisitorId));
}

function hasIdentityLinkProximity(candidate: LegacyHistoryCandidate, currentTruth: LegacyHistoryCurrentTruth) {
  const userId = candidateUserId(candidate);
  const guestId = candidateGuestId(candidate);
  const sessionId = candidateSessionId(candidate);
  const occurredAtMs = candidateTimeMs(candidate);
  if (!userId || (!guestId && !sessionId)) return false;

  return currentTruth.identityLinks.some((link) => {
    const linkUser = readString(link.userId);
    const linkGuest = readString(link.guestId) || readString(link.anonymousVisitorId);
    const linkSession = readString(link.sessionId);
    const identityMatches = linkUser === userId
      && (Boolean(guestId && linkGuest === guestId) || Boolean(sessionId && linkSession === sessionId));
    if (!identityMatches) return false;
    const linkedAtMs = readTimeMs(link.linkedAtMs);
    return linkedAtMs === 0 || occurredAtMs === 0 || withinWindow(occurredAtMs, linkedAtMs, PROBABLE_WINDOW_MS);
  });
}

function matchesProbable(candidate: LegacyHistoryCandidate, event: LegacyHistoryCurrentEvent, currentTruth: LegacyHistoryCurrentTruth) {
  const sessionMatches = Boolean(candidateSessionId(candidate) && candidateSessionId(candidate) === readString(event.sessionId));
  const routeMatches = Boolean(candidateRoute(candidate) && candidateRoute(candidate) === readString(event.route));
  const timeMatches = withinWindow(candidateTimeMs(candidate), readTimeMs(event.occurredAtMs), PROBABLE_WINDOW_MS);
  const identityLinkMatches = hasIdentityLinkProximity(candidate, currentTruth);
  return routeMatches && timeMatches && (sessionMatches || identityLinkMatches);
}

function matchesWeak(candidate: LegacyHistoryCandidate, event: LegacyHistoryCurrentEvent) {
  const routeMatches = Boolean(candidateRoute(candidate) && candidateRoute(candidate) === readString(event.route));
  const timeMatches = withinWindow(candidateTimeMs(candidate), readTimeMs(event.occurredAtMs), WEAK_WINDOW_MS);
  const partialIdentityMatches = Boolean(
    candidateSessionId(candidate) && candidateSessionId(candidate) === readString(event.sessionId)
    || candidateUserId(candidate) && candidateUserId(candidate) === readString(event.userId)
    || candidateGuestId(candidate) && candidateGuestId(candidate) === (readString(event.guestId) || readString(event.anonymousVisitorId)),
  );
  return (routeMatches && timeMatches) || partialIdentityMatches;
}

function identityConfidence(candidate: LegacyHistoryCandidate, currentTruth: LegacyHistoryCurrentTruth): LegacyHistoryIdentityConfidence {
  if (currentTruth.events.some((event) => matchesExact(candidate, event))) return "exact";
  if (currentTruth.events.some((event) => matchesProbable(candidate, event, currentTruth))) return "inferred";
  if (currentTruth.events.some((event) => matchesWeak(candidate, event))) return "weak";
  if (hasAnyIdentity(candidate) && !isExternalEvidence(candidate)) return "weak";
  if (isExternalEvidence(candidate) && hasAnyIdentity(candidate)) return "weak";
  return "unknown";
}

function duplicateRisk(candidate: LegacyHistoryCandidate, confidence: LegacyHistoryIdentityConfidence): LegacyHistoryDuplicateRisk {
  if (candidate.legacySource === "analytics_guest_batches" && candidateUserId(candidate) && candidateGuestId(candidate)) {
    return "high";
  }
  if (confidence === "exact" || confidence === "inferred") return "medium";
  if (confidence === "weak") return "low";
  return "unknown";
}

function recoveryAction(layer: LegacyHistoryTargetTruthLayer, confidence: LegacyHistoryIdentityConfidence, risk: LegacyHistoryDuplicateRisk): LegacyHistoryRecoveryAction {
  if (layer === "evidence_only" || layer === "legacy_directional_only" || layer === "manual_review_required") return "archive_only";
  if (confidence === "exact" || risk === "high" || risk === "medium") return "link_candidate";
  if (confidence === "inferred" || confidence === "weak") return "normalize_candidate";
  return "archive_only";
}

function purgatoryClassification(input: {
  layer: LegacyHistoryTargetTruthLayer;
  confidence: LegacyHistoryIdentityConfidence;
  risk: LegacyHistoryDuplicateRisk;
}): LegacyHistoryPurgatoryClassification {
  if (input.risk === "high") return "duplicate_candidate";
  if (input.confidence === "exact") return "exact";
  if (input.confidence === "inferred" || input.confidence === "linked") return "inferred";
  if (input.confidence === "weak") return "weak";
  if (input.layer === "evidence_only" || input.layer === "legacy_directional_only" || input.layer === "manual_review_required" || input.confidence === "unknown") return "unknown";
  return "rejected";
}

function reasonCodesFor(input: {
  layer: LegacyHistoryTargetTruthLayer;
  confidence: LegacyHistoryIdentityConfidence;
  risk: LegacyHistoryDuplicateRisk;
  currentTotalsEligible: boolean;
}): LegacyHistoryPurgatoryReasonCode[] {
  const codes = new Set<LegacyHistoryPurgatoryReasonCode>();
  if (input.confidence === "exact") codes.add("exact_current_event_match");
  if (input.confidence === "inferred" || input.confidence === "linked") codes.add("inferred_identity_window_match");
  if (input.confidence === "weak") codes.add("weak_identity_or_route_match");
  if (input.confidence === "unknown") codes.add("unknown_identity");
  if (input.layer === "evidence_only") codes.add("external_evidence_only");
  if (input.layer === "legacy_directional_only") codes.add("legacy_directional_source");
  if (input.risk === "high" || input.risk === "medium") codes.add("duplicate_risk");
  if (input.layer === "product_truth_eligible" && input.confidence !== "exact") codes.add("missing_first_party_corroboration");
  if (!input.currentTotalsEligible) codes.add("current_totals_blocked");
  return Array.from(codes);
}

function suggestedRecoveryActionFor(input: {
  layer: LegacyHistoryTargetTruthLayer;
  confidence: LegacyHistoryIdentityConfidence;
  risk: LegacyHistoryDuplicateRisk;
}): LegacyHistorySuggestedRecoveryAction {
  if (input.risk === "high") return "require_first_party_fact_or_ledger";
  if (input.layer === "evidence_only") return "require_first_party_fact_or_ledger";
  if (input.layer === "legacy_directional_only" || input.layer === "manual_review_required") return "archive_as_debug_evidence";
  if (input.confidence === "exact") return "link_as_evidence_only";
  if (input.confidence === "inferred" || input.confidence === "linked" || input.confidence === "weak") return "manual_review_identity_bridge";
  return "reject_from_current_totals";
}

function reasonFor(input: {
  layer: LegacyHistoryTargetTruthLayer;
  confidence: LegacyHistoryIdentityConfidence;
  risk: LegacyHistoryDuplicateRisk;
}) {
  if (input.layer === "evidence_only") return "External evidence stays evidence-only until first-party reconciliation proves it.";
  if (input.layer === "legacy_directional_only") return "Realtime or raw legacy evidence stays directional and cannot drive current totals.";
  if (input.layer === "manual_review_required") return "No reliable identity evidence exists; keep it in manual review and do not treat it as zero.";
  if (input.risk === "high") return "Linked guest and user lineage can double-count if imported, so keep it as link evidence.";
  if (input.confidence === "exact") return "Existing current event identity matches; link without overwriting current truth.";
  if (input.confidence === "inferred" || input.confidence === "linked") return "Session, route, identity link, and time proximity are close enough for owner review.";
  if (input.confidence === "weak") return "Partial route, time, or identity evidence is too weak for current totals.";
  return "No reliable identity evidence exists; archive for Debug review only.";
}

export function reconcileLegacyHistoryCandidates(input: {
  candidates: LegacyHistoryCandidate[];
  currentTruth: LegacyHistoryCurrentTruth;
}): LegacyHistoryReconciliationResult {
  const candidateMappings = input.candidates.map((candidate): LegacyHistoryCandidateMapping => {
    const layer = targetTruthLayer(candidate);
    const confidence = identityConfidence(candidate, input.currentTruth);
    const risk = duplicateRisk(candidate, confidence);
    const action = recoveryAction(layer, confidence, risk);
    const currentTotalsEligible = false;
    const classification = purgatoryClassification({ layer, confidence, risk });

    return {
      legacySource: candidate.legacySource,
      legacyId: candidate.legacyId,
      targetTruthLayer: layer,
      identityConfidence: confidence,
      duplicateRisk: risk,
      purgatoryClassification: classification,
      reasonCodes: reasonCodesFor({ layer, confidence, risk, currentTotalsEligible }),
      suggestedRecoveryAction: suggestedRecoveryActionFor({ layer, confidence, risk }),
      recoveryAction: action,
      currentTotalsEligible,
      overwriteCurrentTruth: false,
      reason: reasonFor({ layer, confidence, risk }),
    };
  });

  return {
    candidateMappings,
    summary: {
      candidateCount: candidateMappings.length,
      exactMatchCount: candidateMappings.filter((entry) => entry.identityConfidence === "exact").length,
      probableMatchCount: candidateMappings.filter((entry) => entry.identityConfidence === "inferred" || entry.identityConfidence === "linked").length,
      weakMatchCount: candidateMappings.filter((entry) => entry.identityConfidence === "weak").length,
      unknownLegacyCount: candidateMappings.filter((entry) => entry.identityConfidence === "unknown").length,
      purgatoryQueueCount: candidateMappings.filter((entry) => !entry.currentTotalsEligible).length,
      highDuplicateRiskCount: candidateMappings.filter((entry) => entry.duplicateRisk === "high").length,
      currentTotalsEligibleCount: candidateMappings.filter((entry) => entry.currentTotalsEligible).length,
      overwritesCurrentTruth: false,
    },
  };
}

export function buildLegacyHistoryPurgatoryQueueReport(input: {
  currentHead: string;
  generatedAtUtc: string;
  reconciliation: LegacyHistoryReconciliationResult;
}): LegacyHistoryPurgatoryQueueReport {
  const queue: LegacyHistoryPurgatoryQueueItem[] = input.reconciliation.candidateMappings
    .filter((entry) => !entry.currentTotalsEligible)
    .map((entry) => ({
      legacySource: entry.legacySource,
      legacyId: entry.legacyId,
      targetTruthLayer: entry.targetTruthLayer,
      identityConfidence: entry.identityConfidence,
      duplicateRisk: entry.duplicateRisk,
      purgatoryClassification: entry.purgatoryClassification,
      reasonCodes: entry.reasonCodes,
      suggestedRecoveryAction: entry.suggestedRecoveryAction,
      currentTotalsEligible: entry.currentTotalsEligible,
      reason: entry.reason,
      manualReviewRequired: entry.purgatoryClassification !== "rejected",
    }));

  return {
    reportKey: "analytics-legacy-purgatory-queue",
    generatedAtUtc: input.generatedAtUtc,
    currentHead: input.currentHead,
    sourceReportKey: "analytics-legacy-history-reconciliation",
    summary: {
      exactMatch: queue.filter((entry) => entry.purgatoryClassification === "exact").length,
      probableMatch: queue.filter((entry) => entry.purgatoryClassification === "inferred").length,
      weakMatch: queue.filter((entry) => entry.purgatoryClassification === "weak").length,
      unknown: queue.filter((entry) => entry.purgatoryClassification === "unknown").length,
      duplicateCandidate: queue.filter((entry) => entry.purgatoryClassification === "duplicate_candidate").length,
      rejected: queue.filter((entry) => entry.purgatoryClassification === "rejected").length,
      productTruthEligible: queue.filter((entry) => entry.currentTotalsEligible).length,
      manualReviewRequired: queue.filter((entry) => entry.manualReviewRequired).length,
    },
    queue,
    productTruthPolicy: {
      legacyCannotOverwriteCurrentTruth: true,
      weakMatchesRemainEvidenceOnly: true,
      unknownLegacyIsNotZero: true,
      duplicateCandidatesRequireFirstPartyDeduping: true,
    },
  };
}

export function buildLegacyHistoryReconciliationReport(input: {
  currentHead: string;
  generatedAtUtc: string;
  candidates: LegacyHistoryCandidate[];
  currentTruth: LegacyHistoryCurrentTruth;
}): LegacyHistoryReconciliationReport {
  const result = reconcileLegacyHistoryCandidates(input);
  return {
    ...result,
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "analytics-legacy-history-reconciliation",
    currentHead: input.currentHead,
    sourceCleanupFindings: [
      {
        source: "analytics_event_facts",
        status: "product_truth_eligible",
        action: "Current first-party event facts remain the current truth lane.",
      },
      {
        source: "analytics_admin_metric_snapshots",
        status: "hot_cache_snapshot",
        action: "Admin Analytics should prefer verified materialized snapshots over raw realtime logs.",
      },
      {
        source: "analytics_aggregate_stats/realtime_summary",
        status: "legacy_directional_only",
        action: "Legacy realtime summary stays fallback/live-pulse evidence and cannot drive current totals.",
      },
      {
        source: "GA4 / BigQuery / PostHog",
        status: "evidence_only",
        action: "External analytics sources remain evidence-only until reconciled against first-party facts.",
      },
    ],
    costFindings: [
      {
        lane: "cloud_run",
        status: "dry_run_artifact_only",
        action: "Reconciliation consumes checked-in artifacts and does not run a request-path backfill.",
      },
      {
        lane: "cloud_sql",
        status: "cloud_sql_not_used_by_reconciler",
        action: "No SQL or Data Connect calls are used for legacy history recovery.",
      },
      {
        lane: "bigquery",
        status: "bigquery_not_queried_by_reconciler",
        action: "BigQuery remains evidence-only; this pass runs no warehouse jobs.",
      },
      {
        lane: "gemini_cloud_assist",
        status: "gemini_cloud_assist_not_used",
        action: "No AI identity matching or model calls are used.",
      },
      {
        lane: "route_4xx",
        status: "no_user_facing_route_added",
        action: "This source-only pass adds no user-facing route and no retry path.",
      },
    ],
    nextFixOrder: [
      "Review exact and probable link candidates before any future write-mode migration proposal.",
      "Keep weak and unknown legacy rows in Debug/archive-only evidence until identity improves.",
      "Retire realtime/raw-log display authority module by module after verified snapshot parity.",
    ],
  };
}

export function validateLegacyHistoryReconciliationReport(
  report: LegacyHistoryReconciliationReport,
  options: { reconcilerSource: string; currentHead?: string },
) {
  const failures: string[] = [];

  if (report.reportKey !== "analytics-legacy-history-reconciliation") {
    failures.push("reportKey must be analytics-legacy-history-reconciliation.");
  }
  if (options.currentHead && report.currentHead !== options.currentHead) {
    failures.push("currentHead mismatch.");
  }
  if (report.candidateMappings.some((mapping) => !mapping.identityConfidence)) {
    failures.push("legacy source marked current without confidence.");
  }
  if (report.candidateMappings.some((mapping) => !mapping.duplicateRisk)) {
    failures.push("duplicate risk missing.");
  }
  if (report.candidateMappings.some((mapping) => !mapping.purgatoryClassification)) {
    failures.push("purgatory classification missing.");
  }
  if (report.candidateMappings.some((mapping) => mapping.reasonCodes.length === 0)) {
    failures.push("purgatory reason codes missing.");
  }
  if (report.candidateMappings.some((mapping) => !mapping.suggestedRecoveryAction)) {
    failures.push("suggested recovery action missing.");
  }
  if (report.candidateMappings.some((mapping) => mapping.identityConfidence === "unknown" && mapping.currentTotalsEligible)) {
    failures.push("unknown legacy counted as clean.");
  }
  if (report.candidateMappings.some((mapping) => mapping.purgatoryClassification === "weak" && mapping.currentTotalsEligible)) {
    failures.push("weak legacy match promoted to current totals.");
  }
  if (report.candidateMappings.some((mapping) => mapping.purgatoryClassification === "unknown" && !mapping.reasonCodes.includes("current_totals_blocked"))) {
    failures.push("unknown legacy row lacks current totals block reason.");
  }
  if (!report.sourceCleanupFindings.some((finding) => finding.source === "analytics_aggregate_stats/realtime_summary" && finding.status === "legacy_directional_only")) {
    failures.push("old realtime/raw-log source still marked product truth.");
  }
  if (!report.sourceCleanupFindings.some((finding) => finding.source.includes("GA4") && finding.status === "evidence_only")) {
    failures.push("external evidence layers are not separated.");
  }
  for (const lane of ["cloud_run", "cloud_sql", "bigquery", "gemini_cloud_assist"] as const) {
    if (!report.costFindings.some((finding) => finding.lane === lane)) {
      failures.push(`${lane} cost status lane is missing.`);
    }
  }
  if (report.nextFixOrder.length === 0) {
    failures.push("no next action.");
  }
  const blockedRuntimePattern = new RegExp([
    "admin" + "Db",
    "firebase" + "-admin",
    "collection" + "\\s*\\(",
    "write" + "Batch",
    "fet" + "ch\\s*\\(",
  ].join("|"), "u");
  if (blockedRuntimePattern.test(options.reconcilerSource)) {
    failures.push("reconciler must stay dry-run/local and must not contain production read/write calls.");
  }

  return failures;
}
