import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  SESSION_ACTIVE_ACTIVITY_WINDOW_MS,
  SESSION_INACTIVITY_TIMEOUT_MS,
  calculateJourneyStepDuration,
  calculateSessionActiveMs,
  calculateSessionHiddenMs,
  calculateSessionIdleMs,
  classifyBounce,
  classifyEngagedSession,
  classifyMeaningfulInteraction,
  classifySessionCloseout,
  linkGuestUserSession,
} from "@/lib/math/session-journey-math";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/session-journey-duration-math.generated.json";
const DOC_PATH = "docs/agent-truth/session-journey-duration-math.md";
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
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) files.add(line.replace(/\\/gu, "/"));
  }
  return [...files].sort();
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === REPORT_PATH || normalized === SCORE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (
    normalized === "src/lib/math/session-journey-math.ts"
    || normalized === "src/lib/analytics/session-metrics-contract.ts"
    || normalized === "src/lib/analytics/session-metrics-engine.ts"
    || normalized === "src/lib/analytics/person-metrics-hydration.ts"
    || normalized === "src/lib/behavioral/user-journey-builder.ts"
  ) return "real_source_change_needs_review";
  if (
    normalized === "scripts/agent/validate-session-journey-duration-math.ts"
    || normalized === "scripts/agent/validate-session-bounce-calculation.ts"
    || normalized === "scripts/agent/validate-user-journey-behavioral-intelligence.ts"
  ) return "validator_artifact_expected";
  if (
    normalized === "tests/unit/session-journey-duration-math.spec.ts"
    || normalized === "tests/unit/session-bounce-calculation.spec.ts"
  ) return "test_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized.startsWith("src/lib/release-notes/")
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/paypal|payment|gumdrop|wallet/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function classifyOpenPr(pr: JsonRecord) {
  const title = String(pr.title ?? "");
  if (/dependency|deps|npm|knip|syncpack|puppeteer/iu.test(title)) return "dependency_update_external_review_required";
  if (/sentinel|security|Math\.random|ID generation/iu.test(title)) return "security_patch_external_review_required";
  if (/bolt|performance|Map lookup/iu.test(title)) return "performance_patch_external_review_required";
  if (/palette|accessibility|loading states/iu.test(title)) return "accessibility_patch_external_review_required";
  if (/onboarding/iu.test(title)) return "onboarding_telemetry_external_review_required";
  if (/doctrine/iu.test(title)) return "doctrine_governance_external_review_required";
  if (/monolith|responsibility boundaries/iu.test(title)) return "architecture_refactor_external_review_required";
  return "external_review_required";
}

function parseOpenPrs() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") {
    return [{
      number: 0,
      title: "GitHub open PR evidence not queried",
      url: "",
      mergeStateStatus: "EXTERNAL_EVIDENCE_REQUIRED",
      isDraft: false,
      classification: "external_evidence_required",
    }];
  }
  const raw = run("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"]);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as JsonRecord[];
  return parsed.map((pr) => ({
    number: pr.number,
    title: String(pr.title ?? ""),
    url: String(pr.url ?? ""),
    mergeStateStatus: String(pr.mergeStateStatus ?? "UNKNOWN"),
    isDraft: Boolean(pr.isDraft),
    classification: classifyOpenPr(pr),
  }));
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

function renderDoc(report: JsonRecord) {
  const failures = report.validationFailures as string[];
  const dirtyRows = report.dirtyFiles as Array<{ path: string; classification: string }>;
  const openPullRequests = report.openPullRequests as Array<{ number: unknown; title: string; classification: string }>;
  const debugLane = report.debugLane as JsonRecord;
  return [
    "# Session Journey Duration Math",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Contract",
    "",
    `- Session inactivity timeout: ${SESSION_INACTIVITY_TIMEOUT_MS}ms.`,
    `- Active foreground activity window: ${SESSION_ACTIVE_ACTIVITY_WINDOW_MS}ms.`,
    "- Hidden/background time is excluded from active time.",
    "- Idle begins after 30 seconds without meaningful interaction.",
    "- Bounce requires one route, no meaningful interaction, activeMs < 10000, no conversion, and non-unknown closeout.",
    "- Unknown closeout downgrades confidence and does not auto-count as bounce.",
    "- Guest-to-user handoff preserves continuity in the same session or within five minutes of auth transition.",
    "",
    "## Debug Lane",
    "",
    `- Label: ${debugLane.label}`,
    `- Unknown closeouts: ${debugLane.unknownCloseoutCount}`,
    `- Hidden time excluded: ${debugLane.hiddenTimeExcludedCount}`,
    `- Bounce classifications: ${debugLane.bounceClassifiedCount}`,
    `- Guest/user continuity links: ${debugLane.guestUserContinuityCount}`,
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows.map((file) => `- ${file.path}: ${file.classification}`) : ["- none"]),
    "",
    "## Open PR Evidence",
    "",
    ...(openPullRequests.length
      ? openPullRequests.map((entry) => `- #${String(entry.number)} ${entry.title}: ${entry.classification}`)
      : ["- No open PR evidence attached. This cannot clear PR/release gates."]),
    "",
    "## Validation Failures",
    "",
    ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const failures: string[] = [];
  const intervals = [
    { startedAtMs: 0, endedAtMs: 20_000, foreground: true, lastMeaningfulInteractionAtMs: 0 },
    { startedAtMs: 20_000, endedAtMs: 60_000, foreground: true, lastMeaningfulInteractionAtMs: 0 },
    { startedAtMs: 60_000, endedAtMs: 90_000, foreground: false, lastMeaningfulInteractionAtMs: 60_000 },
  ];
  const activeMs = calculateSessionActiveMs({ intervals });
  const idleMs = calculateSessionIdleMs({ intervals });
  const hiddenMs = calculateSessionHiddenMs({ intervals });
  const observedBounce = classifyBounce({ routeCount: 1, meaningfulInteractionCount: 0, activeMs: 9_999, conversionCount: 0, closeout: "observed_closeout" });
  const conversionBounce = classifyBounce({ routeCount: 1, meaningfulInteractionCount: 0, activeMs: 9_999, conversionCount: 1, closeout: "observed_closeout" });
  const unknownCloseout = classifySessionCloseout({ closeoutObserved: false, endReason: "missing_closeout" });
  const unknownBounce = classifyBounce({ routeCount: 1, meaningfulInteractionCount: 0, activeMs: 0, conversionCount: 0, closeout: unknownCloseout.closeout });
  const engaged = classifyEngagedSession({ routeCount: 1, meaningfulInteractionCount: 0, activeMs: 10_000, conversionCount: 0 });
  const journeyDuration = calculateJourneyStepDuration({ startedAtMs: 1_000, endedAtMs: 8_000, activeMs: 5_000 });
  const missingJourneyDuration = calculateJourneyStepDuration({ startedAtMs: 1_000 });
  const handoff = linkGuestUserSession({
    guestSessionId: "session-1",
    userSessionId: "session-2",
    guestEventAtMs: 10_000,
    authTransitionAtMs: 250_000,
    guestId: "guest-1",
    userId: "user-1",
  });
  const source = {
    math: read("src/lib/math/session-journey-math.ts"),
    engine: read("src/lib/analytics/session-metrics-engine.ts"),
    journey: read("src/lib/behavioral/user-journey-builder.ts"),
    packageJson: read("package.json"),
  };

  if (activeMs !== 30_000 || idleMs !== 30_000 || hiddenMs !== 30_000) failures.push("active/idle/hidden distribution does not match canonical session math.");
  if (observedBounce.bounceStatus !== "bounced") failures.push("canonical bounce formula does not classify proven one-page no-action sessions.");
  if (conversionBounce.bounceStatus !== "not_bounced") failures.push("one-page conversion counts as bounce.");
  if (unknownCloseout.closeout !== "unknown_closeout" || unknownBounce.bounceStatus !== "unknown") failures.push("unknown closeout auto-counts bounce.");
  if (engaged.engagementStatus !== "engaged") failures.push("engaged session threshold is missing.");
  if (!classifyMeaningfulInteraction({ eventName: "drop_unlocked" }).meaningful || classifyMeaningfulInteraction({ eventName: "session_activity_tick" }).meaningful) {
    failures.push("meaningful interaction classifier is wrong.");
  }
  if (journeyDuration.durationMs !== 7_000 || journeyDuration.activeMs !== 5_000 || missingJourneyDuration.confidence !== "unavailable") {
    failures.push("journey duration missing or invented.");
  }
  if (!handoff.preservedSessionContinuity || !handoff.doubleCountSuppressed) failures.push("guest/user auth handoff breaks session continuity.");
  if (!source.engine.includes("@/lib/math/session-journey-math")) failures.push("session metrics engine does not use canonical session journey math.");
  if (!source.journey.includes("calculateJourneyStepDuration")) failures.push("journey builder does not use canonical journey duration math.");
  if (!source.packageJson.includes('"check:session-journey-duration-math"')) failures.push("package script check:session-journey-duration-math missing.");

  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  if (dirtyFiles.some((file) => file.classification === "unsafe_unknown")) failures.push("dirty files are unclassified.");
  const openPullRequests = parseOpenPrs();
  if (openPullRequests.some((pr) => pr.classification === "external_review_required")) failures.push("open PRs are unclassified.");

  const scoreBefore = scoreSnapshot();
  const report = {
    reportKey: "session-journey-duration-math",
    generatedAtUtc: new Date().toISOString(),
    currentHead: run("git", ["rev-parse", "HEAD"]) || "unknown",
    status: failures.length ? "fail" : "pass",
    productionReadsRequired: false,
    mutationAllowed: false,
    fakeSessionEndsUsed: false,
    scoreBefore,
    scoreAfter: scoreBefore,
    debugLane: {
      label: "Session math",
      activeMs,
      idleMs,
      hiddenMs,
      unknownCloseoutCount: unknownCloseout.closeout === "unknown_closeout" ? 1 : 0,
      bounceClassifiedCount: observedBounce.bounceStatus === "bounced" ? 1 : 0,
      hiddenTimeExcludedCount: hiddenMs > 0 ? 1 : 0,
      guestUserContinuityCount: handoff.preservedSessionContinuity ? 1 : 0,
      suspiciousPageTimeOnlySessions: 0,
      sourceOfTruth: "src/lib/math/session-journey-math.ts",
    },
    decisions: {
      activeMs,
      idleMs,
      hiddenMs,
      observedBounce,
      conversionBounce,
      unknownCloseout,
      unknownBounce,
      engaged,
      journeyDuration,
      missingJourneyDuration,
      handoff,
    },
    openPullRequests,
    dirtyFiles,
    validationFailures: failures,
  };

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));
  if (failures.length) {
    console.error("[session-journey-duration-math] fail:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`[session-journey-duration-math] pass: active=${activeMs}, idle=${idleMs}, hidden=${hiddenMs}, prs=${openPullRequests.length}.`);
}

main();
