import { existsSync } from "node:fs";

import { ROOT, readText, writeJsonFile } from "./shared";

type Severity = "info" | "moderate" | "major" | "critical";

type Finding = {
  id: string;
  severity: Severity;
  title: string;
  filePath: string;
  evidence: string[];
  suggestedFix: string;
};

type DomainScore = {
  key: string;
  label: string;
  weight: number;
  score: number;
  status: "pass" | "warning" | "fail";
};

export type TelemetryIdentifiedParityReport = {
  generatedAt: string;
  overallScore: number;
  status: "pass" | "warning" | "fail";
  criticalFail: boolean;
  domainScores: DomainScore[];
  findings: Finding[];
  criticalFindings: Finding[];
  missingExpectedEvents: string[];
  unsupportedEventNotes: string[];
  commandBudget: {
    allowed: string[];
    forbidden: string[];
  };
};

const REPORT_PATH = "agent/state/telemetry-identified-parity.generated.json";

function makeFinding(input: Omit<Finding, "id">): Finding {
  return {
    ...input,
    id: `${input.filePath}:${input.title}`.toLowerCase().replace(/[^a-z0-9:/._-]+/g, "_"),
  };
}

function has(source: string, value: string) {
  return source.includes(value);
}

function read(repoPath: string) {
  return existsSync(`${ROOT}/${repoPath}`) ? readText(repoPath) : "";
}

export function buildTelemetryIdentifiedParityReport(): TelemetryIdentifiedParityReport {
  const contract = read("src/lib/analytics/analytics-event-contract.ts");
  const ingest = read("src/app/api/analytics/ingest-identified/route.ts");
  const telemetry = read("src/lib/telemetry.ts");
  const authModal = read("src/components/Auth/AuthModal.tsx");
  const authContext = read("src/context/AuthContext.tsx");
  const normalizer = read("src/lib/behavioral/event-fact-normalizer.ts");
  const parity = read("src/lib/behavioral/identified-metric-parity.ts");
  const metrics = read("src/lib/server/analytics-metrics.ts");
  const eventFact = read("src/lib/behavioral/normalize-event-fact.ts");
  const catalog = read("src/lib/telemetry-catalog.ts");

  const findings: Finding[] = [];

  const actorTargetChecks = [
    has(contract, "const isCreator =") && !has(contract, "Boolean(stringOrNull(input.creatorId))"),
    has(normalizer, "targetCreatorId"),
    has(normalizer, "actorCreatorId"),
    has(ingest, "targetCreatorId: parityFact.targetCreatorId"),
  ];
  if (actorTargetChecks.includes(false)) {
    findings.push(makeFinding({
      severity: "critical",
      title: "Actor-target separation is incomplete",
      filePath: "src/lib/analytics/analytics-event-contract.ts",
      evidence: ["creator target ids must not force creator actor classification"],
      suggestedFix: "Separate actor creator ids from target creator ids in the parity normalizer and actor classifier.",
    }));
  }

  const serverTruthChecks = [
    has(ingest, 'canonicalEventName === "gumdrops_purchase_completed"') || has(ingest, 'canonicalEventName === "purchase_verified"'),
    has(ingest, 'canonicalEventName === "unlock_drop_success"'),
    has(ingest, 'canonicalEventName.startsWith("watch_session_")'),
    has(metrics, "watch_session_rollup"),
    has(metrics, "legacy_page_duration"),
  ];
  if (serverTruthChecks.includes(false)) {
    findings.push(makeFinding({
      severity: "critical",
      title: "Server truth priority is incomplete",
      filePath: "src/app/api/analytics/ingest-identified/route.ts",
      evidence: ["purchase/unlock/watch should be canonical or server-first"],
      suggestedFix: "Promote transaction, entitlement, and watch-session sources above client telemetry for identified metrics.",
    }));
  }

  const identityChecks = [
    has(telemetry, "export function trackIdentityLinked"),
    has(authModal, "trackIdentityLinked"),
    has(authContext, 'method: "session_restore"'),
  ];
  if (identityChecks.includes(false)) {
    findings.push(makeFinding({
      severity: "critical",
      title: "identity_linked emission is incomplete",
      filePath: "src/lib/telemetry.ts",
      evidence: ["identity_linked must be emitted on signup, login, and session restore"],
      suggestedFix: "Emit identity_linked from the canonical auth flows and preserve privacy-limited linkage state.",
    }));
  }

  const normalizationChecks = [
    has(normalizer, "metricFamily"),
    has(normalizer, "sourceConfidence"),
    has(normalizer, "metricEligible"),
    has(ingest, "metricFamily: parityFact.metricFamily"),
    has(ingest, "sourceTruth: parityFact.sourceTruth"),
  ];
  if (normalizationChecks.includes(false)) {
    findings.push(makeFinding({
      severity: "major",
      title: "Identified event-fact normalization fields are incomplete",
      filePath: "src/lib/behavioral/event-fact-normalizer.ts",
      evidence: ["normalizedAction/metricFamily/sourceTruth/sourceConfidence/metricEligible"],
      suggestedFix: "Persist the full parity fact projection into identified analytics facts.",
    }));
  }

  const watchNotificationTaskChecks = [
    has(eventFact, "daily_checkin_claimed"),
    has(catalog, 'aliases: ["daily_check_in_claim", "daily_reward_claimed"]'),
    has(eventFact, "notification_read"),
    has(eventFact, "notifications_dropdown_opened"),
  ];
  if (watchNotificationTaskChecks.includes(false)) {
    findings.push(makeFinding({
      severity: "major",
      title: "Task or notification alias parity is incomplete",
      filePath: "src/lib/behavioral/normalize-event-fact.ts",
      evidence: ["daily check-in aliases and notification read canonicalization"],
      suggestedFix: "Normalize daily check-in aliases and treat notification read as the only scored notification action.",
    }));
  }

  const activeUserChecks = [
    has(parity, "lastMeaningfulActionAt"),
    has(parity, "lastCommerceActionAt"),
    has(parity, "lastContentActionAt"),
    has(parity, "lastWatchActionAt"),
    has(ingest, "buildIdentifiedActiveUserPatch"),
  ];
  if (activeUserChecks.includes(false)) {
    findings.push(makeFinding({
      severity: "major",
      title: "Active user meaningful-action split is incomplete",
      filePath: "src/lib/behavioral/identified-metric-parity.ts",
      evidence: ["lastSeenAt must be split from meaningful action timestamps"],
      suggestedFix: "Build active-user patches from parity facts instead of low-value last-seen writes.",
    }));
  }

  const consentChecks = [
    has(telemetry, 'privacy_exclusion_reason: allowIdentifiedAnalytics ? "" : "privacy_limited"'),
    has(normalizer, '"privacy_limited"'),
    has(parity, "metricExclusionReason"),
  ];
  if (consentChecks.includes(false)) {
    findings.push(makeFinding({
      severity: "moderate",
      title: "Consent exclusion clarity is incomplete",
      filePath: "src/lib/telemetry.ts",
      evidence: ["privacy-limited identified data should not be labeled as broken"],
      suggestedFix: "Record privacy-limited exclusion reasons in identity-link and event-fact parity paths.",
    }));
  }

  const missingExpectedEvents: string[] = [];
  if (!has(catalog, 'eventName: "identity_linked"')) missingExpectedEvents.push("identity_linked");
  if (!has(catalog, 'eventName: "notification_read"')) missingExpectedEvents.push("notification_read");
  if (!has(catalog, 'eventName: "daily_checkin_claimed"')) missingExpectedEvents.push("daily_checkin_claimed");

  const unsupportedEventNotes = has(ingest, "skippedUnsupportedEventNames")
    ? ["Unsupported identified events are explicitly reported before analytics fact writes."]
    : ["Unsupported identified events are not explicitly reported."];

  const domains: DomainScore[] = [
    { key: "actor_target", label: "Actor/Target Separation", weight: 20, score: actorTargetChecks.every(Boolean) ? 20 : 0, status: actorTargetChecks.every(Boolean) ? "pass" : "fail" },
    { key: "server_truth", label: "Server Truth Priority", weight: 20, score: serverTruthChecks.every(Boolean) ? 20 : 0, status: serverTruthChecks.every(Boolean) ? "pass" : "fail" },
    { key: "identity_linking", label: "Identity Linking", weight: 15, score: identityChecks.every(Boolean) ? 15 : 0, status: identityChecks.every(Boolean) ? "pass" : "fail" },
    { key: "normalization", label: "Event Fact Normalization", weight: 15, score: normalizationChecks.every(Boolean) ? 15 : 6, status: normalizationChecks.every(Boolean) ? "pass" : "warning" },
    { key: "watch_notification_task", label: "Watch/Notification/Task Parity", weight: 15, score: watchNotificationTaskChecks.every(Boolean) ? 15 : 7, status: watchNotificationTaskChecks.every(Boolean) ? "pass" : "warning" },
    { key: "active_user_split", label: "Active User Meaningful Split", weight: 10, score: activeUserChecks.every(Boolean) ? 10 : 4, status: activeUserChecks.every(Boolean) ? "pass" : "warning" },
    { key: "consent_clarity", label: "Consent/Exclusion Clarity", weight: 5, score: consentChecks.every(Boolean) ? 5 : 2, status: consentChecks.every(Boolean) ? "pass" : "warning" },
  ];

  const criticalFindings = findings.filter((finding) => finding.severity === "critical");
  const overallScore = Math.max(0, domains.reduce((sum, domain) => sum + domain.score, 0));

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    status: criticalFindings.length > 0 ? "fail" : overallScore >= 90 ? "pass" : "warning",
    criticalFail: criticalFindings.length > 0 || missingExpectedEvents.includes("identity_linked"),
    domainScores: domains,
    findings,
    criticalFindings,
    missingExpectedEvents,
    unsupportedEventNotes,
    commandBudget: {
      allowed: [
        "npm run score:telemetry-identified-parity",
        "npm run check:telemetry-identified-parity",
        "npm run typecheck",
      ],
      forbidden: [
        "npm run check",
        "playwright",
        "cypress",
        "lighthouse",
      ],
    },
  };
}

const report = buildTelemetryIdentifiedParityReport();
writeJsonFile(REPORT_PATH, report);

console.log(`Telemetry identified parity: ${report.overallScore}/100 (${report.status})`);
for (const domain of report.domainScores) {
  console.log(`- ${domain.label}: ${domain.score}/${domain.weight} (${domain.status})`);
}
