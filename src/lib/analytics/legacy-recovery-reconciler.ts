export type LegacyIdentityConfidence = "exact_match" | "probable_match" | "weak_match" | "unknown";
export type LegacyDuplicateRisk = "none" | "low" | "medium" | "high" | "unknown";
export type LegacyRecoveryAction = "import_candidate" | "link_candidate" | "archive_only" | "ignore";
export type LegacyTargetTruthLayer = "product_truth" | "verified_hot_cache" | "debug_truth" | "evidence_only";

export type LegacyRecoveryCandidateInput = {
  legacySource: string;
  legacyId: string;
  legacyTimestamp?: string | null;
  mappedEventName?: string | null;
  mappingConfidence?: string | null;
  actorConfidence?: string | null;
  objectConfidence?: string | null;
  serverConfirmed?: boolean;
  duplicateKey?: string | null;
  canonicalEvent?: {
    eventId?: string | null;
    eventName?: string | null;
    userId?: string | null;
    sessionId?: string | null;
    anonymousVisitorId?: string | null;
    source?: string | null;
    dedupeKey?: string | null;
    objectId?: string | null;
    legacySource?: string | null;
    legacyId?: string | null;
  } | null;
};

export type LegacyCurrentTruthInput = {
  eventIds?: string[];
  dedupeKeys?: string[];
  identityLinks?: Array<{
    guestId?: string | null;
    userId?: string | null;
    sessionId?: string | null;
    identityLinkId?: string | null;
  }>;
};

export type LegacyRecoveryCandidateMapping = {
  legacySource: string;
  legacyId: string;
  targetTruthLayer: LegacyTargetTruthLayer;
  identityConfidence: LegacyIdentityConfidence;
  duplicateRisk: LegacyDuplicateRisk;
  recoveryAction: LegacyRecoveryAction;
  recoveryMode: "dry_run_manual_review";
  productionMutationAllowed: false;
  reason: string;
  overwriteCurrentTruth: false;
  currentProductTruthSource: string;
};

export type LegacyRecoveryReconciliationResult = {
  candidateMappings: LegacyRecoveryCandidateMapping[];
  summary: {
    candidateCount: number;
    exactMatchCount: number;
    duplicateRiskHighCount: number;
    evidenceOnlyCount: number;
    overwritesCurrentTruth: false;
  };
};

export type LegacyRecoveryReconciliationReport = {
  generatedAtUtc: string;
  reportKey: "analytics-legacy-recovery-reconciliation";
  currentHead: string;
  summary: LegacyRecoveryReconciliationResult["summary"] & {
    productTruthSources: number;
    legacySourcesReconciled: number;
    cloudRunCostFindings: number;
    cloudSqlStatus: string;
    geminiCloudAssistStatus: string;
    route4xxFindings: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  candidateMappings: LegacyRecoveryCandidateMapping[];
  sourceTruthMap: Array<{
    source: string;
    truthLayer: LegacyTargetTruthLayer;
    currentProductTruth: boolean;
    notes: string;
  }>;
  costFindings: Array<{
    id: string;
    lane: "cloud_run" | "cloud_sql" | "gemini_cloud_assist" | "route_4xx";
    severity: "p0" | "p1" | "p2";
    status: string;
    action: string;
  }>;
  productTruthPolicy: {
    dryRunOnly: true;
    productionMutationAllowed: false;
    recoveredEventsCanOverwriteCurrentTruth: false;
    externalEvidenceCanPromoteProductTruth: false;
    importCandidatesRequireSeparateApproval: true;
  };
  nextFixOrder: string[];
};

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function isExternalEvidenceSource(source: string) {
  const normalized = source.toLowerCase();
  return normalized.includes("ga4") || normalized.includes("bigquery") || normalized.includes("posthog");
}

function resolveTargetTruthLayer(candidate: LegacyRecoveryCandidateInput): LegacyTargetTruthLayer {
  if (isExternalEvidenceSource(candidate.legacySource) || isExternalEvidenceSource(candidate.canonicalEvent?.source ?? "")) {
    return "evidence_only";
  }
  if (candidate.legacySource === "analytics_admin_metric_snapshots") {
    return "verified_hot_cache";
  }
  if (normalizeString(candidate.canonicalEvent?.userId) || normalizeString(candidate.canonicalEvent?.sessionId) || normalizeString(candidate.canonicalEvent?.anonymousVisitorId)) {
    return "product_truth";
  }
  return "debug_truth";
}

function hasIdentity(candidate: LegacyRecoveryCandidateInput) {
  return Boolean(
    normalizeString(candidate.canonicalEvent?.userId)
      || normalizeString(candidate.canonicalEvent?.sessionId)
      || normalizeString(candidate.canonicalEvent?.anonymousVisitorId),
  );
}

function hasLinkedGuestAndUser(candidate: LegacyRecoveryCandidateInput, currentTruth: LegacyCurrentTruthInput) {
  const userId = normalizeString(candidate.canonicalEvent?.userId);
  const guestId = normalizeString(candidate.canonicalEvent?.anonymousVisitorId);
  const sessionId = normalizeString(candidate.canonicalEvent?.sessionId);
  if (!userId || (!guestId && !sessionId)) {
    return false;
  }

  return (currentTruth.identityLinks ?? []).some((link) => {
    const linkUser = normalizeString(link.userId);
    const linkGuest = normalizeString(link.guestId);
    const linkSession = normalizeString(link.sessionId);
    return linkUser === userId && (Boolean(guestId && linkGuest === guestId) || Boolean(sessionId && linkSession === sessionId));
  });
}

function resolveIdentityConfidence(
  candidate: LegacyRecoveryCandidateInput,
  currentTruth: Required<Pick<LegacyCurrentTruthInput, "eventIds" | "dedupeKeys">>,
): LegacyIdentityConfidence {
  const eventId = normalizeString(candidate.canonicalEvent?.eventId);
  const dedupeKey = normalizeString(candidate.canonicalEvent?.dedupeKey) || normalizeString(candidate.duplicateKey);
  if (eventId && currentTruth.eventIds.includes(eventId)) {
    return "exact_match";
  }
  if (dedupeKey && currentTruth.dedupeKeys.includes(dedupeKey)) {
    return "probable_match";
  }
  if (!hasIdentity(candidate)) {
    return "unknown";
  }
  if (isExternalEvidenceSource(candidate.legacySource)) {
    return "weak_match";
  }
  return candidate.actorConfidence === "high" ? "probable_match" : "weak_match";
}

function resolveDuplicateRisk(input: {
  candidate: LegacyRecoveryCandidateInput;
  currentTruth: Required<Pick<LegacyCurrentTruthInput, "eventIds" | "dedupeKeys">> & Pick<LegacyCurrentTruthInput, "identityLinks">;
  identityConfidence: LegacyIdentityConfidence;
}) {
  const eventId = normalizeString(input.candidate.canonicalEvent?.eventId);
  const dedupeKey = normalizeString(input.candidate.canonicalEvent?.dedupeKey) || normalizeString(input.candidate.duplicateKey);
  if (hasLinkedGuestAndUser(input.candidate, input.currentTruth)) {
    return "high";
  }
  if ((eventId && input.currentTruth.eventIds.includes(eventId)) || (dedupeKey && input.currentTruth.dedupeKeys.includes(dedupeKey))) {
    return "medium";
  }
  if (input.identityConfidence === "unknown") {
    return "unknown";
  }
  return "low";
}

function resolveRecoveryAction(input: {
  targetTruthLayer: LegacyTargetTruthLayer;
  identityConfidence: LegacyIdentityConfidence;
  duplicateRisk: LegacyDuplicateRisk;
}) {
  if (input.targetTruthLayer === "evidence_only") {
    return "archive_only";
  }
  if (input.identityConfidence === "unknown") {
    return "archive_only";
  }
  if (input.identityConfidence === "exact_match" || input.duplicateRisk === "high" || input.duplicateRisk === "medium") {
    return "link_candidate";
  }
  return "import_candidate";
}

function buildReason(input: {
  candidate: LegacyRecoveryCandidateInput;
  targetTruthLayer: LegacyTargetTruthLayer;
  identityConfidence: LegacyIdentityConfidence;
  duplicateRisk: LegacyDuplicateRisk;
}) {
  if (input.duplicateRisk === "high") {
    return "Candidate has linked guest and user lineage; keep as reconciliation link evidence to avoid double-counting.";
  }
  if (input.targetTruthLayer === "evidence_only") {
    return "External analytics evidence remains evidence-only until first-party reconciliation promotes it.";
  }
  if (input.identityConfidence === "unknown") {
    return "Candidate lacks enough identity evidence, so it stays archived/debug-only until an owner reviews it.";
  }
  if (input.identityConfidence === "exact_match") {
    return "Candidate matches an existing current event id; link it to current truth without overwriting.";
  }
  return "Candidate has enough first-party shape for dry-run manual review; no production import is allowed without a separate approved backfill plan.";
}

export function reconcileLegacyAnalyticsHistory(input: {
  recoveredEvents: LegacyRecoveryCandidateInput[];
  currentTruth?: LegacyCurrentTruthInput;
}): LegacyRecoveryReconciliationResult {
  const currentTruth = {
    eventIds: input.currentTruth?.eventIds ?? [],
    dedupeKeys: input.currentTruth?.dedupeKeys ?? [],
    identityLinks: input.currentTruth?.identityLinks ?? [],
  };
  const candidateMappings = input.recoveredEvents.map((candidate): LegacyRecoveryCandidateMapping => {
    const targetTruthLayer = resolveTargetTruthLayer(candidate);
    const identityConfidence = resolveIdentityConfidence(candidate, currentTruth);
    const duplicateRisk = resolveDuplicateRisk({ candidate, currentTruth, identityConfidence });
    const recoveryAction = resolveRecoveryAction({ targetTruthLayer, identityConfidence, duplicateRisk });

    return {
      legacySource: candidate.legacySource,
      legacyId: candidate.legacyId,
      targetTruthLayer,
      identityConfidence,
      duplicateRisk,
      recoveryAction,
      recoveryMode: "dry_run_manual_review",
      productionMutationAllowed: false,
      reason: buildReason({ candidate, targetTruthLayer, identityConfidence, duplicateRisk }),
      overwriteCurrentTruth: false,
      currentProductTruthSource: "analytics_event_facts",
    };
  });

  return {
    candidateMappings,
    summary: {
      candidateCount: candidateMappings.length,
      exactMatchCount: candidateMappings.filter((mapping) => mapping.identityConfidence === "exact_match").length,
      duplicateRiskHighCount: candidateMappings.filter((mapping) => mapping.duplicateRisk === "high").length,
      evidenceOnlyCount: candidateMappings.filter((mapping) => mapping.targetTruthLayer === "evidence_only").length,
      overwritesCurrentTruth: false,
    },
  };
}

export function buildLegacyRecoveryReconciliationReport(input: {
  currentHead: string;
  generatedAtUtc: string;
  sourceInventory: { sources?: Array<{ sourceName?: string; recoverability?: string }> };
  mappingReport: { recoveredEvents?: LegacyRecoveryCandidateInput[]; unmappedRecords?: unknown[] };
  currentTruth?: LegacyCurrentTruthInput;
}): LegacyRecoveryReconciliationReport {
  const reconciled = reconcileLegacyAnalyticsHistory({
    recoveredEvents: input.mappingReport.recoveredEvents ?? [],
    currentTruth: input.currentTruth,
  });
  const sourceTruthMap = [
    {
      source: "analytics_event_facts",
      truthLayer: "product_truth" as const,
      currentProductTruth: true,
      notes: "Current first-party event facts are not overwritten by legacy recovery.",
    },
    {
      source: "analytics_guest_batches",
      truthLayer: "product_truth" as const,
      currentProductTruth: true,
      notes: "Guest batches stay guest-lane product truth until identity links reconcile them.",
    },
    {
      source: "GA4 / BigQuery / PostHog",
      truthLayer: "evidence_only" as const,
      currentProductTruth: false,
      notes: "External provider sources remain evidence-only and cannot define product truth.",
    },
  ];
  const costFindings: LegacyRecoveryReconciliationReport["costFindings"] = [
    {
      id: "cloud-run-dry-run-only",
      lane: "cloud_run",
      severity: "p2",
      status: "source_safe",
      action: "No broad production backfill runs in a request path; candidates are derived from checked-in artifacts.",
    },
    {
      id: "cloud-sql-not-detected",
      lane: "cloud_sql",
      severity: "p2",
      status: "cloud_sql_not_detected_in_reconciliation_runtime",
      action: "Do not add SQL assumptions to legacy recovery.",
    },
    {
      id: "gemini-cloud-assist-not-used",
      lane: "gemini_cloud_assist",
      severity: "p2",
      status: "gemini_cloud_assist_not_used",
      action: "No AI identity matching or model calls are used for reconciliation.",
    },
    {
      id: "no-user-facing-4xx",
      lane: "route_4xx",
      severity: "p2",
      status: "not_user_facing",
      action: "Dry-run reconciliation adds no user-facing route and no new 4xx path.",
    },
  ];

  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "analytics-legacy-recovery-reconciliation",
    currentHead: input.currentHead,
    summary: {
      ...reconciled.summary,
      productTruthSources: sourceTruthMap.filter((entry) => entry.currentProductTruth).length,
      legacySourcesReconciled: new Set(reconciled.candidateMappings.map((mapping) => mapping.legacySource)).size,
      cloudRunCostFindings: costFindings.filter((finding) => finding.lane === "cloud_run").length,
      cloudSqlStatus: "cloud_sql_not_detected_in_reconciliation_runtime",
      geminiCloudAssistStatus: "gemini_cloud_assist_not_used",
      route4xxFindings: costFindings.filter((finding) => finding.lane === "route_4xx").length,
      p0Count: 0,
      p1Count: 0,
      p2Count: costFindings.length,
    },
    candidateMappings: reconciled.candidateMappings,
    sourceTruthMap,
    costFindings,
    productTruthPolicy: {
      dryRunOnly: true,
      productionMutationAllowed: false,
      recoveredEventsCanOverwriteCurrentTruth: false,
      externalEvidenceCanPromoteProductTruth: false,
      importCandidatesRequireSeparateApproval: true,
    },
    nextFixOrder: [
      "Review candidate mappings in Debug/source artifacts before any write-mode backfill proposal.",
      "Keep exact/probable first-party candidates in dry-run review until a separate approved backfill plan exists.",
      "Keep GA4, BigQuery, and PostHog as evidence-only unless first-party reconciliation proves identity and dedupe.",
    ],
  };
}

export function validateLegacyRecoveryReconciliationReport(
  report: LegacyRecoveryReconciliationReport,
  options: { reconcilerSource: string; currentHead?: string },
) {
  const failures: string[] = [];
  if (report.reportKey !== "analytics-legacy-recovery-reconciliation") {
    failures.push("reportKey must be analytics-legacy-recovery-reconciliation.");
  }
  if (options.currentHead && report.currentHead !== options.currentHead) {
    failures.push("currentHead mismatch.");
  }
  if (report.candidateMappings.some((mapping) => !mapping.duplicateRisk)) {
    failures.push("recovery plan lacks duplicate-risk classification.");
  }
  if (report.candidateMappings.some((mapping) => !mapping.identityConfidence)) {
    failures.push("recovery plan lacks identity confidence.");
  }
  if (!report.sourceTruthMap.some((entry) => entry.currentProductTruth && entry.truthLayer === "product_truth")) {
    failures.push("current product truth source not identified.");
  }
  if (report.candidateMappings.some((mapping) => mapping.targetTruthLayer === "product_truth" && mapping.identityConfidence === "unknown")) {
    failures.push("unknown legacy data is treated as clean.");
  }
  if (report.summary.overwritesCurrentTruth !== false || report.candidateMappings.some((mapping) => mapping.overwriteCurrentTruth !== false)) {
    failures.push("current product truth must not be overwritten.");
  }
  if (
    report.productTruthPolicy?.dryRunOnly !== true
    || report.productTruthPolicy.productionMutationAllowed !== false
    || report.productTruthPolicy.recoveredEventsCanOverwriteCurrentTruth !== false
    || report.productTruthPolicy.externalEvidenceCanPromoteProductTruth !== false
    || report.productTruthPolicy.importCandidatesRequireSeparateApproval !== true
  ) {
    failures.push("legacy recovery report must declare dry-run product-truth policy.");
  }
  if (report.candidateMappings.some((mapping) => mapping.recoveryMode !== "dry_run_manual_review" || mapping.productionMutationAllowed !== false)) {
    failures.push("legacy recovery candidates must remain dry-run/manual-review only.");
  }
  for (const lane of ["cloud_run", "cloud_sql", "gemini_cloud_assist", "route_4xx"] as const) {
    if (!report.costFindings.some((finding) => finding.lane === lane)) {
      failures.push(`${lane} cost status lane is missing.`);
    }
  }
  if (report.nextFixOrder.length === 0) {
    failures.push("no next action emitted.");
  }
  const blockedRuntimePattern = new RegExp([
    "firebase",
    "-",
    "admin",
    "|",
    "admin",
    "Db\\.",
    "|",
    "\\.collection\\(",
    "|",
    "write",
    "Batch\\(",
    "|",
    "fetch\\s*\\(\\s*[" + String.fromCharCode(34, 39) + "]",
  ].join(""), "u");
  if (blockedRuntimePattern.test(options.reconcilerSource)) {
    failures.push("reconciler must not contain production read/write functions.");
  }
  return failures;
}
