import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ANALYTICS_INGEST_CONTRACT,
  ANALYTICS_INGEST_EVENT_TYPES,
  ANALYTICS_INGEST_FIRESTORE_COLLECTIONS,
  validateAnalyticsIngestContractClosure,
} from "../../src/lib/analytics/ingest-contract";

type Severity = "P0" | "P1" | "P2";

type FindingStatus = "fixed" | "missing" | "deferred";

type Finding = {
  id: string;
  status: FindingStatus;
  severity: Severity;
  detail: string;
};

type AnalyticsIngestFirestoreClosureReport = {
  generatedAtUtc: string;
  reportKey: "analytics-ingest-firestore-closure";
  currentHead: string;
  summary: {
    ingestContractCreated: boolean;
    acceptedEventsMapped: boolean;
    failureRetryabilityExplicit: boolean;
    firestoreDestinationsCentralized: boolean;
    dedupeRulesCentralized: boolean;
    diagnosticsSampled: boolean;
    telemetryGraphReused: boolean;
    clientTrackingPolicyPresent: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  dependencyFindings: Finding[];
  contractFindings: Finding[];
  routeFindings: Finding[];
  firestoreFindings: Finding[];
  retryabilityFindings: Finding[];
  diagnosticsFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/analytics-ingest-firestore-closure.generated.json";
const docsRelativePath = "docs/agent-truth/analytics-ingest-firestore-closure.md";

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function has(relativePath: string) {
  return existsSync(join(repoRoot, relativePath));
}

function finding(id: string, ok: boolean, detail: string, severity: Severity = "P1"): Finding {
  return {
    id,
    status: ok ? "fixed" : "missing",
    severity,
    detail,
  };
}

function deferred(id: string, detail: string, severity: Severity = "P2"): Finding {
  return {
    id,
    status: "deferred",
    severity,
    detail,
  };
}

function countBlocking(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.status === "missing" && entry.severity === severity).length;
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(report: AnalyticsIngestFirestoreClosureReport) {
  const lines = [
    "# Analytics Ingest Firestore Closure",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Ingest contract created: ${report.summary.ingestContractCreated ? "yes" : "no"}`,
    `- Accepted events mapped: ${report.summary.acceptedEventsMapped ? "yes" : "no"}`,
    `- Failure retryability explicit: ${report.summary.failureRetryabilityExplicit ? "yes" : "no"}`,
    `- Firestore destinations centralized: ${report.summary.firestoreDestinationsCentralized ? "yes" : "no"}`,
    `- Dedupe rules centralized: ${report.summary.dedupeRulesCentralized ? "yes" : "no"}`,
    `- Diagnostics sampled: ${report.summary.diagnosticsSampled ? "yes" : "no"}`,
    `- Telemetry graph reused: ${report.summary.telemetryGraphReused ? "yes" : "no"}`,
    `- Client tracking policy present: ${report.summary.clientTrackingPolicyPresent ? "yes" : "no"}`,
    "",
    "## Firestore Write Path",
    "",
    `- Guest batches: ${ANALYTICS_INGEST_FIRESTORE_COLLECTIONS.guestBatches}`,
    `- Guest sessions: ${ANALYTICS_INGEST_FIRESTORE_COLLECTIONS.guestSessions}`,
    `- Behavioral timeline facts: ${ANALYTICS_INGEST_FIRESTORE_COLLECTIONS.behavioralTimelineFacts}`,
    `- Diagnostics: ${ANALYTICS_INGEST_FIRESTORE_COLLECTIONS.diagnostics}`,
    "",
    "## Event Contracts",
    "",
    ...ANALYTICS_INGEST_EVENT_TYPES.flatMap((eventType) => {
      const contract = ANALYTICS_INGEST_CONTRACT[eventType];
      return [
        `### ${eventType}`,
        "",
        `- Priority: ${contract.priority}`,
        `- Persistence: ${contract.persistenceStatus}`,
        `- Dedupe: ${contract.dedupeRule}`,
        `- Destinations: ${contract.destinationLanes.join(", ")}`,
        `- Identity: ${contract.identityRequirements.join(", ")}`,
        `- Downstream: ${contract.downstreamProcessing.join(", ")}`,
        "",
      ];
    }),
    "## Findings",
    "",
    ...[
      ...report.dependencyFindings,
      ...report.contractFindings,
      ...report.routeFindings,
      ...report.firestoreFindings,
      ...report.retryabilityFindings,
      ...report.diagnosticsFindings,
    ].map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Fixes Applied",
    "",
    ...report.fixesApplied.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((entry, index) => `${index + 1}. ${entry}`),
    "",
  ];

  const fullPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, lines.join("\n"));
}

export function validateAnalyticsIngestFirestoreClosure(options: { writeReport?: boolean } = {}) {
  const route = read("src/app/api/analytics/ingest/route.ts");
  const contract = read("src/lib/analytics/ingest-contract.ts");
  const graphPresent = has("src/lib/analytics/telemetry-dependency-graph.ts");
  const clientTrackingPolicyPresent = has("src/lib/analytics/client-tracking-policy.ts");
  const contractClosure = validateAnalyticsIngestContractClosure();

  const acceptedEventsMapped = ANALYTICS_INGEST_EVENT_TYPES.every((eventType) => {
    const eventContract = ANALYTICS_INGEST_CONTRACT[eventType];
    return eventContract.destinationLanes.includes("guest_batch")
      && eventContract.destinationLanes.includes("guest_session")
      && eventContract.firestoreCollections.guestBatches === ANALYTICS_INGEST_FIRESTORE_COLLECTIONS.guestBatches
      && eventContract.firestoreCollections.guestSessions === ANALYTICS_INGEST_FIRESTORE_COLLECTIONS.guestSessions;
  });
  const failureRetryabilityExplicit = [
    "payload_too_large",
    "invalid_json",
    "invalid_analytics_payload",
    "empty_analytics_payload",
    "analytics_consent_denied",
    "temporary_server_failure",
  ].every((reason) => route.includes(`"${reason}"`)) && route.includes("classifyAnalyticsIngestFailure");
  const firestoreDestinationsCentralized = route.includes("ANALYTICS_INGEST_FIRESTORE_COLLECTIONS")
    && !route.includes("ANALYTICS_CANONICAL_COLLECTIONS")
    && !route.includes("ANALYTICS_OPERATIONAL_COLLECTIONS");
  const dedupeRulesCentralized = route.includes("buildAnalyticsIngestDedupeKey") && contract.includes("createAnalyticsStorageKey");
  const diagnosticsSampled = route.includes("shouldRecordAnalyticsIngestDiagnostic")
    && route.includes("ANALYTICS_INGEST_WARNING_CAP_PER_HOUR")
    && route.includes("ANALYTICS_INGEST_FAILURE_CAP_PER_HOUR")
    && route.includes("diagnosticPolicy: \"suppressed_high_volume_consent_path\"");

  const dependencyFindings = [
    finding(
      "telemetry-graph-reused",
      graphPresent,
      "Telemetry dependency graph is present and reused as the upstream lane map.",
      "P1",
    ),
    clientTrackingPolicyPresent
      ? finding(
        "client-tracking-policy-present",
        true,
        "Client tracking policy is present for toggle/consent semantics.",
        "P2",
      )
      : deferred(
        "client-tracking-policy-missing",
        "Client tracking policy is not present yet; this ingest pass records the dependency and keeps server-side contract compatibility without duplicating that system.",
        "P2",
      ),
  ];

  const contractFindings = [
    finding(
      "contract-module-created",
      has("src/lib/analytics/ingest-contract.ts"),
      "Canonical analytics ingest contract module exists.",
      "P0",
    ),
    finding(
      "accepted-events-mapped",
      acceptedEventsMapped && contractClosure.ok,
      "Each accepted anonymous event type maps to identity requirements, destinations, dedupe, and downstream processing.",
      "P0",
    ),
  ];

  const routeFindings = [
    finding(
      "route-uses-contract-event-types",
      route.includes("z.enum(ANALYTICS_INGEST_EVENT_TYPES)"),
      "Ingest route uses the contract's accepted event list instead of a duplicate event enum.",
      "P0",
    ),
    finding(
      "route-explicit-statuses",
      route.includes('status: "accepted"') && route.includes("classification.status"),
      "Ingest responses include explicit accepted, dropped, rejected, or temporary failure status.",
      "P0",
    ),
  ];

  const firestoreFindings = [
    finding(
      "firestore-collections-centralized",
      firestoreDestinationsCentralized,
      "Firestore collection names for guest batches and sessions are centralized through the ingest contract.",
      "P0",
    ),
    finding(
      "dedupe-key-centralized",
      dedupeRulesCentralized,
      "Persisted guest batches use the contract dedupe helper.",
      "P0",
    ),
  ];

  const retryabilityFindings = [
    finding(
      "invalid-payloads-non-retryable",
      failureRetryabilityExplicit && !route.includes('retryable: true }, { status: 503 }'),
      "Invalid JSON, invalid payloads, empty payloads, oversized payloads, and consent-denied drops are permanent non-retryable outcomes.",
      "P0",
    ),
    finding(
      "temporary-failures-only-503",
      route.includes('"temporary_server_failure"') && route.includes("classification.httpStatus"),
      "503 retryable responses are reserved for temporary infrastructure failures.",
      "P0",
    ),
  ];

  const diagnosticsFindings = [
    finding(
      "diagnostics-sampled",
      diagnosticsSampled,
      "Diagnostics are capped by fingerprint/hour and consent denial does not create high-volume diagnostics.",
      "P0",
    ),
  ];

  const fixesApplied = [
    finding("ingest-contract-added", has("src/lib/analytics/ingest-contract.ts"), "Added a canonical ingest contract with destination and retryability rules."),
    finding("route-contract-wired", firestoreDestinationsCentralized && dedupeRulesCentralized, "Refactored ingest route to consume contract collection and dedupe rules."),
    finding("validator-added", has("scripts/agent/validate-analytics-ingest-firestore-closure.ts"), "Added a focused validator and generated truth artifact lane."),
    finding("unit-test-added", has("tests/unit/analytics-ingest-firestore-closure.spec.ts"), "Added unit tests for ingest contract closure."),
  ];

  const allFindings = [
    ...dependencyFindings,
    ...contractFindings,
    ...routeFindings,
    ...firestoreFindings,
    ...retryabilityFindings,
    ...diagnosticsFindings,
    ...fixesApplied,
  ];

  const report: AnalyticsIngestFirestoreClosureReport = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "analytics-ingest-firestore-closure",
    currentHead: currentHead(),
    summary: {
      ingestContractCreated: has("src/lib/analytics/ingest-contract.ts"),
      acceptedEventsMapped,
      failureRetryabilityExplicit,
      firestoreDestinationsCentralized,
      dedupeRulesCentralized,
      diagnosticsSampled,
      telemetryGraphReused: graphPresent,
      clientTrackingPolicyPresent,
      p0Count: countBlocking(allFindings, "P0"),
      p1Count: countBlocking(allFindings, "P1"),
      p2Count: countBlocking(allFindings, "P2"),
    },
    dependencyFindings,
    contractFindings,
    routeFindings,
    firestoreFindings,
    retryabilityFindings,
    diagnosticsFindings,
    fixesApplied,
    prCleanupActions: ["No open telemetry/analytics ingest/Firestore write path PRs were present at start."],
    nextFixOrder: [
      "Land the queued client tracking policy pass so client-side consent/toggle decisions use one shared policy before reaching ingest.",
      "Keep new anonymous event types out of /api/analytics/ingest until they are added to the ingest contract with destinations and dedupe rules.",
      "If a new Firestore destination is introduced, add it to ANALYTICS_INGEST_FIRESTORE_COLLECTIONS before writing route code.",
    ],
  };

  if (options.writeReport) {
    writeJson(artifactRelativePath, report);
    writeMarkdown(report);
  }

  const blockingFailures = [
    ...contractClosure.findings,
    ...allFindings
      .filter((entry) => entry.status === "missing")
      .map((entry) => `${entry.id}: ${entry.detail}`),
  ];

  if (report.nextFixOrder.length === 0) {
    blockingFailures.push("nextFixOrder missing");
  }

  return { report, blockingFailures };
}

const { report, blockingFailures } = validateAnalyticsIngestFirestoreClosure({ writeReport: true });

if (blockingFailures.length > 0) {
  for (const failure of blockingFailures) {
    console.error(`[analytics-ingest-firestore-closure] ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `[analytics-ingest-firestore-closure] ok: ${Object.keys(ANALYTICS_INGEST_CONTRACT).length} event contracts, Firestore destinations centralized`,
  );
}
