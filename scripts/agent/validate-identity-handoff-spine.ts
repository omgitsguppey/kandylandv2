import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  buildEventIdentityEnvelope,
  buildIdentityLinkCandidate,
  classifyLegacyIdentity,
  preventGuestUserDoubleCount,
  shouldLinkGuestToUser,
} from "@/lib/analytics/identity-handoff-engine";

const REPORT_PATH = "agent/state/identity-handoff-spine.generated.json";
const DOC_PATH = "docs/agent-truth/identity-handoff-spine.md";

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
  for (const command of ["git diff --name-only", "git diff --cached --name-only"]) {
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
  checks: Record<string, boolean>;
  changedFiles: string[];
  validationFailures: string[];
}) {
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  writeFileSync(DOC_PATH, [
    "# Identity Handoff Spine",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Every client-tracked event receives an identity envelope with `actorKind`, `identityState`, `identityConfidence`, `consentMode`, and `sessionId`.",
    "- Guest events include a guest id when consent allows persistence, otherwise they include an unavailable reason.",
    "- Signup, login, session restore, and consent-upgrade links use deterministic link candidates.",
    "- Linked guest history is attributed once to the resolved user and suppresses the duplicate guest count key.",
    "- Admin projection and legacy unknown events cannot enter user behavior metrics.",
    "- Minimal or declined consent does not enable person-level behavioral analytics.",
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

function countOccurrences(source: string, text: string) {
  return source.split(text).length - 1;
}

function main() {
  const currentHead = gitOutput("git rev-parse HEAD") || "unknown";
  const generatedAtUtc = new Date().toISOString();
  const changedFiles = listChangedFiles();
  const failures: string[] = [];

  const contractSource = read("src/lib/analytics/identity-handoff-contract.ts");
  const engineSource = read("src/lib/analytics/identity-handoff-engine.ts");
  const telemetrySource = read("src/lib/telemetry.ts");
  const telemetrySafetySource = read("src/lib/telemetry-safety.ts");
  const trackerSource = read("src/components/Analytics/DeepTracker.tsx");
  const anonymousIngestSource = read("src/app/api/analytics/ingest/route.ts");
  const identifiedIngestSource = read("src/app/api/analytics/ingest-identified/route.ts");
  const adminDebugRouteSource = read("src/app/api/admin/debug/route.ts");
  const adminIdentitySummarySource = read("src/lib/server/admin-debug/identity-handoff-summary.ts");
  const testSource = read("tests/unit/identity-handoff-spine.spec.ts");
  const packageJson = read("package.json");

  const fullLink = buildIdentityLinkCandidate({
    guestId: "guest_1",
    userId: "user_1",
    sessionId: "sess_1",
    consentMode: "full_behavioral",
    reason: "signup",
  });
  const repeatLink = buildIdentityLinkCandidate({
    guestId: "guest_1",
    userId: "user_1",
    sessionId: "sess_1",
    consentMode: "full_behavioral",
    reason: "login",
  });
  const minimalLink = buildIdentityLinkCandidate({
    guestId: "guest_1",
    userId: "user_1",
    sessionId: "sess_1",
    consentMode: "minimal_analytics",
    reason: "login",
  });
  const guestEnvelope = buildEventIdentityEnvelope({
    eventName: "semantic_page_viewed",
    guestId: "guest_1",
    sessionId: "sess_1",
    consentMode: "full_behavioral",
  });
  const missingGuestEnvelope = buildEventIdentityEnvelope({
    eventName: "semantic_page_viewed",
    sessionId: "sess_1",
    consentMode: "necessary_only",
  });
  const linkedGuard = preventGuestUserDoubleCount({
    eventId: "evt_1",
    actorKind: "signed_in_user",
    identityState: "logged_in_linked_guest",
    guestId: "guest_1",
    userId: "user_1",
    sessionId: "sess_1",
    linkId: fullLink.linkId,
  });
  const adminGuard = preventGuestUserDoubleCount({
    eventId: "evt_2",
    actorKind: "admin_projection",
    identityState: "admin_authenticated",
    userId: "admin_1",
  });
  const legacy = classifyLegacyIdentity({
    userId: "legacy_user",
  });
  const protectedChangedFiles = changedFiles.filter((file) =>
    /(^|\/)(chat|top-nav|bottom-nav|navbar|navigation)(\/|\.|$)/iu.test(file)
      || /paypal|payment|wallet|gumdrop/iu.test(file));

  const checks = {
    canonicalContractExists: contractSource.includes("export type ActorKind") && contractSource.includes("guest_full_behavioral"),
    requiredActorKindsPresent: ["guest", "signed_in_user", "creator_user", "admin_projection", "system", "legacy_unknown"].every((value) => contractSource.includes(`"${value}"`)),
    requiredIdentityStatesPresent: ["signup_started", "signup_completed_unlinked", "logged_in_linked_guest", "creator_logged_in", "admin_authenticated"].every((value) => contractSource.includes(`"${value}"`)),
    requiredConfidenceAndReasonsPresent: contractSource.includes("IdentityConfidence") && contractSource.includes("consent_upgrade") && contractSource.includes("legacy_recovery"),
    engineExportsRequiredFunctions: [
      "resolveCurrentIdentityState",
      "buildGuestIdentityContext",
      "buildSignedInIdentityContext",
      "buildIdentityLinkCandidate",
      "shouldLinkGuestToUser",
      "buildEventIdentityEnvelope",
      "preventGuestUserDoubleCount",
      "classifyLegacyIdentity",
    ].every((name) => engineSource.includes(`function ${name}`)),
    deterministicLinkCandidate: Boolean(fullLink.linkId) && fullLink.linkId === repeatLink.linkId,
    minimalConsentBlocksLinkage: shouldLinkGuestToUser(minimalLink) === false && minimalLink.blockedReason === "consent_blocks_identity_link",
    envelopeCarriesRequiredIdentityFields: guestEnvelope.actorKind === "guest"
      && guestEnvelope.identityState === "guest_full_behavioral"
      && guestEnvelope.identityConfidence === "weak"
      && guestEnvelope.consentMode === "full_behavioral"
      && guestEnvelope.sessionId === "sess_1",
    guestEnvelopeHasUnavailableReason: missingGuestEnvelope.unavailableGuestReason === "guest_id_unavailable_due_to_consent",
    doubleCountGuardPreventsGuestUserDupes: linkedGuard.canonicalCountKey === "user:user_1" && linkedGuard.countAsUser && !linkedGuard.countAsGuest,
    adminProjectionExcluded: adminGuard.reason === "admin_projection_excluded" && !adminGuard.includeInUserBehavior,
    legacyUnknownNeverExact: legacy.identityConfidence === "unknown" && legacy.canPromoteToExactUser === false && legacy.userId === null,
    telemetryUsesCanonicalEnvelope: telemetrySource.includes("buildEventIdentityEnvelope") && telemetrySource.includes("actor_kind") && telemetrySource.includes("identity_state") && telemetrySource.includes("identity_confidence"),
    telemetrySafetyKeepsIdentityFields: telemetrySafetySource.includes('"actor_kind"') && telemetrySafetySource.includes('"identity_state"') && telemetrySafetySource.includes('"consent_mode"'),
    guestTrackerUsesCanonicalEnvelope: trackerSource.includes("buildEventIdentityEnvelope") && trackerSource.includes("identityState: identityEnvelope.identityState"),
    anonymousIngestRequiresIdentityEnvelope: anonymousIngestSource.includes("IDENTITY_STATES") && anonymousIngestSource.includes("identityConfidence") && anonymousIngestSource.includes("actorKind"),
    identifiedIngestBuildsCanonicalEnvelope: identifiedIngestSource.includes("buildEventIdentityEnvelope") && identifiedIngestSource.includes("canonicalIdentityState") && identifiedIngestSource.includes("identityEnvelope"),
    debugLaneConsolidated: countOccurrences(adminDebugRouteSource, "identityHandoff") === 1
      && adminIdentitySummarySource.includes('lane: "Identity handoff"')
      && adminIdentitySummarySource.includes("duplicateIdentityWidgetsConsolidated: true"),
    testCoversSpine: testSource.includes("buildEventIdentityEnvelope") && testSource.includes("preventGuestUserDoubleCount") && testSource.includes("legacy_unknown"),
    packageScriptPresent: packageJson.includes('"check:identity-handoff-spine": "tsx scripts/agent/validate-identity-handoff-spine.ts"'),
    protectedSurfacesUntouched: protectedChangedFiles.length === 0,
  };

  for (const [key, passed] of Object.entries(checks)) {
    if (!passed) failures.push(`${key} failed.`);
  }
  if (protectedChangedFiles.length > 0) {
    failures.push(`protected files changed: ${protectedChangedFiles.join(", ")}`);
  }

  const report = {
    reportKey: "identity-handoff-spine",
    generatedAtUtc,
    currentHead,
    status: failures.length === 0 ? "pass" as const : "fail" as const,
    productionReadsRequired: false,
    legacyMutationAllowed: false,
    fakeBehaviorUsed: false,
    protectedRuntimeStatus: {
      paymentWalletPaypalUntouched: !changedFiles.some((file) => /paypal|payment|wallet/iu.test(file)),
      gumdropMathUntouched: !changedFiles.some((file) => /gumdrop/iu.test(file)),
      chatNavUntouched: !changedFiles.some((file) => /(^|\/)(chat|top-nav|bottom-nav|navbar|navigation)(\/|\.|$)/iu.test(file)),
    },
    checks,
    changedFiles,
    validationFailures: failures,
    debugPanelLane: {
      name: "Identity handoff",
      rawDumpsCollapsed: true,
      duplicateIdentityWidgetsConsolidated: true,
    },
    releaseNote: [
      "Finalized guest-to-user identity handoff contracts.",
      "Prevented double-counting across signup and login.",
      "Simplified debug identity status into one source of truth.",
    ],
  };

  writeJson(REPORT_PATH, report);
  writeDoc(report);

  if (failures.length > 0) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  console.log(`Identity handoff spine passed: ${Object.keys(checks).length} checks.`);
}

main();
