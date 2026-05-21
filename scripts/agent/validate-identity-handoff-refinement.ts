import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  buildIdentityHandoffEventContext,
  resolveIdentityHandoffState,
} from "@/lib/analytics/identity-state-machine";
import { buildIdentityLinkPayload, buildIdentityTransferCountingKeys } from "@/lib/analytics/identity-transfer";
import { buildBehaviorMathReport } from "@/lib/behavioral/behavior-math-engine";
import { canUseBehavioralSignals, canPersistIdentityLink } from "@/lib/privacy/consent-tracking-policy";

type ValidationReport = {
  reportKey: "identity-handoff-refinement";
  generatedAtUtc: string;
  currentHead: string;
  status: "pass" | "fail";
  dependencyStatus: {
    consentTrackingContract: "present" | "missing";
  };
  stateMachine: {
    states: string[];
    transitions: string[];
  };
  checks: Record<string, boolean>;
  changedFiles: string[];
  validationFailures: string[];
  nextActions: string[];
};

const REPORT_PATH = "agent/state/identity-handoff-refinement.generated.json";
const DOC_PATH = "docs/agent-truth/identity-handoff-refinement.md";

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

function writeDoc(report: ValidationReport) {
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  writeFileSync(DOC_PATH, [
    "# Identity Handoff Refinement",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Consent tracking contract: ${report.dependencyStatus.consentTrackingContract}`,
    "",
    "## Contract",
    "",
    "- Guest events carry `guestId`, `sessionId`, `consentMode`, and a guest identity state.",
    "- Signup/login links use deterministic `identityLinkId` values and stay idempotent.",
    "- Minimal, decline, and unknown consent cannot create person-level behavioral attribution.",
    "- Full behavioral consent can link guest history to a logged-in person without double counting.",
    "- Legacy unknown records stay excluded from known-user behavior.",
    "",
    "## Checks",
    "",
    ...Object.entries(report.checks).map(([key, passed]) => `- ${passed ? "pass" : "fail"}: ${key}`),
    "",
    "## Next Actions",
    "",
    ...report.nextActions.map((action) => `- ${action}`),
    "",
  ].join("\n"));
}

function main() {
  const failures: string[] = [];
  const currentHead = gitOutput("git rev-parse HEAD") || "unknown";
  const generatedAtUtc = new Date().toISOString();
  const changedFiles = listChangedFiles();
  const protectedTouched = changedFiles.filter((file) =>
    /(^|\/)(chat|navigation|navbar|bottomnav|topnav)(\/|\.|$)/iu.test(file)
      || /paypal|payment|wallet|gumdrop/iu.test(file));

  const consentContractPresent = read("src/lib/privacy/consent-tracking-contract.ts").includes("CONSENT_MODE_VALUES")
    && read("src/lib/privacy/consent-tracking-policy.ts").includes("canUseBehavioralSignals");
  const stateMachineSource = read("src/lib/analytics/identity-state-machine.ts");
  const identityLinkSource = read("src/lib/analytics/analytics-identity-link.ts");
  const routeSource = read("src/app/api/analytics/identity-link/route.ts");
  const authSource = read("src/context/AuthContext.tsx");
  const trackerSource = read("src/components/Analytics/DeepTracker.tsx");
  const behaviorSource = read("src/lib/behavioral/behavior-math-engine.ts");
  const testSource = read("tests/unit/identity-handoff-refinement.spec.ts");

  const fullLink = buildIdentityLinkPayload({
    guestId: "guest_1",
    userId: "user_1",
    sessionId: "session_1",
    consentMode: "full_behavioral",
  });
  const repeatLink = buildIdentityLinkPayload({
    guestId: "guest_1",
    userId: "user_1",
    sessionId: "session_1",
    linkedAt: "2026-05-21T16:00:00.000Z",
    consentMode: "full_behavioral",
  });
  const minimalLink = buildIdentityLinkPayload({
    guestId: "guest_1",
    userId: "user_1",
    sessionId: "session_1",
    consentMode: "minimal_analytics",
  });
  const counting = buildIdentityTransferCountingKeys({
    userId: "user_1",
    anonymousVisitorId: "guest_1",
    sessionId: "session_1",
    identityLinkId: fullLink.identityLinkId,
  });
  const behaviorReport = buildBehaviorMathReport({
    events: [
      {
        eventId: "minimal-click",
        eventName: "semantic_target_clicked",
        eventType: "click",
        timestampMs: Date.now(),
        sessionId: "session_1",
        userId: "user_1",
        identityState: "user_only",
        trackingState: "enabled",
        consentMode: "minimal_analytics",
      },
      {
        eventId: "full-click",
        eventName: "semantic_target_clicked",
        eventType: "click",
        timestampMs: Date.now() + 1,
        sessionId: "session_1",
        anonymousVisitorId: "guest_1",
        userId: "user_1",
        identityState: "guest_linked_to_user",
        trackingState: "enabled",
        consentMode: "full_behavioral",
      },
      {
        eventId: "legacy",
        eventName: "creator_profile_viewed",
        eventType: "profile_view",
        timestampMs: Date.now() + 2,
        userId: "legacy_user",
        identityState: "unknown_legacy",
        trackingState: "unknown",
        consentMode: "unknown",
      },
    ],
  });

  const checks = {
    consentTrackingContractPresent: consentContractPresent,
    stateMachineHasSignupAndLogin: stateMachineSource.includes("signup_pending") && stateMachineSource.includes("login_success"),
    deterministicIdempotentLink: fullLink.identityLinkId === repeatLink.identityLinkId,
    identityLinkConsentAware: minimalLink.mergeAllowed === false && minimalLink.personLevelBehaviorAllowed === false,
    identityRouteBlocksMinimalConsent: routeSource.includes("identity_link_blocked_by_consent") && routeSource.includes("canPersistIdentityLink"),
    authContextPassesConsentMode: authSource.includes("consentMode") && authSource.includes("consentState = identityLinkAllowed ? \"granted\" : \"denied\""),
    trackerCarriesConsentMode: trackerSource.includes("consentMode: privacy.consentMode") && trackerSource.includes("identityState: \"guest_behavioral\""),
    linkedGuestNoDoubleCount: counting.countAsKnownUser && counting.countAsAdditionalKnownUser === false,
    behaviorMathBlocksMinimalPersonBehavior: behaviorReport.summary.consentBlockedBehaviorEvents === 1 && behaviorSource.includes("consent_blocks_person_level_behavior"),
    legacyUnknownNotKnownUser: !behaviorReport.perUser.legacy_user,
    consentTransitionsTested: testSource.includes("consent_accept_all") || (testSource.includes("minimal_analytics") && testSource.includes("full_behavioral")),
    noProtectedSurfacesTouched: protectedTouched.length === 0,
    fullBehaviorRequiresFullConsent: canUseBehavioralSignals("minimal_analytics") === false && canUseBehavioralSignals("full_behavioral") === true,
    identityPersistenceRequiresAllowedConsent: canPersistIdentityLink("minimal_analytics") === false && canPersistIdentityLink("full_behavioral") === true,
    trackerContextHasLinkId: buildIdentityHandoffEventContext({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "session_1",
      identityLinkId: fullLink.identityLinkId,
      consentMode: "full_behavioral",
    }).identityLinkId === fullLink.identityLinkId,
    legacyStateExists: resolveIdentityHandoffState({ legacyUnknown: true }) === "legacy_unknown",
    noBroadReadOnLogin: !routeSource.includes(".where(") && routeSource.includes("never scans historical guest events"),
    sourceFilesUseExistingIdentityTransfer: identityLinkSource.includes("buildGuestUserIdentityLinkId") && authSource.includes("buildIdentityLinkPayload"),
  };

  for (const [key, passed] of Object.entries(checks)) {
    if (!passed) failures.push(`${key} failed.`);
  }
  if (protectedTouched.length > 0) {
    failures.push(`protected files touched: ${protectedTouched.join(", ")}`);
  }

  const report: ValidationReport = {
    reportKey: "identity-handoff-refinement",
    generatedAtUtc,
    currentHead,
    status: failures.length === 0 ? "pass" : "fail",
    dependencyStatus: {
      consentTrackingContract: consentContractPresent ? "present" : "missing",
    },
    stateMachine: {
      states: [
        "guest_unknown_consent",
        "guest_necessary_only",
        "guest_minimal",
        "guest_behavioral",
        "signup_pending",
        "user_logged_in",
        "user_logged_in_linked_guest",
        "creator_user",
        "admin_projection",
        "legacy_unknown",
      ],
      transitions: [
        "page_visit",
        "consent_accept_all",
        "consent_minimal",
        "consent_decline",
        "signup_start",
        "signup_success",
        "login_success",
        "logout",
        "consent_changed",
        "account_deleted",
      ],
    },
    checks,
    changedFiles,
    validationFailures: failures,
    nextActions: failures.length === 0
      ? ["Keep formal runtime/provider/manual evidence gates separate; this is source-only identity continuity proof."]
      : ["Fix failed source checks before treating identity handoff as closed."],
  };

  writeJson(REPORT_PATH, report);
  writeDoc(report);

  if (failures.length > 0) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  console.log(`Identity handoff refinement passed: ${Object.keys(checks).length} checks.`);
}

main();
