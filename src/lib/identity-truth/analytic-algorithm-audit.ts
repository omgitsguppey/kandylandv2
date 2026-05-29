export const ANALYTIC_ALGORITHM_AUDIT_VERSION = "2026.05.algorithm-truth.1";

export interface AnalyticAlgorithmAuditEntry {
  algorithmId: string;
  inputFacts: string[];
  identityFieldsConsumed: string[];
  confidenceConsumed: true;
  outputProduced: string;
  knownFalsePositiveRisk: string;
  knownFalseNegativeRisk: string;
  userVisibleImpact: string;
  debugVisibility: string;
  costImpact: "none" | "bounded_source_only" | "runtime_cost_risk";
  missingDefaultsToZero: false;
  globalVsUserExplanation: string;
  scoreImpact: string;
}

export const ANALYTIC_ALGORITHM_AUDIT: AnalyticAlgorithmAuditEntry[] = [
  {
    algorithmId: "event_envelope_validation",
    inputFacts: ["eventName", "actorKind", "identityState", "identityConfidence", "sessionId", "guestId", "userRef", "linkId"],
    identityFieldsConsumed: ["actorKind", "identityState", "identityConfidence", "guestId", "userRef", "linkId"],
    confidenceConsumed: true,
    outputProduced: "canonical event envelope",
    knownFalsePositiveRisk: "unregistered or admin projection event counted as user behavior",
    knownFalseNegativeRisk: "guest event quarantined without a debug reason",
    userVisibleImpact: "user activity may appear missing instead of collecting",
    debugVisibility: "event translation bridge",
    costImpact: "bounded_source_only",
    missingDefaultsToZero: false,
    globalVsUserExplanation: "Global envelope activity carries countable identity fields but does not itself prove user-level hydration.",
    scoreImpact: "evidenceCompleteness",
  },
  {
    algorithmId: "event_translation",
    inputFacts: ["canonical envelope", "feature registry", "person metric definitions"],
    identityFieldsConsumed: ["actorKind", "identityState", "identityConfidence"],
    confidenceConsumed: true,
    outputProduced: "feature activity and person metric mapping",
    knownFalsePositiveRisk: "global registered event treated as individual proof",
    knownFalseNegativeRisk: "source-ready future activity labeled broken",
    userVisibleImpact: "analytics panel status can overstate user proof",
    debugVisibility: "event translation bridge",
    costImpact: "bounded_source_only",
    missingDefaultsToZero: false,
    globalVsUserExplanation: "Global translated activity must still prove guest/signed-in/linked-person scope.",
    scoreImpact: "sourceHealth",
  },
  {
    algorithmId: "person_metrics_hydration",
    inputFacts: ["event envelopes", "legacy candidates", "provenZero windows"],
    identityFieldsConsumed: ["guestId", "userRef", "linkId", "identityConfidence", "actorKind"],
    confidenceConsumed: true,
    outputProduced: "global, guest, signed-in, linked-person, and creator role scopes",
    knownFalsePositiveRisk: "global scope shown as user scope",
    knownFalseNegativeRisk: "weak guest activity hidden when consent allows minimal analytics",
    userVisibleImpact: "individual user panels can show missing user metrics",
    debugVisibility: "person metrics hydration",
    costImpact: "bounded_source_only",
    missingDefaultsToZero: false,
    globalVsUserExplanation: "Global hydrated metrics do not clear individual user tracking unless a user scope hydrates.",
    scoreImpact: "evidenceCompleteness",
  },
  {
    algorithmId: "journey_attribution",
    inputFacts: ["behavioral facts", "event timestamps", "sessionId", "linkId"],
    identityFieldsConsumed: ["actorKind", "identityConfidence", "sessionId", "userId"],
    confidenceConsumed: true,
    outputProduced: "pre-auth and post-auth journey continuity",
    knownFalsePositiveRisk: "same action counted before and after auth",
    knownFalseNegativeRisk: "handoff failure erases guest history",
    userVisibleImpact: "funnels appear broken after login",
    debugVisibility: "user journey behavioral intelligence",
    costImpact: "bounded_source_only",
    missingDefaultsToZero: false,
    globalVsUserExplanation: "Global journey continuity is preserved separately from user aggregate count scopes.",
    scoreImpact: "regressionRisk",
  },
  {
    algorithmId: "live_evidence",
    inputFacts: ["person metric scopes", "panel hydration", "identity confidence"],
    identityFieldsConsumed: ["identityConfidence", "linkedPersonMetricsHydrated", "signedInMetricsHydrated"],
    confidenceConsumed: true,
    outputProduced: "user tracking gate evidence",
    knownFalsePositiveRisk: "global activity clears user tracking gate",
    knownFalseNegativeRisk: "collecting future user activity treated as failure",
    userVisibleImpact: "admin debug can mislead operators",
    debugVisibility: "live evidence gate",
    costImpact: "none",
    missingDefaultsToZero: false,
    globalVsUserExplanation: "Global activity alone cannot clear evidence; only exact or linked user metrics clear individual tracking evidence.",
    scoreImpact: "runtimeHealth",
  },
];

export function validateAnalyticAlgorithmAudit(entries = ANALYTIC_ALGORITHM_AUDIT) {
  const failures: string[] = [];
  for (const entry of entries) {
    if (entry.identityFieldsConsumed.length === 0) failures.push(`${entry.algorithmId} lacks identity input.`);
    if (entry.confidenceConsumed !== true) failures.push(`${entry.algorithmId} ignores identity confidence.`);
    if (entry.missingDefaultsToZero !== false) failures.push(`${entry.algorithmId} defaults missing to zero.`);
    if (!entry.globalVsUserExplanation.includes("Global") && !entry.globalVsUserExplanation.includes("global")) failures.push(`${entry.algorithmId} cannot explain global vs user attribution.`);
    if (!entry.debugVisibility) failures.push(`${entry.algorithmId} lacks debug output.`);
    if (!entry.scoreImpact) failures.push(`${entry.algorithmId} lacks score impact.`);
  }
  return failures;
}
