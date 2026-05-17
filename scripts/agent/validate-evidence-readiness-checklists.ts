import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

type ChecklistSources = {
  manual: string;
  provider: string;
  runtime: string;
  adminTruth: string;
  currentBetaExitStatus: {
    summary?: {
      visualEvidenceStatus?: string;
      providerSmokeStatus?: string;
      runtimeSmokeStatus?: string;
      adminTruthSampleStatus?: string;
      canStartBetaExitReview?: boolean;
    };
    nextExactSteps?: string[];
  };
};

const root = process.cwd();

const paths = {
  manual: "docs/agent-truth/manual-screenshot-qa-checklist.md",
  provider: "docs/agent-truth/provider-smoke-evidence-checklist.md",
  runtime: "docs/agent-truth/runtime-smoke-evidence-checklist.md",
  adminTruth: "docs/agent-truth/admin-truth-sample-evidence-checklist.md",
  currentStatus: "agent/state/current-beta-exit-status.generated.json",
};

function readRequired(relativePath: string, failures: string[]) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function readJson<T>(relativePath: string, failures: string[]): T | null {
  const source = readRequired(relativePath, failures);
  if (!source) return null;
  try {
    return JSON.parse(source) as T;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function requireIncludes(source: string, expected: string, label: string, failures: string[]) {
  if (!source.includes(expected)) failures.push(`${label} must include "${expected}".`);
}

function includesAny(source: string, values: string[]) {
  return values.some((value) => source.includes(value));
}

function evidenceMissing(status = "") {
  return /(false|missing|unverified|unknown|source_only)/iu.test(status);
}

export function validateEvidenceReadinessChecklists(sources: ChecklistSources) {
  const failures: string[] = [];

  for (const route of [
    "/",
    "/drops",
    "/drops/[id]/preview",
    "/dashboard",
    "/dashboard/creator",
    "/dashboard/profile",
    "/dashboard/settings",
    "/dashboard/library",
    "/dashboard/chat",
    "/creators/[username]",
    "Wallet / GumDrop purchase modal",
    "Creator profile Fan Pass",
    "Creator profile requests",
    "Creator profile booking slots",
    "Creator owner profile mode",
    "Beta release notes drawer",
    "Mobile nav/sidebar/profile dropdown",
  ]) {
    requireIncludes(sources.manual, route, "manual screenshot checklist", failures);
  }
  for (const expected of [
    "What to capture",
    "Failure looks like",
    "Evidence filename pattern",
    "Source validator/report",
    "Blocking beta exit",
    "screenshotEvidenceAttached=false",
  ]) {
    requireIncludes(sources.manual, expected, "manual screenshot checklist", failures);
  }

  for (const expected of [
    "PayPal order create",
    "PayPal capture",
    "GumDrop purchased balance increase",
    "Paid bonus remains purchased balance",
    "Reward balance does not fund creator experience",
    "Creator request paid spend",
    "Booking slot paid spend",
    "Subscription paid spend if safe",
    "Do not paste secrets",
    "redactionsApplied",
  ]) {
    requireIncludes(sources.provider, expected, "provider smoke checklist", failures);
  }

  for (const expected of [
    "Deployed home route `/` loads",
    "`/drops` loads public discovery",
    "`/creators/[username]` loads a creator profile",
    "Booking slot flow renders",
    "`/dashboard/creator` loads",
    "`/dashboard/chat` shell loads",
    "Beta release notes drawer opens",
    "API health/runtime route if an existing safe route is available",
    "Do not make provider calls",
  ]) {
    requireIncludes(sources.runtime, expected, "runtime smoke checklist", failures);
  }

  for (const expected of [
    "Redaction rules",
    "sourceFreshnessUtc",
    "sampleCount",
    "Redacted screenshot",
    "Redacted JSON sample",
    "Do not call admin truth passed without an attached artifact path",
  ]) {
    requireIncludes(sources.adminTruth, expected, "admin truth sample checklist", failures);
  }

  const combinedChecklists = [
    sources.manual,
    sources.provider,
    sources.runtime,
    sources.adminTruth,
  ].join("\n");
  if (/\bevidence\s+(is\s+)?(passed|complete|completed|verified)\b/iu.test(combinedChecklists)) {
    failures.push("checklists must not say evidence is passed without an artifact.");
  }

  const summary = sources.currentBetaExitStatus.summary ?? {};
  const evidenceStillMissing = evidenceMissing(summary.visualEvidenceStatus)
    || evidenceMissing(summary.providerSmokeStatus)
    || evidenceMissing(summary.runtimeSmokeStatus)
    || evidenceMissing(summary.adminTruthSampleStatus);
  if (evidenceStillMissing && summary.canStartBetaExitReview) {
    failures.push("current beta exit status must not mark beta exit ready while evidence is missing.");
  }

  const steps = sources.currentBetaExitStatus.nextExactSteps ?? [];
  for (const checklistPath of [
    paths.manual,
    paths.provider,
    paths.runtime,
    paths.adminTruth,
  ]) {
    if (!includesAny(steps.join("\n"), [checklistPath])) {
      failures.push(`current beta exit status nextExactSteps must reference ${checklistPath}.`);
    }
  }

  return failures;
}

function main() {
  const failures: string[] = [];
  const sources: ChecklistSources = {
    manual: readRequired(paths.manual, failures),
    provider: readRequired(paths.provider, failures),
    runtime: readRequired(paths.runtime, failures),
    adminTruth: readRequired(paths.adminTruth, failures),
    currentBetaExitStatus: readJson<ChecklistSources["currentBetaExitStatus"]>(paths.currentStatus, failures) ?? {},
  };

  failures.push(...validateEvidenceReadinessChecklists(sources));

  if (failures.length > 0) {
    console.error("Evidence readiness checklist validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("Evidence readiness checklists validation passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
