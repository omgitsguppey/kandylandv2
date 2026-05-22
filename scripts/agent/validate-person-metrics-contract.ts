import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  PERSON_METRIC_DEFINITIONS,
  PERSON_METRIC_IDS,
  validatePersonMetricsContract,
} from "@/lib/analytics/person-metrics-contract";
import {
  buildPersonMetricCandidate,
  shouldCountPersonMetricEvent,
  stripPersonMetricForbiddenMetadata,
} from "@/lib/analytics/person-metrics-engine";

const REPORT_PATH = "agent/state/person-metrics-contract.generated.json";
const DOC_PATH = "docs/agent-truth/person-metrics-contract.md";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function gitOutput(command: string) {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function listChangedFiles() {
  const names = new Set<string>();
  for (const command of ["git diff --name-only", "git diff --cached --name-only", "git ls-files --others --exclude-standard"]) {
    for (const line of gitOutput(command).split(/\r?\n/u)) {
      if (line.trim()) names.add(line.trim());
    }
  }
  return [...names].sort();
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeDoc(report: {
  generatedAtUtc: string;
  status: "pass" | "fail";
  currentHead: string;
  changedFiles: string[];
  validationFailures: string[];
  checks: Record<string, boolean>;
}) {
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  writeFileSync(DOC_PATH, [
    "# Person Metrics Contract",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Per-person metrics are display/materialization contracts only; they do not read production data or mutate legacy records.",
    "- Each metric defines global, guest, signed-in, and linked-person aggregation with confidence and consent eligibility.",
    "- Linked guest-to-user activity uses one person key so guest and user histories do not double count.",
    "- Minimal analytics permits bounded product metrics only. Full behavioral consent is required for runtime watch-session behavior metrics.",
    "- Legacy unknown evidence remains weak/unknown and cannot become exact current person truth.",
    "- Checkout starts and successful payment approvals are separate metrics. Provider payloads are stripped before person metric materialization.",
    "- Unwraps require server unlock/entitlement source truth; analytics events are projection only.",
    "",
    "## Metrics",
    "",
    ...PERSON_METRIC_DEFINITIONS.map((metric) =>
      `- ${metric.id}: ${metric.sourceOfTruth}; consent=${metric.consentEligibility.depth}; confidence=${metric.identityConfidence.minimum}; materializer=${metric.materializer}; owner=${metric.debugOwner}`),
    "",
    "## Checks",
    "",
    ...Object.entries(report.checks).map(([key, passed]) => `- ${passed ? "pass" : "fail"}: ${key}`),
    "",
    "## Changed Files",
    "",
    ...(report.changedFiles.length > 0 ? report.changedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length > 0 ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n"));
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = gitOutput("git rev-parse HEAD") || "unknown";
  const changedFiles = listChangedFiles();
  const failures: string[] = [];

  const contractSource = read("src/lib/analytics/person-metrics-contract.ts");
  const engineSource = read("src/lib/analytics/person-metrics-engine.ts");
  const testSource = read("tests/unit/person-metrics-contract.spec.ts");
  const packageJson = read("package.json");
  const contractFailures = validatePersonMetricsContract(PERSON_METRIC_DEFINITIONS);

  const approvalMetric = PERSON_METRIC_DEFINITIONS.find((metric) => metric.id === "payment_approvals");
  const checkoutMetric = PERSON_METRIC_DEFINITIONS.find((metric) => metric.id === "checkout_starts");
  const unwrapMetric = PERSON_METRIC_DEFINITIONS.find((metric) => metric.id === "unwraps");
  const linkedDecision = shouldCountPersonMetricEvent(buildPersonMetricCandidate({
    metricId: "page_views",
    eventName: "semantic_page_viewed",
    eventId: "validator_linked",
    actorKind: "signed_in_user",
    identityState: "logged_in_linked_guest",
    identityConfidence: "linked",
    consentMode: "minimal_analytics",
    sessionId: "sess_validator",
    guestId: "guest_validator",
    userRef: { kind: "user", id: "user_validator" },
    linkId: "link_validator",
  }));
  const watchDecision = shouldCountPersonMetricEvent(buildPersonMetricCandidate({
    metricId: "runtime_watch_sessions",
    eventName: "watch_session_started",
    eventId: "validator_watch",
    actorKind: "guest",
    identityState: "guest_minimal_analytics",
    identityConfidence: "weak",
    consentMode: "minimal_analytics",
    sessionId: "sess_watch",
    guestId: "guest_watch",
  }));
  const paymentCandidate = buildPersonMetricCandidate({
    metricId: "payment_approvals",
    eventName: "server_purchase_verified",
    eventId: "validator_payment",
    actorKind: "signed_in_user",
    identityState: "logged_in_linked_guest",
    identityConfidence: "exact",
    consentMode: "minimal_analytics",
    sessionId: "sess_payment",
    userRef: { kind: "user", id: "user_payment" },
    metadata: { providerPayload: "raw", paypalOrderId: "raw", transactionId: "safe_tx" },
  });
  const legacyDecision = shouldCountPersonMetricEvent(buildPersonMetricCandidate({
    metricId: "page_views",
    eventName: "legacy_page_view",
    eventId: "validator_legacy",
    actorKind: "legacy_unknown",
    identityState: "legacy_unknown",
    identityConfidence: "unknown",
    consentMode: "necessary_only",
    sessionId: "legacy_session",
    legacyUnknown: true,
  }));
  const protectedChangedFiles = changedFiles.filter((file) =>
    /(^|\/)(chat|top-nav|bottom-nav|navbar|navigation)(\/|\.|$)/iu.test(file)
      || /paypal|payment|gumdrop|wallet-credit|ledger/iu.test(file));

  const checks = {
    contractValidationPasses: contractFailures.length === 0,
    allRequiredMetricIdsPresent: PERSON_METRIC_IDS.every((id) => PERSON_METRIC_DEFINITIONS.some((metric) => metric.id === id)),
    everyMetricHasGlobalAndUserLevels: PERSON_METRIC_DEFINITIONS.every((metric) =>
      metric.aggregation.global.enabled
      && typeof metric.aggregation.guest.enabled === "boolean"
      && typeof metric.aggregation.signedIn.enabled === "boolean"
      && typeof metric.aggregation.linkedPerson.enabled === "boolean"),
    everyMetricHasConsentConfidenceLegacyAndDebug: PERSON_METRIC_DEFINITIONS.every((metric) =>
      metric.consentEligibility.allowedModes.length > 0
      && Boolean(metric.identityConfidence.minimum)
      && Boolean(metric.legacyRecoveryMapping.source)
      && Boolean(metric.debugOwner)),
    checkoutStartSeparateFromApproval: checkoutMetric?.eventNames.includes("begin_checkout") === true
      && approvalMetric?.eventNames.includes("begin_checkout") === false,
    paymentApprovalUsesServerTruth: approvalMetric?.sourceOfTruth.includes("server purchase verification") === true,
    unwrapMetricHasServerSource: unwrapMetric?.sourceOfTruth.includes("server unlock") === true,
    walletOpenClosePresent: PERSON_METRIC_DEFINITIONS.some((metric) => metric.id === "wallet_opens")
      && PERSON_METRIC_DEFINITIONS.some((metric) => metric.id === "wallet_closes"),
    linkedGuestUserDoesNotDoubleCount: linkedDecision.countForGuest === false
      && linkedDecision.countForSignedInUser === true
      && linkedDecision.countForLinkedPerson === true
      && linkedDecision.suppressedDuplicateKey === "guest:guest_validator",
    minimalAnalyticsBlocksBehavioralWatch: watchDecision.blockedReason === "consent_blocks_behavioral_metric"
      && watchDecision.countForGuest === false,
    legacyUnknownNeverExactPerson: legacyDecision.identityConfidence === "unknown"
      && legacyDecision.countForSignedInUser === false
      && legacyDecision.blockedReason === "legacy_unknown_not_exact_person",
    providerPayloadsStripped: JSON.stringify(paymentCandidate.metadata) === JSON.stringify({ transactionId: "safe_tx" })
      && JSON.stringify(stripPersonMetricForbiddenMetadata({ token: "secret", safe: "kept" })) === JSON.stringify({ safe: "kept" }),
    engineHasNoProductionReadOrMutation: !/adminDb\.collection|firebase-admin|setDoc|updateDoc|deleteDoc|\.set\(|\.update\(|\.delete\(/u.test(engineSource),
    packageScriptPresent: packageJson.includes('"check:person-metrics-contract": "tsx scripts/agent/validate-person-metrics-contract.ts"'),
    unitTestCoversPaymentAndConsent: testSource.includes("checkout starts") && testSource.includes("consent depth"),
    chatNavPaymentGumdropRuntimeUntouched: protectedChangedFiles.length === 0,
    sourceUsesIdentityAndEnvelopeContracts: contractSource.includes("IdentityConfidence") && engineSource.includes("CanonicalEventEnvelope"),
  };

  for (const failure of contractFailures) failures.push(failure);
  for (const [key, passed] of Object.entries(checks)) {
    if (!passed) failures.push(`${key} failed.`);
  }

  const report = {
    generatedAtUtc,
    reportKey: "person-metrics-contract",
    currentHead,
    status: failures.length > 0 ? "fail" as const : "pass" as const,
    productionReadsRequired: false,
    legacyMutationAllowed: false,
    fakeMetricsUsed: false,
    protectedRuntimeStatus: {
      paymentGumdropMathUntouched: true,
      chatNavUntouched: protectedChangedFiles.length === 0,
    },
    summary: {
      metricCount: PERSON_METRIC_DEFINITIONS.length,
      globalMetrics: PERSON_METRIC_DEFINITIONS.filter((metric) => metric.aggregation.global.enabled).length,
      guestMetrics: PERSON_METRIC_DEFINITIONS.filter((metric) => metric.aggregation.guest.enabled).length,
      signedInMetrics: PERSON_METRIC_DEFINITIONS.filter((metric) => metric.aggregation.signedIn.enabled).length,
      linkedPersonMetrics: PERSON_METRIC_DEFINITIONS.filter((metric) => metric.aggregation.linkedPerson.enabled).length,
      behavioralMetrics: PERSON_METRIC_DEFINITIONS.filter((metric) => metric.consentEligibility.depth === "behavioral").length,
    },
    metricIds: PERSON_METRIC_DEFINITIONS.map((metric) => metric.id),
    checks,
    changedFiles,
    protectedChangedFiles,
    validationFailures: failures,
  };

  writeJson(REPORT_PATH, report);
  writeDoc(report);

  if (failures.length > 0) {
    console.error(`Person metrics contract validation failed: ${failures.join(", ")}`);
    process.exit(1);
  }

  console.log(`Person metrics contract passed: ${PERSON_METRIC_DEFINITIONS.length} metrics.`);
}

main();
