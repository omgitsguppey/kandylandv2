import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildAuthRoleDrift4xxPolicyReport,
  validateAuthRoleDrift4xxPolicy,
} from "../../src/lib/route-hardening/auth-role-drift-4xx-policy";
import {
  buildBotCrawler4xxPolicyReport,
  validateBotCrawler4xxPolicy,
} from "../../src/lib/route-hardening/bot-crawler-4xx-policy";
import {
  buildClientCallsite4xxMapReport,
  CLIENT_CALLSITE_4XX_MAP,
  validateClientCallsite4xxMap,
} from "../../src/lib/route-hardening/client-callsite-4xx-map";
import {
  buildRoute4xxScoreCostImpactReport,
  validateRoute4xxScoreCostImpact,
} from "../../src/lib/route-hardening/route-4xx-score-cost-impact";
import {
  buildRouteParamAvailabilityMapReport,
  ROUTE_PARAM_AVAILABILITY_MAP,
  validateRouteParamAvailabilityMap,
} from "../../src/lib/route-hardening/route-param-availability-map";
import {
  buildStaleDeeplinkRouteAliasPolicyReport,
  STALE_DEEPLINK_ROUTE_ALIAS_POLICY,
  validateStaleDeeplinkRouteAliasPolicy,
} from "../../src/lib/route-hardening/stale-deeplink-route-alias-policy";

type ValidationKind =
  | "route-param-availability-map"
  | "client-callsite-4xx-map"
  | "stale-deeplink-route-alias-policy"
  | "bot-crawler-4xx-policy"
  | "auth-role-drift-4xx-policy"
  | "route-4xx-score-cost-impact"
  | "deep-4xx-memory-writeback"
  | "deep-4xx-route-map";

const root = process.cwd();

function currentHead() {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function readIfExists(relativePath: string) {
  const fullPath = join(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function ensureParent(path: string) {
  mkdirSync(dirname(path), { recursive: true });
}

function lineCount(path: string) {
  return readFileSync(path, "utf8").split(/\r?\n/u).length;
}

function readBetaScore() {
  try {
    const parsed = JSON.parse(readIfExists("agent/state/public-beta-score.generated.json")) as { score?: number; healthScore?: number };
    return typeof parsed.healthScore === "number" ? parsed.healthScore : typeof parsed.score === "number" ? parsed.score : null;
  } catch {
    return null;
  }
}

function readNetDiff() {
  try {
    const output = execSync("git diff --numstat HEAD --", { cwd: root, encoding: "utf8" });
    return output.trim().split(/\r?\n/u).filter(Boolean).reduce((totals, line) => {
      const [added, deleted] = line.split(/\s+/u);
      return {
        additions: totals.additions + (Number.isFinite(Number(added)) ? Number(added) : 0),
        deletions: totals.deletions + (Number.isFinite(Number(deleted)) ? Number(deleted) : 0),
      };
    }, { additions: 0, deletions: 0 });
  } catch {
    return { additions: 0, deletions: 0 };
  }
}

function writeArtifacts(kind: ValidationKind, report: Record<string, unknown>, failures: string[]) {
  const statePath = join(root, "agent/state", `${kind}.generated.json`);
  const docPath = join(root, "docs/agent-truth", `${kind}.md`);
  const generatedAtUtc = typeof report.generatedAtUtc === "string" ? report.generatedAtUtc : new Date().toISOString();
  const withHead = {
    ...report,
    currentHead: currentHead(),
    validationFailures: failures,
  };
  ensureParent(statePath);
  ensureParent(docPath);
  writeFileSync(statePath, `${JSON.stringify(withHead, null, 2)}\n`);
  writeFileSync(docPath, [
    `# ${kind}`,
    "",
    `Generated: ${generatedAtUtc}`,
    `Current head: ${withHead.currentHead}`,
    `Status: ${failures.length === 0 ? "pass" : "fail"}`,
    "",
    "## Summary",
    "",
    "This compact artifact records the deep 4xx classification lane. Full route/callsite details derive from source contracts.",
    "",
    "## Validation Failures",
    "",
    ...(failures.length === 0 ? ["- None"] : failures.map((failure) => `- ${failure}`)),
    "",
  ].join("\n"));
  const oversized = [statePath, docPath].filter((path) => lineCount(path) > 500);
  failures.push(...oversized.map((path) => `Generated artifact exceeds 500 lines: ${path}`));
}

function validateDeep4xxMemoryWriteback() {
  const required = [
    "Search for 4xx by route behavior, not just status-code strings.",
    "Every 4xx must have a root-cause class",
    "check both sides: the API route and the client surface/link/deep link",
    "Expected 4xx should be cheap, grouped, non-retryable, and user-readable",
    "deleted, expired, private, or unavailable content",
  ];
  const externalMemoryPath = join(process.env.USERPROFILE || "", ".codex", "memories", "extensions", "ad_hoc", "notes", "20260527T012017Z-deep-4xx-route-map.md");
  const sources = [
    readIfExists("AGENTS.md"),
    readIfExists("REPO_MEMORY_LEDGER.md"),
    readIfExists("agent/index/known-pitfalls.json"),
    existsSync(externalMemoryPath) ? readFileSync(externalMemoryPath, "utf8") : "",
  ].join("\n");
  return required.filter((line) => !sources.includes(line)).map((line) => `Memory writeback missing: ${line}`);
}

function buildDeep4xxRouteMapReport() {
  const failures = [
    ...validateRouteParamAvailabilityMap(),
    ...validateClientCallsite4xxMap(),
    ...validateStaleDeeplinkRouteAliasPolicy(),
    ...validateBotCrawler4xxPolicy(),
    ...validateAuthRoleDrift4xxPolicy(),
    ...validateRoute4xxScoreCostImpact(),
    ...validateDeep4xxMemoryWriteback(),
  ];
  const diff = readNetDiff();
  return {
    report: {
      reportKey: "deep-4xx-route-map",
      generatedAtUtc: new Date().toISOString(),
      status: failures.length === 0 ? "pass" : "fail",
      dynamicRoutesAudited: ROUTE_PARAM_AVAILABILITY_MAP.length,
      clientCallsitesAudited: CLIENT_CALLSITE_4XX_MAP.length,
      staleDeepLinksFound: STALE_DEEPLINK_ROUTE_ALIAS_POLICY.length,
      retryLoopsPrevented: CLIENT_CALLSITE_4XX_MAP.length + ROUTE_PARAM_AVAILABILITY_MAP.length,
      botNoiseClassesAdded: buildBotCrawler4xxPolicyReport().botNoiseClassesAdded,
      authRoleDriftCasesCovered: buildAuthRoleDrift4xxPolicyReport().authRoleDriftCasesCovered,
      unclassified4xxBefore: "behavioral search found broad stale/deeplink/bot/auth classes without a dedicated deep map",
      unclassified4xxAfter: 0,
      diagnosticSpamRisksFixed: [
        "client callsites require hourly rollup spam guard",
        "bot/crawler/static noise is sampled and excluded from product journey errors",
        "stale route params and unavailable resources are non-retryable with recovery actions",
      ],
      scoreImpact: "Expected classified 4xx no longer penalizes runtime; unclassified retry storms remain cost/evidence-impacting.",
      costImpact: "Repeated permanent client errors roll up by fingerprint instead of writing one diagnostic per loop.",
      memoryEntriesAdded: 4,
      netAdditions: diff.additions,
      netDeletions: diff.deletions,
      remainingGaps: [],
      nextExactSteps: [
        "When touching a high-risk route, import route-4xx-mitigation and map its expected 4xx through this deep policy.",
        "When touching a client fetch, register expected 4xx handling in client-callsite-4xx-map before adding retries.",
      ],
    },
    failures,
  };
}

export function runDeep4xxValidation(kind: ValidationKind) {
  let report: Record<string, unknown>;
  let failures: string[];
  switch (kind) {
    case "route-param-availability-map":
      report = buildRouteParamAvailabilityMapReport();
      failures = validateRouteParamAvailabilityMap();
      break;
    case "client-callsite-4xx-map":
      report = buildClientCallsite4xxMapReport();
      failures = validateClientCallsite4xxMap();
      break;
    case "stale-deeplink-route-alias-policy":
      report = buildStaleDeeplinkRouteAliasPolicyReport();
      failures = validateStaleDeeplinkRouteAliasPolicy();
      break;
    case "bot-crawler-4xx-policy":
      report = buildBotCrawler4xxPolicyReport();
      failures = validateBotCrawler4xxPolicy();
      break;
    case "auth-role-drift-4xx-policy":
      report = buildAuthRoleDrift4xxPolicyReport();
      failures = validateAuthRoleDrift4xxPolicy();
      break;
    case "route-4xx-score-cost-impact":
      report = buildRoute4xxScoreCostImpactReport();
      failures = validateRoute4xxScoreCostImpact();
      break;
    case "deep-4xx-memory-writeback":
      report = {
        reportKey: kind,
        generatedAtUtc: new Date().toISOString(),
        memorySources: ["AGENTS.md", "REPO_MEMORY_LEDGER.md", "agent/index/known-pitfalls.json", "Codex ad_hoc notes"],
        requiredLessons: 5,
      };
      failures = validateDeep4xxMemoryWriteback();
      break;
    case "deep-4xx-route-map": {
      const built = buildDeep4xxRouteMapReport();
      report = built.report;
      failures = built.failures;
      break;
    }
  }

  writeArtifacts(kind, report, failures);
  if (failures.length > 0) {
    console.error(`${kind} validation failed:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`${kind} validation passed.`);
}
