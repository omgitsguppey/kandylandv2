import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const IDENTITY_PRIVACY_RAW_LEDGER_REPORT_KEY = "identity-privacy-raw-ledger-rewire" as const;
export const IDENTITY_PRIVACY_RAW_LEDGER_REPORT_PATH = "agent/state/identity-privacy-raw-ledger-rewire.generated.json";
export const SOURCE_INVENTORY_REPORT_PATH = "agent/state/analytics-rewire-phase-one.generated.json" as const;

export const REQUIRED_ACTOR_LANES = [
  "guest",
  "anonymous_visitor",
  "session",
  "authenticated_user",
  "creator",
  "admin",
  "system",
  "unknown",
] as const;

export const PSEUDONYMOUS_IDENTIFIER_RULE = {
  ruleKey: "pseudonymous-identifiers-are-not-anonymous",
  identifiers: ["subject_*", "anon_*", "sessionId", "anonymousVisitorId", "kandy_session_id"],
  classification: "pseudonymous identifiers, not fully anonymous data",
  recommendedAction: "Treat these ids as recoverable identity evidence only when consent/privacy rules allow it.",
} as const;

export const PRIVACY_OFF_BOUNDARY_RULE = {
  ruleKey: "privacy-off-is-neither-none-nor-all",
  forbiddenClaims: [
    "privacy off means no data at all",
    "privacy off still allows all analytics",
  ],
  requiredInterpretation: "Privacy-off still allows minimized required operational telemetry, may allow constrained consent-off measurement, and blocks optional analytics/personalization.",
} as const;

export type ActorLane = typeof REQUIRED_ACTOR_LANES[number];
export type PrivacyModeKey =
  | "required_operational"
  | "limited_consent_off_measurement"
  | "optional_analytics_personalization";
export type ConsentRequirement =
  | "required_operational_only"
  | "consent_required"
  | "eligible_if_minimized"
  | "needs_review";
export type RewireSeverity = "P0" | "P1" | "P2" | "P3";

export type IdentityLane = {
  laneKey: string;
  actorType: ActorLane;
  canonicalKeys: string[];
  fallbackKeys: string[];
  mustPreserveHistory: boolean;
  mustNotRewriteOldFacts: boolean;
  sourceFiles: string[];
  consumerFiles: string[];
  recommendedOwner: string;
  recommendedAction: string;
};

export type PrivacyMode = {
  modeKey: PrivacyModeKey;
  allowedWhenPrivacyOff: boolean;
  allowedDestinations: string[];
  forbiddenDestinations: string[];
  examples: string[];
  requiredLabels: string[];
  retentionExpectation: string;
  notes: string[];
};

export type RawLedgerRule = {
  ruleKey: string;
  appliesTo: string[];
  requiredFields: string[];
  recommendedFields: string[];
  forbiddenConfusions: string[];
  validators: string[];
  recommendedAction: string;
};

export type RecoveryEligibility = {
  laneKey: string;
  sourcePath: string;
  identityKeys: string[];
  consentRequirement: ConsentRequirement;
  canSurfaceInAdminAnalytics: boolean;
  canSurfaceInAdminDebug: boolean;
  canBackfillLater: boolean;
  confidence: "high" | "medium" | "low" | "unknown";
  recommendedAction: string;
};

export type IdentityPrivacyRawLedgerIssue = {
  issueKey: string;
  severity: RewireSeverity;
  title: string;
  description: string;
  files: string[];
  blocksRecovery: boolean;
  blocksPhaseOneFreeze: boolean;
  recommendedAction: string;
};

export type SourceInventoryReportSummary = {
  path: typeof SOURCE_INVENTORY_REPORT_PATH;
  generatedAtUtc?: string;
  currentHead?: string;
  laneCount?: number;
  issueCount?: number;
  orphanCandidateCount?: number;
};

export type IdentityPrivacyRawLedgerReport = {
  generatedAtUtc: string;
  reportKey: typeof IDENTITY_PRIVACY_RAW_LEDGER_REPORT_KEY;
  currentHead?: string;
  sourceInventoryReport?: SourceInventoryReportSummary;
  phasesCovered: string[];
  summary: {
    identityLaneCount: number;
    privacyRuleCount: number;
    rawLedgerRuleCount: number;
    recoveryEligibilityRuleCount: number;
    issueCount: number;
    p0Count: number;
    p1Count: number;
    consentOffModeIssues: number;
    pseudonymousIdentityIssues: number;
    rawLedgerContractIssues: number;
    recoveryEligibilityIssues: number;
  };
  identityLanes: IdentityLane[];
  privacyModes: PrivacyMode[];
  rawLedgerRules: RawLedgerRule[];
  recoveryEligibility: RecoveryEligibility[];
  issues: IdentityPrivacyRawLedgerIssue[];
};

type BuildOptions = {
  root?: string;
  now?: Date;
};

type PhaseOneReport = {
  generatedAtUtc?: string;
  currentHead?: string;
  summary?: {
    laneCount?: number;
    issueCount?: number;
    orphanCandidateCount?: number;
  };
  lanes?: Array<{
    laneKey?: string;
    title?: string;
    collectionsOrPaths?: string[];
  }>;
  orphanCandidates?: Array<{
    key?: string;
    writtenPath?: string;
    recoveryValue?: "high" | "medium" | "low" | "unknown";
  }>;
};

type FileTokenHint = {
  tokens: string[];
  sourceHints: string[];
  consumerHints: string[];
};

const sourceCache = new Map<string, string>();

const IDENTITY_HINTS: Record<ActorLane, FileTokenHint> = {
  guest: {
    tokens: ["guest", "anonymousVisitorId", "analytics_guest_batches"],
    sourceHints: ["src/lib/client-session.ts", "src/app/api/analytics/ingest/route.ts", "src/components/Analytics/DeepTracker.tsx"],
    consumerHints: ["src/app/api/admin", "src/lib/analytics", "docs/agent-truth"],
  },
  anonymous_visitor: {
    tokens: ["anonymousVisitorId", "subject_", "anon_"],
    sourceHints: ["src/lib/client-session.ts", "src/app/api/analytics/ingest/route.ts"],
    consumerHints: ["src/lib/analytics", "src/app/api/admin", "docs/agent-truth"],
  },
  session: {
    tokens: ["sessionId", "kandy_session_id", "analytics_sessions"],
    sourceHints: ["src/lib/client-session.ts", "src/app/api/analytics/ingest/route.ts", "src/components/Analytics/DeepTracker.tsx"],
    consumerHints: ["src/app/api/admin", "src/lib/analytics", "docs/agent-truth"],
  },
  authenticated_user: {
    tokens: ["userId", "authenticated user", "identity_linked"],
    sourceHints: ["src/app/api/analytics/ingest-identified/route.ts", "src/lib/server/analytics-identity-linking.ts"],
    consumerHints: ["src/lib/analytics", "src/app/api/admin", "docs/agent-truth"],
  },
  creator: {
    tokens: ["creatorId", "targetCreatorId", "creator"],
    sourceHints: ["src/lib/analytics/analytics-event-contract.ts", "src/lib/telemetry-catalog.ts"],
    consumerHints: ["src/lib/analytics", "src/app/api/admin", "docs/agent-truth"],
  },
  admin: {
    tokens: ["adminId", "owner_admin", "admin"],
    sourceHints: ["src/lib/analytics/analytics-event-contract.ts", "src/app/api/admin"],
    consumerHints: ["src/app/api/admin", "src/lib/analytics", "docs/agent-truth"],
  },
  system: {
    tokens: ["system", "system_job", "source: \"system"],
    sourceHints: ["src/lib/analytics/analytics-event-contract.ts", "functions/src"],
    consumerHints: ["src/app/api/admin", "src/lib/analytics", "docs/agent-truth"],
  },
  unknown: {
    tokens: ["unknown", "No trusted actor", "actorType"],
    sourceHints: ["src/lib/analytics/analytics-event-contract.ts"],
    consumerHints: ["src/app/api/admin", "src/lib/analytics", "docs/agent-truth"],
  },
};

export const PRIVACY_MODES: PrivacyMode[] = [
  {
    modeKey: "required_operational",
    allowedWhenPrivacyOff: true,
    allowedDestinations: ["first-party operational ledger", "security/debug evidence", "support recovery records"],
    forbiddenDestinations: ["ads personalization", "cross-site marketing", "session replay for behavior profiling"],
    examples: [
      "payment/refill integrity",
      "unlock/entitlement integrity",
      "abuse/security/rate limit",
      "error diagnostics",
      "support recovery",
      "consent records",
    ],
    requiredLabels: ["required_operational", "purpose-labeled", "minimized", "retention-limited"],
    retentionExpectation: "Retention-limited to service, security, support, or legal necessity.",
    notes: ["Privacy-off does not mean the product records no operational facts."],
  },
  {
    modeKey: "limited_consent_off_measurement",
    allowedWhenPrivacyOff: true,
    allowedDestinations: ["first-party/publisher measurement", "aggregate technical performance snapshots"],
    forbiddenDestinations: [
      "cross-site tracking",
      "ads or marketing personalization",
      "identity-tied session replay",
      "vendor behavioral profiling unless explicitly configured and labeled for limited measurement",
    ],
    examples: ["aggregate performance", "navigation issue detection", "capacity/technical optimization"],
    requiredLabels: ["limited_measurement", "aggregate_or_minimized", "no_ads", "no_cross_site_tracking"],
    retentionExpectation: "Short, aggregate, or minimized retention aligned to technical measurement.",
    notes: ["Allowed only when configured and documented to meet applicable consent-exemption rules."],
  },
  {
    modeKey: "optional_analytics_personalization",
    allowedWhenPrivacyOff: false,
    allowedDestinations: ["consented analytics", "consented personalization", "consented vendor measurement"],
    forbiddenDestinations: ["privacy-off users", "denied-consent identity graphs", "unlabeled vendor behavioral exports"],
    examples: ["optional GA4/PostHog analytics", "session replay", "personalized behavioral tracking", "marketing-style analytics"],
    requiredLabels: ["consent_required", "optional", "personalization_or_vendor"],
    retentionExpectation: "Only after consent/opt-in and according to privacy policy.",
    notes: ["Privacy-off must block optional analytics and personalization."],
  },
];

export const RAW_LEDGER_RULES: RawLedgerRule[] = [
  {
    ruleKey: "canonical-event-shape",
    appliesTo: ["analytics_event_facts", "behavioral_timeline_facts", "recovered legacy candidates"],
    requiredFields: ["eventId", "eventName", "occurredAt", "receivedAt", "actorType", "source", "consentState", "dedupeKey"],
    recommendedFields: ["eventVersion", "schemaVersion", "sourceConfidence", "sourceReliability"],
    forbiddenConfusions: ["raw event count as unique user count", "raw event ratio as ordered funnel", "telemetry event as entitlement truth"],
    validators: ["npm run check:analytics-event-contract", "npm run check:event-fact-truth"],
    recommendedAction: "Keep raw facts as product behavior inputs and require snapshots/indexes for display metrics.",
  },
  {
    ruleKey: "actor-target-separation",
    appliesTo: ["analytics_event_facts", "identity_linked", "creator/user/admin events"],
    requiredFields: ["actorType", "userId", "creatorId", "adminId", "target/object fields"],
    recommendedFields: ["targetUserId", "targetCreatorId", "objectType", "objectId", "performedAs"],
    forbiddenConfusions: ["target_creator_id forcing actorType=creator", "admin projection as user behavior", "creator operations as fan behavior"],
    validators: ["npm run check:analytics-event-contract", "npm run check:admin-projection-analytics-exclusion"],
    recommendedAction: "Preserve actor lane first, then attach target/object context.",
  },
  {
    ruleKey: "identity-lineage-preservation",
    appliesTo: ["analytics_identity_links", "identity_linked", "guest_tracking_indexes", "user_journey_indexes"],
    requiredFields: ["anonymousVisitorId", "sessionId", "userId", "occurredAt", "source", "consentState"],
    recommendedFields: ["linkMethod", "eligiblePastSessionIds", "legacyConfidence", "mappingWarnings"],
    forbiddenConfusions: ["rewriting old guest facts into user facts", "reviving denied-consent history", "dropping original guest/session lineage"],
    validators: ["npm run check:guest-user-analytics", "npm run check:identity-link-continuity"],
    recommendedAction: "Use links as relationship evidence and keep old facts in their original actor lane.",
  },
  {
    ruleKey: "legacy-recovery-marking",
    appliesTo: ["analytics_legacy_recovered_events", "legacy field mappers", "dry-run recovery snapshots"],
    requiredFields: ["legacySource", "legacyConfidence", "mappingWarnings", "source", "consentState"],
    recommendedFields: ["legacyId", "selectedRange", "sourcePath", "sourceConfidence"],
    forbiddenConfusions: ["legacy-derived record as current server-confirmed event", "silent overwrite of stronger canonical facts"],
    validators: ["npm run check:analytics-legacy-recovery", "npm run check:analytics-rewire-phase-one"],
    recommendedAction: "Keep legacy recovery as dry-run/debug evidence until a reviewed backfill plan exists.",
  },
];

const RECOVERY_ELIGIBILITY_SEEDS: Array<Omit<RecoveryEligibility, "confidence"> & { sourceKeys: string[]; fallbackConfidence: RecoveryEligibility["confidence"] }> = [
  {
    laneKey: "analytics_identity_links",
    sourcePath: "analytics_identity_links",
    identityKeys: ["anonymousVisitorId", "sessionId", "userId"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    fallbackConfidence: "high",
    recommendedAction: "Use in Debug first to prove guest-to-user lineage before Admin Analytics journey recovery.",
    sourceKeys: ["identity_links", "analytics_identity_links"],
  },
  {
    laneKey: "guest_tracking_indexes",
    sourcePath: "guest_tracking_indexes",
    identityKeys: ["anonymousVisitorId", "sessionId"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    fallbackConfidence: "high",
    recommendedAction: "Use as guest continuity read model after consent-aware lineage checks.",
    sourceKeys: ["guest_tracking_indexes"],
  },
  {
    laneKey: "user_journey_indexes",
    sourcePath: "user_journey_indexes",
    identityKeys: ["userId", "anonymousVisitorId", "sessionId"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    fallbackConfidence: "high",
    recommendedAction: "Keep Debug-only until journey metrics prove actor/consent-safe derivation.",
    sourceKeys: ["user_journey_indexes"],
  },
  {
    laneKey: "behavioral_timeline_facts",
    sourcePath: "behavioral_timeline_facts",
    identityKeys: ["actorType", "anonymousVisitorId", "sessionId", "userId"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    fallbackConfidence: "high",
    recommendedAction: "Use as raw behavior spine only through indexes/snapshots with consent labels.",
    sourceKeys: ["behavioral_timeline_facts"],
  },
  {
    laneKey: "analytics_watch_sessions",
    sourcePath: "analytics_watch_sessions",
    identityKeys: ["sessionId", "anonymousVisitorId", "userId"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: true,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    fallbackConfidence: "medium",
    recommendedAction: "Surface through watch-session rollups, not page-duration fallbacks.",
    sourceKeys: ["analytics_watch_sessions", "analytics_watch_assets"],
  },
  {
    laneKey: "notification_facts",
    sourcePath: "notification records / user_notification_indexes",
    identityKeys: ["userId", "sessionId"],
    consentRequirement: "required_operational_only",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: false,
    fallbackConfidence: "medium",
    recommendedAction: "Keep delivery/support diagnostics Debug-first and avoid optional engagement profiling when privacy-off.",
    sourceKeys: ["notification_facts", "user_notification_indexes"],
  },
  {
    laneKey: "support_recovery_facts",
    sourcePath: "support / platform_feedback / recovery records",
    identityKeys: ["userId", "sessionId", "supportThreadId"],
    consentRequirement: "required_operational_only",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: false,
    fallbackConfidence: "medium",
    recommendedAction: "Use for support recovery and Debug evidence, not behavioral personalization.",
    sourceKeys: ["support_recovery_facts", "platform_feedback"],
  },
  {
    laneKey: "purchase_facts",
    sourcePath: "transactions / analytics_commerce_rollup",
    identityKeys: ["userId", "transactionId"],
    consentRequirement: "required_operational_only",
    canSurfaceInAdminAnalytics: true,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    fallbackConfidence: "high",
    recommendedAction: "Commerce truth can surface as operational purchase metrics; GA ecommerce remains evidence only.",
    sourceKeys: ["purchase_facts"],
  },
  {
    laneKey: "unlock_facts",
    sourcePath: "unlock / entitlement / GumDrop ledger facts",
    identityKeys: ["userId", "dropId", "entitlementId"],
    consentRequirement: "required_operational_only",
    canSurfaceInAdminAnalytics: true,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    fallbackConfidence: "high",
    recommendedAction: "Unlock truth can surface through entitlement-backed snapshots only.",
    sourceKeys: ["unlock_facts"],
  },
  {
    laneKey: "analytics_legacy_recovered_events",
    sourcePath: "analytics_legacy_recovered_events",
    identityKeys: ["legacyId", "anonymousVisitorId", "sessionId", "userId"],
    consentRequirement: "needs_review",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: false,
    fallbackConfidence: "unknown",
    recommendedAction: "Keep dry-run/debug only until consent and mapping confidence are reviewed.",
    sourceKeys: ["analytics_legacy_recovered_events"],
  },
  {
    laneKey: "analytics_pipeline_daily",
    sourcePath: "analytics_pipeline_daily",
    identityKeys: ["date", "pipelineKey"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: false,
    fallbackConfidence: "medium",
    recommendedAction: "Use as pipeline health evidence, not user behavior truth.",
    sourceKeys: ["analytics_pipeline_daily"],
  },
  {
    laneKey: "analytics_export_status",
    sourcePath: "analytics_export_status",
    identityKeys: ["exportKey", "date"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: false,
    fallbackConfidence: "medium",
    recommendedAction: "Use as BigQuery/export health evidence only.",
    sourceKeys: ["analytics_export_status"],
  },
];

function normalizeRepoPath(value: string) {
  return value.replace(/\\/gu, "/");
}

function currentHead(root: string) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

function listTrackedFiles(root: string) {
  try {
    return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .split(/\r?\n/u)
      .map((entry) => normalizeRepoPath(entry.trim()))
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
}

function readText(root: string, repoPath: string) {
  const cacheKey = `${root}\u0000${repoPath}`;
  const cached = sourceCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const absolutePath = path.join(root, repoPath);
  const source = existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
  sourceCache.set(cacheKey, source);
  return source;
}

function readJson<T>(root: string, repoPath: string): T | null {
  try {
    const source = readText(root, repoPath);
    return source ? JSON.parse(source) as T : null;
  } catch {
    return null;
  }
}

function includesAny(source: string, tokens: readonly string[]) {
  const lower = source.toLowerCase();
  return tokens.some((token) => lower.includes(token.toLowerCase()));
}

function findFiles(root: string, files: string[], tokens: readonly string[], hints: readonly string[]) {
  return files
    .filter((repoPath) => hints.some((hint) => repoPath === hint || repoPath.startsWith(normalizeRepoPath(hint).replace(/\/?$/u, "/"))))
    .filter((repoPath) => /\.(?:ts|tsx|js|jsx|mjs|cjs|json|md)$/u.test(repoPath))
    .filter((repoPath) => includesAny(readText(root, repoPath), tokens))
    .slice(0, 6);
}

function sourceInventorySummary(phaseOne: PhaseOneReport | null): SourceInventoryReportSummary {
  return {
    path: SOURCE_INVENTORY_REPORT_PATH,
    generatedAtUtc: phaseOne?.generatedAtUtc,
    currentHead: phaseOne?.currentHead,
    laneCount: phaseOne?.summary?.laneCount,
    issueCount: phaseOne?.summary?.issueCount,
    orphanCandidateCount: phaseOne?.summary?.orphanCandidateCount,
  };
}

function buildIdentityLanes(root: string, files: string[]) {
  return REQUIRED_ACTOR_LANES.map<IdentityLane>((actorType) => {
    const hint = IDENTITY_HINTS[actorType];
    const keysByActor: Record<ActorLane, { canonical: string[]; fallback: string[] }> = {
      guest: { canonical: ["anonymousVisitorId"], fallback: ["sessionId", "kandy_session_id"] },
      anonymous_visitor: { canonical: ["anonymousVisitorId"], fallback: ["subject_*", "anon_*"] },
      session: { canonical: ["sessionId"], fallback: ["kandy_session_id", "serverSessionKey"] },
      authenticated_user: { canonical: ["userId"], fallback: ["identity_linked", "analytics_identity_links"] },
      creator: { canonical: ["creatorId"], fallback: ["targetCreatorId"] },
      admin: { canonical: ["adminId"], fallback: ["actorAdminId", "owner_admin"] },
      system: { canonical: ["systemActor", "source"], fallback: ["system_job"] },
      unknown: { canonical: ["actorType=unknown"], fallback: ["unclassified source evidence"] },
    };

    return {
      laneKey: `${actorType}_identity_lane`,
      actorType,
      canonicalKeys: keysByActor[actorType].canonical,
      fallbackKeys: keysByActor[actorType].fallback,
      mustPreserveHistory: actorType === "guest" || actorType === "anonymous_visitor" || actorType === "session" || actorType === "authenticated_user",
      mustNotRewriteOldFacts: true,
      sourceFiles: findFiles(root, files, hint.tokens, hint.sourceHints),
      consumerFiles: findFiles(root, files, hint.tokens, hint.consumerHints),
      recommendedOwner: actorType === "admin" || actorType === "system" ? "admin/debug actor separation" : "identity graph",
      recommendedAction: actorType === "creator"
        ? "Keep creator operations separate from fan behavior unless the module explicitly labels a creator/fan comparison."
        : actorType === "admin" || actorType === "system"
          ? "Exclude from ordinary user/guest behavior by default and expose excluded lane counts in Debug."
          : "Preserve actor lineage and use links/indexes without rewriting older facts.",
    };
  });
}

function mapRecoveryConfidence(seed: typeof RECOVERY_ELIGIBILITY_SEEDS[number], phaseOne: PhaseOneReport | null) {
  const orphan = phaseOne?.orphanCandidates?.find((candidate) => seed.sourceKeys.includes(candidate.key ?? "") || seed.sourceKeys.includes(candidate.writtenPath ?? ""));
  const lane = phaseOne?.lanes?.find((entry) => seed.sourceKeys.includes(entry.laneKey ?? "") || (entry.collectionsOrPaths ?? []).some((sourcePath) => seed.sourceKeys.includes(sourcePath)));
  return orphan?.recoveryValue ?? (lane ? seed.fallbackConfidence : "unknown");
}

function buildRecoveryEligibility(phaseOne: PhaseOneReport | null): RecoveryEligibility[] {
  return RECOVERY_ELIGIBILITY_SEEDS.map(({ sourceKeys: _sourceKeys, fallbackConfidence: _fallbackConfidence, ...seed }) => ({
    ...seed,
    confidence: mapRecoveryConfidence({ ...seed, sourceKeys: _sourceKeys, fallbackConfidence: _fallbackConfidence }, phaseOne),
  }));
}

function buildIssues(root: string, phaseOne: PhaseOneReport | null): IdentityPrivacyRawLedgerIssue[] {
  const docsToScan = [
    "docs/agent-truth/analytics-truth-layer-v2.md",
    "docs/agent-truth/analytics-rewire-phase-one.md",
    "docs/agent-truth/guest-user-analytics-cutover.md",
  ];
  const combinedDocs = docsToScan.map((repoPath) => readText(root, repoPath)).join("\n").toLowerCase();
  const issues: IdentityPrivacyRawLedgerIssue[] = [];

  if (PRIVACY_OFF_BOUNDARY_RULE.forbiddenClaims.some((claim) => combinedDocs.includes(claim))) {
    issues.push({
      issueKey: "privacy-off-doctrine-ambiguous",
      severity: "P0",
      title: "Privacy-off doctrine uses an unsafe all-or-nothing claim",
      description: "Privacy-off must not mean collect nothing, and must not allow all analytics.",
      files: docsToScan,
      blocksRecovery: true,
      blocksPhaseOneFreeze: true,
      recommendedAction: "Replace all-or-nothing privacy wording with the three-mode measurement model.",
    });
  }

  const analyticsContract = readText(root, "src/lib/analytics/analytics-event-contract.ts");
  if (!analyticsContract.includes("targetCreatorId") || !analyticsContract.includes("actorType")) {
    issues.push({
      issueKey: "actor-target-separation-contract-gap",
      severity: "P1",
      title: "Actor/target separation needs validator coverage",
      description: "Target ids must not force actor classification. The runtime contract should keep actor and target fields separate.",
      files: ["src/lib/analytics/analytics-event-contract.ts"],
      blocksRecovery: true,
      blocksPhaseOneFreeze: false,
      recommendedAction: "Later runtime work should strengthen actor/target validation before recovery backfill.",
    });
  }

  if (!combinedDocs.includes("pseudonymous")) {
    issues.push({
      issueKey: "pseudonymous-identity-label-missing",
      severity: "P1",
      title: "Pseudonymous identity labels need broader doctrine coverage",
      description: "subject_*, anon_*, session ids, anonymousVisitorId, and kandy_session_id must be treated as pseudonymous identifiers, not fully anonymous data.",
      files: docsToScan,
      blocksRecovery: true,
      blocksPhaseOneFreeze: false,
      recommendedAction: "Use the Prompt 2 doctrine as the owner for pseudonymous identity language.",
    });
  }

  const phaseOneHead = phaseOne?.currentHead;
  const head = currentHead(root);
  if (phaseOneHead && head && phaseOneHead !== head) {
    issues.push({
      issueKey: "source-inventory-head-mismatch",
      severity: "P1",
      title: "Source inventory report HEAD differs from current HEAD",
      description: `Phase One report currentHead=${phaseOneHead}; current HEAD=${head}.`,
      files: [SOURCE_INVENTORY_REPORT_PATH],
      blocksRecovery: false,
      blocksPhaseOneFreeze: false,
      recommendedAction: "Refresh npm run check:analytics-rewire-phase-one before using it for implementation choices.",
    });
  }

  issues.push({
    issueKey: "recovery-eligibility-debug-first",
    severity: "P2",
    title: "Recovery candidates must stay Debug-first until consent and identity rules are proven",
    description: "Prompt 2 defines eligibility only. No production backfill or Admin Analytics surfacing is approved yet.",
    files: [SOURCE_INVENTORY_REPORT_PATH, "docs/agent-truth/identity-privacy-raw-ledger-rewire.md"],
    blocksRecovery: false,
    blocksPhaseOneFreeze: false,
    recommendedAction: "Use a dry-run recovery inventory before any materialized recovery snapshot.",
  });

  issues.push({
    issueKey: "raw-ledger-contract-foundation-only",
    severity: "P2",
    title: "Raw ledger contract is a foundation, not a runtime pass/fail gate yet",
    description: "The repo may not have every recommended raw ledger field on every writer. Later runtime phases must fix gaps deliberately.",
    files: ["src/lib/analytics/analytics-event-contract.ts", "docs/agent-truth/identity-privacy-raw-ledger-rewire.md"],
    blocksRecovery: false,
    blocksPhaseOneFreeze: false,
    recommendedAction: "Record gaps in validators first, then patch emitters/routes in narrow runtime phases.",
  });

  return issues;
}

function countIssues(issues: IdentityPrivacyRawLedgerIssue[], severity: RewireSeverity) {
  return issues.filter((issue) => issue.severity === severity).length;
}

export function buildIdentityPrivacyRawLedgerReport(options: BuildOptions = {}): IdentityPrivacyRawLedgerReport {
  const root = options.root ?? process.cwd();
  const now = options.now ?? new Date();
  const files = listTrackedFiles(root);
  const phaseOne = readJson<PhaseOneReport>(root, SOURCE_INVENTORY_REPORT_PATH);
  const identityLanes = buildIdentityLanes(root, files);
  const recoveryEligibility = buildRecoveryEligibility(phaseOne);
  const issues = buildIssues(root, phaseOne);

  return {
    generatedAtUtc: now.toISOString(),
    reportKey: IDENTITY_PRIVACY_RAW_LEDGER_REPORT_KEY,
    currentHead: currentHead(root),
    sourceInventoryReport: sourceInventorySummary(phaseOne),
    phasesCovered: [
      "3. Identity Graph Consolidation",
      "4. Privacy, Consent, Data Rights, And Privacy-Off Measurement Gate",
      "5. Raw Ledger Consolidation",
      "6. Legacy Recovery Mapper Eligibility Scaffolding",
    ],
    summary: {
      identityLaneCount: identityLanes.length,
      privacyRuleCount: PRIVACY_MODES.length,
      rawLedgerRuleCount: RAW_LEDGER_RULES.length,
      recoveryEligibilityRuleCount: recoveryEligibility.length,
      issueCount: issues.length,
      p0Count: countIssues(issues, "P0"),
      p1Count: countIssues(issues, "P1"),
      consentOffModeIssues: issues.filter((issue) => issue.issueKey.includes("privacy-off") || issue.issueKey.includes("consent")).length,
      pseudonymousIdentityIssues: issues.filter((issue) => issue.issueKey.includes("pseudonymous")).length,
      rawLedgerContractIssues: issues.filter((issue) => issue.issueKey.includes("raw-ledger")).length,
      recoveryEligibilityIssues: issues.filter((issue) => issue.issueKey.includes("recovery")).length,
    },
    identityLanes,
    privacyModes: PRIVACY_MODES,
    rawLedgerRules: RAW_LEDGER_RULES,
    recoveryEligibility,
    issues,
  };
}

export function validateIdentityPrivacyRawLedgerReport(report: IdentityPrivacyRawLedgerReport) {
  const failures: string[] = [];
  if (report.reportKey !== IDENTITY_PRIVACY_RAW_LEDGER_REPORT_KEY) failures.push("reportKey is incorrect.");
  if (!report.generatedAtUtc || Number.isNaN(Date.parse(report.generatedAtUtc))) failures.push("generatedAtUtc must be parseable.");
  if (!Array.isArray(report.phasesCovered) || report.phasesCovered.length < 4) failures.push("phasesCovered is incomplete.");
  if (!report.sourceInventoryReport || report.sourceInventoryReport.path !== SOURCE_INVENTORY_REPORT_PATH) failures.push("sourceInventoryReport is missing.");

  const actorTypes = new Set(report.identityLanes?.map((lane) => lane.actorType));
  for (const actor of REQUIRED_ACTOR_LANES) {
    if (!actorTypes.has(actor)) failures.push(`missing actor lane: ${actor}`);
  }

  const modes = new Map(report.privacyModes?.map((mode) => [mode.modeKey, mode]));
  for (const mode of ["required_operational", "limited_consent_off_measurement", "optional_analytics_personalization"] as const) {
    if (!modes.has(mode)) failures.push(`missing privacy mode: ${mode}`);
  }
  if (modes.get("required_operational")?.allowedWhenPrivacyOff !== true) failures.push("required_operational must be allowed when privacy is off.");
  if (modes.get("limited_consent_off_measurement")?.allowedWhenPrivacyOff !== true) failures.push("limited_consent_off_measurement must be separately modeled.");
  if (modes.get("optional_analytics_personalization")?.allowedWhenPrivacyOff !== false) failures.push("optional analytics/personalization must be blocked when privacy is off.");

  const rawRuleFields = new Set(report.rawLedgerRules?.flatMap((rule) => [...rule.requiredFields, ...rule.recommendedFields]));
  for (const field of [
    "eventId",
    "eventName",
    "occurredAt",
    "receivedAt",
    "actorType",
    "anonymousVisitorId",
    "sessionId",
    "userId",
    "creatorId",
    "adminId",
    "consentState",
    "dedupeKey",
    "legacySource",
    "legacyConfidence",
    "mappingWarnings",
  ]) {
    if (!rawRuleFields.has(field)) failures.push(`raw ledger field missing: ${field}`);
  }

  if (!report.rawLedgerRules?.some((rule) => rule.forbiddenConfusions.some((confusion) => confusion.includes("target_creator_id")))) {
    failures.push("target id actor-classification confusion rule is missing.");
  }
  if (!report.rawLedgerRules?.some((rule) => rule.forbiddenConfusions.some((confusion) => confusion.includes("rewriting old guest facts")))) {
    failures.push("identity lineage no-rewrite rule is missing.");
  }

  for (const item of report.recoveryEligibility ?? []) {
    if (!item.laneKey || !item.sourcePath) failures.push("recovery eligibility item missing laneKey/sourcePath.");
    if (!item.consentRequirement) failures.push(`${item.laneKey} is missing consentRequirement.`);
    if (typeof item.canSurfaceInAdminAnalytics !== "boolean") failures.push(`${item.laneKey} is missing canSurfaceInAdminAnalytics.`);
    if (typeof item.canSurfaceInAdminDebug !== "boolean") failures.push(`${item.laneKey} is missing canSurfaceInAdminDebug.`);
  }

  for (const lane of report.identityLanes ?? []) {
    if (!lane.recommendedOwner) failures.push(`${lane.actorType} is missing recommendedOwner.`);
    if (lane.mustNotRewriteOldFacts !== true) failures.push(`${lane.actorType} must preserve no-rewrite history rule.`);
  }

  if (report.summary.identityLaneCount !== report.identityLanes.length) failures.push("summary.identityLaneCount mismatch.");
  if (report.summary.privacyRuleCount !== report.privacyModes.length) failures.push("summary.privacyRuleCount mismatch.");
  if (report.summary.rawLedgerRuleCount !== report.rawLedgerRules.length) failures.push("summary.rawLedgerRuleCount mismatch.");
  if (report.summary.recoveryEligibilityRuleCount !== report.recoveryEligibility.length) failures.push("summary.recoveryEligibilityRuleCount mismatch.");
  if (report.summary.issueCount !== report.issues.length) failures.push("summary.issueCount mismatch.");

  return failures;
}

export function writeIdentityPrivacyRawLedgerReport(report: IdentityPrivacyRawLedgerReport, root = process.cwd()) {
  const absolutePath = path.join(root, IDENTITY_PRIVACY_RAW_LEDGER_REPORT_PATH);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

