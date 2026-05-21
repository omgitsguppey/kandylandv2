import type {
  LegacyNormalizationAction,
  LegacyNormalizationConfidence,
  LegacyNormalizationDomain,
  LegacyNormalizationDuplicateRisk,
  LegacyNormalizationInputRecord,
  LegacyNormalizationPlan,
  LegacyNormalizationRecord,
  LegacyNormalizedCategory,
} from "@/lib/legacy/legacy-normalization-contract";

export const MARCH_FIRST_RECOVERY_START_DATE = "2026-03-01";

const DOMAIN_TO_CATEGORY: Record<LegacyNormalizationDomain, LegacyNormalizedCategory> = {
  guest_sessions: "guest_session",
  user_sessions: "user_session",
  identity_links: "identity_link",
  behavior_events: "behavior_event",
  watch_sessions: "watch_session",
  drops: "drop",
  creator_profile_views: "creator_profile_view",
  fan_pass_subscriptions: "fan_pass_subscription",
  creator_broadcasts: "creator_broadcast",
  purchases_gumdrop_ledger_references: "purchase_ledger_reference",
  admin_truth_samples: "admin_truth_sample",
};

const FIELD_MAP: Record<LegacyNormalizationDomain, Record<string, string>> = {
  guest_sessions: {
    session_id: "sessionId",
    sessionId: "sessionId",
    anonymous_visitor_id: "anonymousVisitorId",
    anonymousVisitorId: "anonymousVisitorId",
    route: "route",
  },
  user_sessions: {
    session_id: "sessionId",
    sessionId: "sessionId",
    user_id: "userId",
    userId: "userId",
    route: "route",
  },
  identity_links: {
    identity_link_id: "identityLinkId",
    identityLinkId: "identityLinkId",
    anonymous_visitor_id: "anonymousVisitorId",
    anonymousVisitorId: "anonymousVisitorId",
    user_id: "userId",
    userId: "userId",
    session_id: "sessionId",
    sessionId: "sessionId",
  },
  behavior_events: {
    eventName: "eventName",
    event_name: "eventName",
    eventId: "eventId",
    event_id: "eventId",
    session_id: "sessionId",
    sessionId: "sessionId",
    anonymous_visitor_id: "anonymousVisitorId",
    anonymousVisitorId: "anonymousVisitorId",
    user_id: "userId",
    userId: "userId",
    route: "route",
  },
  watch_sessions: {
    watch_session_id: "watchSessionId",
    watchSessionId: "watchSessionId",
    session_id: "sessionId",
    sessionId: "sessionId",
    user_id: "userId",
    userId: "userId",
    drop_id: "dropId",
    dropId: "dropId",
  },
  drops: {
    drop_id: "dropId",
    dropId: "dropId",
    slug: "slug",
    createdAt: "createdAt",
  },
  creator_profile_views: {
    creator_id: "targetCreatorId",
    creatorId: "targetCreatorId",
    target_creator_id: "targetCreatorId",
    targetCreatorId: "targetCreatorId",
    session_id: "sessionId",
    sessionId: "sessionId",
    user_id: "userId",
    userId: "userId",
  },
  fan_pass_subscriptions: {
    subscription_id: "subscriptionId",
    subscriptionId: "subscriptionId",
    creator_id: "targetCreatorId",
    creatorId: "targetCreatorId",
    user_id: "userId",
    userId: "userId",
  },
  creator_broadcasts: {
    broadcast_id: "broadcastId",
    broadcastId: "broadcastId",
    creator_id: "actorCreatorId",
    creatorId: "actorCreatorId",
  },
  purchases_gumdrop_ledger_references: {
    transaction_id: "transactionId",
    transactionId: "transactionId",
    ledger_id: "ledgerId",
    ledgerId: "ledgerId",
    user_id: "userId",
    userId: "userId",
    gumdrops_amount: "gumDropsAmount",
    gumDropsAmount: "gumDropsAmount",
  },
  admin_truth_samples: {
    admin_id: "actorAdminId",
    adminId: "actorAdminId",
    route: "route",
    sample_id: "sampleId",
    sampleId: "sampleId",
  },
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function hasField(fields: Record<string, unknown>, ...keys: string[]) {
  return keys.some((key) => readString(fields[key]) || typeof fields[key] === "number" || typeof fields[key] === "boolean");
}

function mapFields(record: LegacyNormalizationInputRecord) {
  const map = FIELD_MAP[record.legacyDomain];
  const mapped: Record<string, string | number | boolean> = {};
  for (const [legacyKey, currentKey] of Object.entries(map)) {
    const value = record.fields[legacyKey];
    if (typeof value === "string" && value.trim()) {
      mapped[currentKey] = value.trim();
    } else if (typeof value === "number" && Number.isFinite(value)) {
      mapped[currentKey] = value;
    } else if (typeof value === "boolean") {
      mapped[currentKey] = value;
    }
  }
  return mapped;
}

function isUnknownBehavior(record: LegacyNormalizationInputRecord) {
  if (record.legacyDomain !== "behavior_events") return false;
  const eventName = readString(record.fields.eventName) || readString(record.fields.event_name);
  return !eventName || eventName.toLowerCase().includes("mystery") || eventName.toLowerCase().includes("unknown");
}

function confidenceFor(record: LegacyNormalizationInputRecord, mappedFields: Record<string, string | number | boolean>): LegacyNormalizationConfidence {
  if (isUnknownBehavior(record)) return "unknown";
  if (record.legacyDomain === "purchases_gumdrop_ledger_references") return "weak";
  if (record.legacyDomain === "drops" && (mappedFields.dropId || mappedFields.slug)) return "probable";
  if (record.legacyDomain === "admin_truth_samples" && (mappedFields.actorAdminId || mappedFields.sampleId)) return "probable";
  const hasIdentity = Boolean(mappedFields.userId || mappedFields.anonymousVisitorId || mappedFields.actorCreatorId || mappedFields.targetCreatorId);
  const hasSession = Boolean(mappedFields.sessionId || mappedFields.watchSessionId);
  const hasObject = Object.keys(mappedFields).some((key) => /Id$/u.test(key) && key !== "userId" && key !== "sessionId");
  if (hasIdentity && hasSession && hasObject) return "probable";
  if (hasIdentity && hasSession) return "probable";
  if (hasIdentity || hasSession || hasObject) return "weak";
  return "unknown";
}

function duplicateRiskFor(record: LegacyNormalizationInputRecord, confidence: LegacyNormalizationConfidence): LegacyNormalizationDuplicateRisk {
  if (confidence === "unknown") return "high";
  if (record.legacyDomain === "identity_links") return "medium";
  if (record.legacyDomain === "guest_sessions" || record.legacyDomain === "user_sessions" || record.legacyDomain === "behavior_events") return "medium";
  if (record.legacyDomain === "purchases_gumdrop_ledger_references") return "high";
  return confidence === "probable" ? "medium" : "low";
}

function actionFor(record: LegacyNormalizationInputRecord, confidence: LegacyNormalizationConfidence): LegacyNormalizationAction {
  if (record.legacyDomain === "purchases_gumdrop_ledger_references") return "needs_manual_review";
  if (confidence === "unknown") return "archive_only";
  if (record.legacyDomain === "identity_links") return "link_candidate";
  if (record.legacyDomain === "admin_truth_samples") return "archive_only";
  return "normalize_candidate";
}

function evidenceReasonFor(record: LegacyNormalizationInputRecord, confidence: LegacyNormalizationConfidence) {
  if (record.legacyDomain === "purchases_gumdrop_ledger_references") {
    return "Purchase and GumDrop ledger references are classified read-only and require manual review before any future migration.";
  }
  if (confidence === "unknown") {
    return "Unknown legacy evidence cannot become current truth or known user behavior.";
  }
  return "Legacy evidence is mapped as a dry-run candidate with confidence and duplicate-risk labels.";
}

function mutationBlockedReason(record: LegacyNormalizationInputRecord, confidence: LegacyNormalizationConfidence): LegacyNormalizationRecord["mutationBlockedReason"] {
  if (record.legacyDomain === "purchases_gumdrop_ledger_references") return "purchase_gumdrop_ledger_read_only";
  if (confidence === "unknown") return "unknown_legacy_not_current_truth";
  return "dry_run_only";
}

export function buildMarchFirstLegacyNormalizationPlan(input: {
  records: LegacyNormalizationInputRecord[];
}): LegacyNormalizationPlan {
  const startMs = Date.parse(`${MARCH_FIRST_RECOVERY_START_DATE}T00:00:00.000Z`);
  const records = input.records
    .filter((record) => record.timestampMs >= startMs)
    .map((record): LegacyNormalizationRecord => {
      const mappedFields = mapFields(record);
      const unknownBehavior = isUnknownBehavior(record);
      const currentCategory = unknownBehavior ? "unknown" : DOMAIN_TO_CATEGORY[record.legacyDomain];
      const confidence = confidenceFor(record, mappedFields);
      return {
        ...record,
        currentCategory,
        mappedFields,
        confidence,
        duplicateRisk: duplicateRiskFor(record, confidence),
        action: actionFor(record, confidence),
        currentTruthEligible: false,
        readOnly: true,
        mutationBlockedReason: mutationBlockedReason(record, confidence),
        evidenceReason: evidenceReasonFor(record, confidence),
      };
    });

  const unknownCount = records.filter((record) => record.confidence === "unknown").length;
  const ledgerReadOnly = records.filter((record) => record.legacyDomain === "purchases_gumdrop_ledger_references").length;

  return {
    mode: "dry_run_only",
    recoveryStartDate: MARCH_FIRST_RECOVERY_START_DATE,
    readsProduction: false,
    liveBackfill: false,
    mutationsAllowed: false,
    records,
    debugBacklogIssues: [
      {
        id: "march-first-legacy-normalization-evidence-refresh",
        source: "evidence",
        fixClass: "evidence_refresh",
        sourceRoute: "legacy://march-first-normalization",
        owner: "analytics",
        severity: unknownCount > 0 ? "p1" : "p2",
        exactNextAction: "Review generated dry-run candidates, refresh source evidence locally, and keep unknown legacy rows archived until identity improves.",
      },
      {
        id: "march-first-ledger-readonly-manual-review",
        source: "admin_truth",
        fixClass: "manual_required",
        sourceRoute: "legacy://march-first-normalization",
        owner: "analytics",
        severity: ledgerReadOnly > 0 ? "p1" : "p3",
        exactNextAction: "Keep purchase and GumDrop ledger references read-only; require a separate reviewed migration before any ledger write plan.",
      },
    ],
    summary: {
      inputRecords: input.records.length,
      inWindowRecords: records.length,
      exactCount: records.filter((record) => record.confidence === "exact").length,
      probableCount: records.filter((record) => record.confidence === "probable").length,
      weakCount: records.filter((record) => record.confidence === "weak").length,
      unknownCount,
      highDuplicateRiskCount: records.filter((record) => record.duplicateRisk === "high").length,
      currentTruthEligibleCount: 0,
      readOnlyLedgerReferenceCount: ledgerReadOnly,
    },
  };
}

export function hasLegacyFieldMapping(record: LegacyNormalizationInputRecord) {
  return Object.keys(FIELD_MAP[record.legacyDomain]).some((field) => hasField(record.fields, field));
}
