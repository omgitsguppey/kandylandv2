import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import { hydratePersonMetrics } from "@/lib/analytics/person-metrics-hydration";
import {
  GLOBAL_USER_COUNTING_MATH_VERSION,
  calculateCreatorRoleCountDecision,
  calculateGlobalCountDecision,
  calculateGuestCountDecision,
  calculateLinkedPersonCountDecision,
  calculateSignedInCountDecision,
  explainCountDecision,
  suppressDuplicateLinkedAction,
} from "@/lib/math/global-user-counting-math";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/global-user-counting-math.generated.json";
const DOC_PATH = "docs/agent-truth/global-user-counting-math.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";

type JsonRecord = Record<string, unknown>;

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function writeJson(path: string, value: unknown) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === REPORT_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "src/lib/math/global-user-counting-math.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-global-user-counting-math.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/global-user-counting-math.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/person-metrics-hydration.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === SCORE_PATH || normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/paypal|payment-runtime|wallet-runtime|gumdrop-ledger|top-nav|bottom-nav|navbar/iu.test(normalized)) return "unsafe_unknown";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/count|dedupe|person-metrics|global-user/iu.test(normalized)) return "real_source_change_needs_review";
  return "unsafe_unknown";
}

function classifyOpenPr(pr: JsonRecord) {
  const title = String(pr.title ?? "");
  if (/dependency|deps|npm|knip|syncpack|puppeteer/i.test(title)) return "dependency_update_external_review_required";
  if (/sentinel|security|Math\.random|ID generation/i.test(title)) return "security_patch_external_review_required";
  if (/bolt|performance|Map lookup/i.test(title)) return "performance_patch_external_review_required";
  if (/palette|accessibility|loading states/i.test(title)) return "accessibility_patch_external_review_required";
  if (/doctrine|banned-pattern|drift/i.test(title)) return "doctrine_governance_external_review_required";
  if (/monolith|responsibility boundaries|file risk/i.test(title)) return "architecture_refactor_external_review_required";
  if (/onboarding|friction|rescue signals/i.test(title)) return "onboarding_telemetry_external_review_required";
  return "open_pr_external_review_required";
}

function asciiTitle(value: string) {
  return value.replace(/[^\x20-\x7E]+/gu, "").replace(/\s{2,}/gu, " ").trim();
}

function listOpenPrs() {
  const raw = run("gh", [
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,url,mergeStateStatus,isDraft",
  ]);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as JsonRecord[];
    return parsed.map((pr) => ({ ...pr, classification: classifyOpenPr(pr) }));
  } catch {
    return [{ number: 0, title: "gh pr list parse failed", classification: "unsafe_unknown" }];
  }
}

function scoreSnapshot() {
  const score = readJson(SCORE_PATH);
  return {
    sourceHealth: typeof score.sourceHealthScore === "number" ? score.sourceHealthScore : 0,
    runtimeHealth: typeof score.runtimeHealthScore === "number" ? score.runtimeHealthScore : 0,
    evidenceCompleteness: typeof score.evidenceCompletenessScore === "number" ? score.evidenceCompletenessScore : 0,
    freshness: typeof score.freshnessScore === "number" ? score.freshnessScore : 0,
    costRisk: typeof score.costRiskScore === "number" ? score.costRiskScore : 0,
    regressionRisk: typeof score.regressionRiskScore === "number" ? score.regressionRiskScore : 0,
    overallHealthScore: typeof score.healthScore === "number" ? score.healthScore : 0,
  };
}

function fixtureEnvelope(input: Partial<CanonicalEventEnvelope> & { userId?: string }): CanonicalEventEnvelope {
  const userId = typeof input.userId === "string" ? input.userId : null;
  return {
    eventId: String(input.eventId),
    eventName: String(input.eventName),
    eventVersion: 1,
    timestamp: String(input.timestamp ?? "2026-05-26T10:00:00.000Z"),
    featureId: String(input.featureId ?? "validator"),
    surface: String(input.surface ?? "validator"),
    actorKind: input.actorKind ?? "signed_in_user",
    identityState: input.identityState ?? "logged_in_unlinked",
    identityConfidence: input.identityConfidence ?? "exact",
    consentMode: input.consentMode ?? "minimal_analytics",
    sessionId: String(input.sessionId ?? "session_validator"),
    guestId: typeof input.guestId === "string" ? input.guestId : null,
    userRef: userId ? { kind: "user" as const, id: userId } : null,
    linkId: typeof input.linkId === "string" ? input.linkId : null,
    source: "client" as const,
    materializerLane: "person_metrics",
    debugVisibility: "admin_debug",
    scoreImpact: "evidence_completeness",
    privacyClass: "minimal_product" as const,
    metadata: input.metadata ?? {},
    pipelineStatus: "normal" as const,
    unavailableGuestReason: null,
    includeInUserBehavior: true,
  };
}

function renderDoc(report: JsonRecord) {
  const dirtyRows = (report.dirtyFiles as Array<{ path: string; classification: string }>).map((file) => `- ${file.path}: ${file.classification}`);
  const prRows = (report.openPullRequests as Array<{ number: number; title: string; classification: string }>).map((pr) => `- #${pr.number} ${asciiTitle(pr.title)}: ${pr.classification}`);
  const failures = report.validationFailures as string[];
  return [
    "# Global User Counting Math",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Contract",
    "",
    "- Global metrics count unique real actions once per dedupe key.",
    "- Guest metrics count pre-login guest actions only.",
    "- Signed-in metrics count authenticated actions only.",
    "- Linked-person metrics combine guest and signed-in events only when link evidence exists.",
    "- Creator role metrics are signed-in metrics with role context and do not create another person.",
    "- Admin projections and system events never count as user behavior.",
    "- Unknown legacy can count only as safe global evidence and never as exact user truth.",
    "",
    "## Exact Dedupe Windows",
    "",
    "- surface viewed: eventName + surface + actor/session + 60s",
    "- click/action: eventName + objectId + actor/session + 5s",
    "- signup/login: authAttemptId or userId + method + 10m",
    "- wallet checkout: idempotency key",
    "- payment approval: provider/order fingerprint only",
    "- drop unlock: dropId + user/linkedPerson + unlockId",
    "- watch session: watchSessionId",
    "- chat message: messageId/idempotency key",
    "- task reward: taskId + resetWindowId + user",
    "- notification: intentId + recipient + 1h",
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
    "",
    "## Open PR Classification",
    "",
    ...(prRows.length ? prRows : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = run("git", ["rev-parse", "HEAD"]) || "unknown";
  const scoreBefore = scoreSnapshot();
  const validationFailures: string[] = [];
  const source = {
    math: read("src/lib/math/global-user-counting-math.ts"),
    engine: read("src/lib/analytics/person-metrics-engine.ts"),
    hydration: read("src/lib/analytics/person-metrics-hydration.ts"),
    packageJson: read("package.json"),
  };

  const linkedInput = {
    eventName: "drop_preview_opened",
    eventId: "signed_evt",
    actorKind: "signed_in_user",
    identityState: "logged_in_linked_guest",
    identityConfidence: "linked",
    userId: "user_1",
    guestId: "guest_1",
    linkId: "link_1",
    objectId: "drop_1",
    timestamp: "2026-05-26T10:00:03.000Z",
  };
  const linkedGlobal = calculateGlobalCountDecision(linkedInput);
  const linkedGuest = calculateGuestCountDecision(linkedInput);
  const linkedSignedIn = calculateSignedInCountDecision(linkedInput);
  const linkedPerson = calculateLinkedPersonCountDecision(linkedInput);
  const linkedSuppression = suppressDuplicateLinkedAction(linkedInput);
  const reportHydration = hydratePersonMetrics({
    envelopes: [
      fixtureEnvelope({
        eventId: "guest_evt",
        eventName: "drop_preview_opened",
        actorKind: "guest",
        identityState: "guest_minimal_analytics",
        identityConfidence: "weak",
        guestId: "guest_1",
        linkId: "link_1",
        metadata: { dropId: "drop_1" },
        timestamp: "2026-05-26T10:00:00.000Z",
      }),
      fixtureEnvelope({
        eventId: "signed_evt",
        eventName: "drop_preview_opened",
        actorKind: "signed_in_user",
        identityState: "logged_in_linked_guest",
        identityConfidence: "linked",
        userId: "user_1",
        guestId: "guest_1",
        linkId: "link_1",
        metadata: { dropId: "drop_1" },
        timestamp: "2026-05-26T10:00:03.000Z",
      }),
    ],
  });
  const admin = calculateGlobalCountDecision({
    eventName: "admin_debug_viewed",
    eventId: "admin_evt",
    actorKind: "admin_projection",
    identityState: "admin_authenticated",
    identityConfidence: "exact",
    userId: "admin_1",
  });
  const system = calculateGlobalCountDecision({
    eventName: "notification_delivered",
    eventId: "system_evt",
    actorKind: "system",
    identityState: "legacy_unknown",
    identityConfidence: "unknown",
  });
  const creator = calculateCreatorRoleCountDecision({
    eventName: "creator_profile_opened",
    eventId: "creator_evt",
    actorKind: "creator_user",
    identityState: "creator_logged_in",
    identityConfidence: "exact",
    userId: "creator_1",
    roles: ["creator"],
  });
  const paymentMissing = calculateGlobalCountDecision({
    eventName: "gumdrops_purchased",
    actorKind: "signed_in_user",
    identityState: "logged_in_unlinked",
    identityConfidence: "exact",
    userId: "user_1",
  });
  const paymentPresent = calculateGlobalCountDecision({
    eventName: "gumdrops_purchased",
    actorKind: "signed_in_user",
    identityState: "logged_in_unlinked",
    identityConfidence: "exact",
    userId: "user_1",
    providerOrderId: "order_1",
  });
  const taskMissing = calculateGlobalCountDecision({
    eventName: "task_reward_granted",
    eventId: "task_evt",
    actorKind: "signed_in_user",
    identityState: "logged_in_unlinked",
    identityConfidence: "exact",
    userId: "user_1",
    taskId: "daily_checkin",
  });
  const explanation = explainCountDecision(linkedInput);

  if (GLOBAL_USER_COUNTING_MATH_VERSION.length === 0) validationFailures.push("global user counting math version missing.");
  if (!source.engine.includes("calculateGlobalCountDecision") || !source.engine.includes("calculateLinkedPersonCountDecision")) {
    validationFailures.push("person metrics engine does not route through global-user-counting-math.");
  }
  if (!source.hydration.includes("applyDecisionGroup") || !source.hydration.includes("duplicateGuestUserCountsSuppressed")) {
    validationFailures.push("person metrics hydration does not report duplicate suppression.");
  }
  if (linkedGlobal.count !== true || linkedPerson.count !== true || linkedGuest.count !== false || linkedSignedIn.count !== true) {
    validationFailures.push("linked scope decisions do not expose the expected global, signed-in, and linked-person countability.");
  }
  if (reportHydration.scopes.global.metrics.drop_opens.count !== 1 || reportHydration.scopes.linkedPerson.metrics.drop_opens.count !== 1) {
    validationFailures.push("hydrated linked guest/user action does not count once globally and once for linked person.");
  }
  if (reportHydration.scopes.guest.metrics.drop_opens.count !== 0 || reportHydration.scopes.signedIn.metrics.drop_opens.count !== 0) {
    validationFailures.push("guest or signed-in duplicate inflated linked rollup.");
  }
  if (!linkedSuppression.suppressed || !linkedSuppression.explanation.includes("suppressed")) {
    validationFailures.push("duplicate suppression is not debug-visible.");
  }
  if (admin.count || admin.reason !== "admin_projection_excluded") validationFailures.push("admin projection counts as user behavior.");
  if (system.count || system.reason !== "system_excluded") validationFailures.push("system event counts as user behavior.");
  if (!creator.count || creator.createsSeparatePerson !== false) validationFailures.push("creator role creates duplicate person.");
  if (paymentMissing.count || paymentMissing.reason !== "payment_provider_fingerprint_required" || !paymentPresent.count) {
    validationFailures.push("payment approval dedupes without provider/order fingerprint.");
  }
  if (taskMissing.count || taskMissing.reason !== "task_reset_window_required") validationFailures.push("task reward dedupe lacks resetWindowId.");
  if (!explanation.includes("linked person") || !explanation.includes("dedupeKey")) validationFailures.push("count decision lacks explanation.");
  if (!source.packageJson.includes('"check:global-user-counting-math": "tsx scripts/agent/validate-global-user-counting-math.ts"')) {
    validationFailures.push("package script missing.");
  }

  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const openPullRequests = listOpenPrs();
  const unsafeDirty = dirtyFiles.filter((file) => file.classification === "unsafe_unknown");
  const unsafePrs = openPullRequests.filter((pr) => pr.classification === "unsafe_unknown");
  if (unsafeDirty.length) validationFailures.push(`Dirty files unclassified: ${unsafeDirty.map((file) => file.path).join(", ")}`);
  if (unsafePrs.length) validationFailures.push(`Open PRs unclassified: ${unsafePrs.map((pr) => String((pr as JsonRecord).number ?? "unknown")).join(", ")}`);

  const report = {
    reportKey: "global-user-counting-math",
    generatedAtUtc,
    currentHead,
    status: validationFailures.length ? "fail" : "pass",
    productionReadsRequired: false,
    mutationAllowed: false,
    fakeMetricsUsed: false,
    version: GLOBAL_USER_COUNTING_MATH_VERSION,
    decisions: {
      linkedGlobal,
      linkedGuest,
      linkedSignedIn,
      linkedPerson,
      linkedSuppression,
      admin,
      system,
      creator,
      paymentMissing,
      paymentPresent,
      taskMissing,
    },
    hydrationSummary: {
      globalDropOpens: reportHydration.scopes.global.metrics.drop_opens.count,
      guestDropOpens: reportHydration.scopes.guest.metrics.drop_opens.count,
      signedInDropOpens: reportHydration.scopes.signedIn.metrics.drop_opens.count,
      linkedPersonDropOpens: reportHydration.scopes.linkedPerson.metrics.drop_opens.count,
      duplicateSuppressionCount: reportHydration.validation.duplicateGuestUserCountsSuppressed,
    },
    debugLane: {
      label: "Global user counting math",
      duplicateSuppressionVisible: linkedSuppression.suppressed,
      duplicateSuppressionReason: linkedSuppression.explanation,
      rawDetailsDefaultOpen: false,
    },
    scoreBefore,
    scoreAfter: scoreSnapshot(),
    dirtyFiles,
    openPullRequests,
    validationFailures,
  };

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (validationFailures.length > 0) {
    console.error(`[global-user-counting-math] fail:\n${validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }

  console.log(`[global-user-counting-math] pass: suppressed=${report.hydrationSummary.duplicateSuppressionCount}, prs=${openPullRequests.length}.`);
}

main();
