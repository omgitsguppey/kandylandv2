import {
  buildEventEnvelope,
  normalizeLegacyEventEnvelope,
} from "@/lib/analytics/event-envelope-builder";
import type { EventEnvelopeInput } from "@/lib/analytics/event-envelope-contract";
import type { IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";
import { normalizeConsentMode } from "@/lib/privacy/consent-tracking-policy";
import type { ConsentMode } from "@/lib/privacy/consent-tracking-contract";
import {
  LEGACY_EVENT_RECOVERY_DOMAINS,
  type LegacyEventRecoveryAction,
  type LegacyEventRecoveryCandidate,
  type LegacyEventRecoveryConsentAssumption,
  type LegacyEventRecoveryDomain,
  type LegacyEventRecoveryDuplicateRisk,
  type LegacyEventRecoverySourceRecord,
  type MarchFirstEventRecoveryDryRun,
} from "@/lib/legacy/legacy-event-recovery-contract";

export const recoveryStartDate = "2026-03-01" as const;
export const dryRunOnly = true as const;

const RECOVERY_START_MS = Date.parse(`${recoveryStartDate}T00:00:00.000Z`);

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function normalizeEventName(record: LegacyEventRecoverySourceRecord) {
  return cleanString(record.eventName)
    || cleanString(record.rawEventName)
    || cleanString(record.eventType)
    || "unknown_legacy";
}

function normalizeOccurredAt(value: LegacyEventRecoverySourceRecord["occurredAt"]) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  const candidate = cleanString(value);
  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date(0).toISOString();
}

function eventText(record: LegacyEventRecoverySourceRecord) {
  return [
    normalizeEventName(record),
    record.source,
    record.legacySystem,
    ...Object.keys(record.metadata ?? {}),
  ].join(" ").toLowerCase();
}

export function classifyLegacyEventDomain(record: LegacyEventRecoverySourceRecord): LegacyEventRecoveryDomain {
  const text = eventText(record);
  if (/unknown|mystery|orphan/u.test(text)) return "legacy_unknown";
  if (/identity|link|signup|login|auth/u.test(text)) return "identity_links";
  if (/wallet|payment|purchase|paypal|checkout|gumdrop|transaction|ledger/u.test(text)) return "wallet_payment_lifecycle";
  if (/drop|unwrap|unlock|open|file|viewer/u.test(text)) return "drop_open_unwrap";
  if (/creator.*profile|profile.*creator|creator_profile/u.test(text)) return "creator_profile_view";
  if (/fan.?pass|subscription|subscribe/u.test(text)) return "fan_pass_subscription";
  if (/broadcast/u.test(text)) return "broadcasts";
  if (/notification|push/u.test(text)) return "notifications";
  if (/page|session|route|screen/u.test(text)) return "page_session";
  if (/click|watch|search|filter|behavior|semantic|target|view/u.test(text)) return "behavior_signals";
  return "legacy_unknown";
}

function guestIdFor(record: LegacyEventRecoverySourceRecord) {
  return cleanString(record.guestId) || cleanString(record.anonymousId) || cleanString(record.visitorId);
}

function consentAssumptionFor(
  record: LegacyEventRecoverySourceRecord,
  domain: LegacyEventRecoveryDomain,
): LegacyEventRecoveryConsentAssumption {
  const consentMode = normalizeConsentMode(record.consentMode);
  if (consentMode !== "unknown") return "explicit";
  if (domain === "page_session" && (guestIdFor(record) || cleanString(record.sessionId))) return "inferred_minimal";
  return "unknown_necessary_only";
}

function consentModeFor(assumption: LegacyEventRecoveryConsentAssumption, record: LegacyEventRecoverySourceRecord): ConsentMode {
  if (assumption === "explicit") return normalizeConsentMode(record.consentMode);
  if (assumption === "inferred_minimal") return "minimal_analytics";
  return "necessary_only";
}

function identityConfidenceFor(
  record: LegacyEventRecoverySourceRecord,
  domain: LegacyEventRecoveryDomain,
  assumption: LegacyEventRecoveryConsentAssumption,
): IdentityConfidence {
  const userId = cleanString(record.userId);
  const guestId = guestIdFor(record);
  const sessionId = cleanString(record.sessionId);
  const linkId = cleanString(record.linkId);

  if (domain === "legacy_unknown") return "unknown";
  if (domain === "identity_links" && userId && guestId && linkId) return "linked";
  if (record.identityVerified === true && userId && assumption === "explicit") return "exact";
  if (userId || guestId) return assumption === "explicit" ? "inferred" : "weak";
  if (sessionId) return "weak";
  return "unknown";
}

function actionFor(
  record: LegacyEventRecoverySourceRecord,
  domain: LegacyEventRecoveryDomain,
  confidence: IdentityConfidence,
  occurredAtMs: number,
): LegacyEventRecoveryAction {
  if (occurredAtMs < RECOVERY_START_MS) return "ignore";
  if (domain === "wallet_payment_lifecycle") return "needs_manual_review";
  if (domain === "legacy_unknown" || confidence === "unknown") return "archive_only";
  if (domain === "identity_links") return "link_candidate";
  return "normalize_candidate";
}

function duplicateRiskFor(
  record: LegacyEventRecoverySourceRecord,
  action: LegacyEventRecoveryAction,
  confidence: IdentityConfidence,
): LegacyEventRecoveryDuplicateRisk {
  if (action === "ignore" || action === "needs_manual_review" || confidence === "unknown") return "high";
  if (!cleanString(record.legacyEventId)) return "high";
  if (guestIdFor(record) && cleanString(record.sessionId) && action === "normalize_candidate") return "low";
  if (action === "link_candidate" || confidence === "inferred" || confidence === "weak") return "medium";
  return "low";
}

function envelopeInputFor(
  record: LegacyEventRecoverySourceRecord,
  domain: LegacyEventRecoveryDomain,
  assumption: LegacyEventRecoveryConsentAssumption,
  confidence: IdentityConfidence,
  occurredAt: string,
): EventEnvelopeInput {
  const eventName = normalizeEventName(record);
  const guestId = guestIdFor(record);
  const userId = confidence === "exact" || confidence === "linked" || confidence === "inferred"
    ? cleanString(record.userId)
    : "";
  const isLegacyUnknown = domain === "legacy_unknown" || confidence === "unknown";
  return {
    eventId: cleanString(record.legacyEventId) || `legacy:${eventName}:${occurredAt}`,
    eventName,
    timestamp: occurredAt,
    source: "legacy",
    sessionId: cleanString(record.sessionId) || undefined,
    guestId: isLegacyUnknown ? null : guestId || undefined,
    userId: isLegacyUnknown ? null : userId || undefined,
    linkId: isLegacyUnknown ? null : cleanString(record.linkId) || undefined,
    consentMode: consentModeFor(assumption, record),
    identityConfidence: confidence,
    metadata: {
      ...(record.metadata ?? {}),
      legacySource: record.source,
      legacySystem: record.legacySystem ?? null,
      legacyDomain: domain,
      recoveryStartDate,
      dryRunOnly,
    },
    legacyUnknown: isLegacyUnknown,
  };
}

function manualReviewReasonFor(domain: LegacyEventRecoveryDomain, action: LegacyEventRecoveryAction) {
  if (action === "needs_manual_review" && domain === "wallet_payment_lifecycle") {
    return "Wallet and payment lifecycle evidence is mapped as a dry-run envelope candidate only; payment math and ledger state remain untouched.";
  }
  if (action === "archive_only") return "Unknown or weak legacy evidence cannot become current user truth.";
  return null;
}

export function buildLegacyEventRecoveryCandidate(record: LegacyEventRecoverySourceRecord): LegacyEventRecoveryCandidate {
  const occurredAt = normalizeOccurredAt(record.occurredAt);
  const occurredAtMs = Date.parse(occurredAt);
  const baseDomain = classifyLegacyEventDomain(record);
  const domain = occurredAtMs < RECOVERY_START_MS ? baseDomain : baseDomain;
  const consentAssumption = consentAssumptionFor(record, domain);
  const identityConfidence = identityConfidenceFor(record, domain, consentAssumption);
  const action = actionFor(record, domain, identityConfidence, occurredAtMs);
  const duplicateRisk = duplicateRiskFor(record, action, identityConfidence);
  const input = envelopeInputFor(record, domain, consentAssumption, identityConfidence, occurredAt);
  const normalizedEnvelopeCandidate = domain === "legacy_unknown" || identityConfidence === "unknown"
    ? normalizeLegacyEventEnvelope(input)
    : buildEventEnvelope(input);

  return {
    legacyEventId: cleanString(record.legacyEventId) || normalizedEnvelopeCandidate.eventId,
    occurredAt,
    domain,
    action,
    identityConfidence,
    consentAssumption,
    duplicateRisk,
    normalizedEnvelopeCandidate: action === "link_candidate"
      ? { ...normalizedEnvelopeCandidate, includeInUserBehavior: false }
      : normalizedEnvelopeCandidate,
    dryRunOnly,
    canMutateProduction: false,
    manualReviewReason: manualReviewReasonFor(domain, action),
    boundaryReason: action === "ignore" ? "before_2026_03_01_recovery_boundary" : null,
  };
}

function countBy<T extends string>(values: readonly T[], initialKeys: readonly T[]) {
  const counts = Object.fromEntries(initialKeys.map((key) => [key, 0])) as Record<T, number>;
  for (const value of values) counts[value] += 1;
  return counts;
}

export function buildMarchFirstEventRecoveryDryRun(input: {
  records: LegacyEventRecoverySourceRecord[];
}): MarchFirstEventRecoveryDryRun {
  const candidates = input.records.map(buildLegacyEventRecoveryCandidate);
  return {
    mode: "dry_run_only",
    recoveryStartDate,
    readsProduction: false,
    liveBackfill: false,
    mutationsAllowed: false,
    rawRecordsIncluded: false,
    candidates,
    summary: {
      inputRecords: input.records.length,
      candidateCount: candidates.length,
      confidenceCounts: countBy(candidates.map((candidate) => candidate.identityConfidence), [
        "exact",
        "linked",
        "inferred",
        "weak",
        "unknown",
      ]),
      actionCounts: countBy(candidates.map((candidate) => candidate.action), [
        "normalize_candidate",
        "link_candidate",
        "archive_only",
        "ignore",
        "needs_manual_review",
      ]),
      domainCounts: countBy(candidates.map((candidate) => candidate.domain), LEGACY_EVENT_RECOVERY_DOMAINS),
      duplicateRiskCounts: countBy(candidates.map((candidate) => candidate.duplicateRisk), ["low", "medium", "high"]),
    },
    mutationPrevention: {
      productionMutationBlocked: true,
      exportedMutationFunctions: [],
      blockedReason: "dry_run_only_no_live_backfill",
    },
    debugPanel: {
      lane: "Legacy recovery",
      showCountsByConfidenceAndAction: true,
      rawDumpsCollapsed: true,
      duplicateLegacyWidgetsConsolidated: true,
    },
  };
}
