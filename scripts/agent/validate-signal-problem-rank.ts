import { pathToFileURL } from "node:url";

import { fileExists, getPackageScripts, readJsonFile } from "./shared";
import { SIGNAL_FINDING_SCHEMA_VERSION } from "../../src/lib/agent-score/signal-finding-contract";

const REPORT_PATH = "agent/state/signal-problem-rank.generated.json";
const RANKER_SCRIPT = "tsx scripts/agent/rank-signal-problems.ts";
const VALIDATOR_SCRIPT = "tsx scripts/agent/validate-signal-problem-rank.ts";

const QUEUE_CATEGORIES = [
  "fix_now",
  "queue_later",
  "manual_evidence_required",
  "external_proof_required",
  "do_not_source_fix",
  "archive_stale_evidence",
] as const;

const FORBIDDEN_COMMAND_PATTERNS = [
  /npm run check(?:\s|$)/iu,
  /playwright/iu,
  /cypress/iu,
  /lighthouse/iu,
  /firebase\s+deploy/iu,
  /gcloud/iu,
  /paypal/iu,
  /provider API/iu,
];

type QueueCategory = typeof QUEUE_CATEGORIES[number];

type SignalProblemRankReport = {
  schemaVersion?: string;
  reportPath?: string;
  summary?: {
    rankedProblemCount?: number;
    byQueueCategory?: Record<QueueCategory, number>;
  };
  compactQueue?: Record<QueueCategory, Array<{ id?: string; score?: number; nextSafeStep?: string }>>;
  rankedProblems?: Array<{
    id?: string;
    score?: number;
    queueCategory?: QueueCategory;
    dimensions?: Record<string, unknown>;
    minimalVerification?: {
      commands?: string[];
      signoffCommands?: string[];
      blockedCommandsRequiringPromotion?: string[];
    };
  }>;
};

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function hasForbiddenCommand(commands: string[]) {
  return commands.some((command) => FORBIDDEN_COMMAND_PATTERNS.some((pattern) => pattern.test(command)));
}

export function validateSignalProblemRankReport(report: SignalProblemRankReport, packageScripts = getPackageScripts("package.json")) {
  const failures: string[] = [];
  const rankedProblems = array(report.rankedProblems) as NonNullable<SignalProblemRankReport["rankedProblems"]>;

  if (report.schemaVersion !== SIGNAL_FINDING_SCHEMA_VERSION) {
    failures.push(`schemaVersion must be ${SIGNAL_FINDING_SCHEMA_VERSION}.`);
  }
  if (report.reportPath !== REPORT_PATH) {
    failures.push(`reportPath must be ${REPORT_PATH}.`);
  }
  if (packageScripts["signal:rank"] !== RANKER_SCRIPT) {
    failures.push("package.json must keep signal:rank owned by scripts/agent/rank-signal-problems.ts.");
  }
  if (packageScripts["check:signal-problem-rank"] !== VALIDATOR_SCRIPT) {
    failures.push("package.json must expose check:signal-problem-rank as the focused validator.");
  }
  if (!rankedProblems.length) {
    failures.push("rankedProblems must include at least one finding when source findings exist.");
  }
  if (rankedProblems.length > 50) {
    failures.push("rankedProblems must stay capped at 50.");
  }

  for (const category of QUEUE_CATEGORIES) {
    const count = report.summary?.byQueueCategory?.[category];
    const queue = report.compactQueue?.[category];
    if (typeof count !== "number") {
      failures.push(`summary.byQueueCategory.${category} must be present.`);
    }
    if (!Array.isArray(queue)) {
      failures.push(`compactQueue.${category} must be present.`);
      continue;
    }
    if (queue.length > 8) {
      failures.push(`compactQueue.${category} must be capped at 8.`);
    }
  }

  const counted = QUEUE_CATEGORIES.reduce((sum, category) => sum + (report.summary?.byQueueCategory?.[category] ?? 0), 0);
  if (counted !== rankedProblems.length) {
    failures.push("summary.byQueueCategory counts must equal rankedProblems length.");
  }

  for (const problem of rankedProblems) {
    if (!problem.id || typeof problem.score !== "number") {
      failures.push("each ranked problem must include id and numeric score.");
    }
    if (!problem.queueCategory || !QUEUE_CATEGORIES.includes(problem.queueCategory)) {
      failures.push(`problem ${String(problem.id ?? "unknown")} has an invalid queueCategory.`);
    }
    for (const dimension of ["fixability", "impact", "evidenceQuality", "safety", "protectedDomainRisk"]) {
      if (typeof problem.dimensions?.[dimension] !== "number") {
        failures.push(`problem ${String(problem.id ?? "unknown")} must include dimensions.${dimension}.`);
      }
    }
    const commands = [
      ...array(problem.minimalVerification?.commands),
      ...array(problem.minimalVerification?.signoffCommands),
    ].filter((command): command is string => typeof command === "string");
    if (hasForbiddenCommand(commands)) {
      failures.push(`problem ${String(problem.id ?? "unknown")} recommends a forbidden broad/provider/browser command.`);
    }
  }

  return failures;
}

function main() {
  if (!fileExists(REPORT_PATH)) {
    throw new Error(`${REPORT_PATH} is missing. Run npm run signal:rank first.`);
  }

  const report = readJsonFile<SignalProblemRankReport>(REPORT_PATH);
  const failures = validateSignalProblemRankReport(report);
  if (failures.length > 0) {
    console.error("SIGNAL problem rank validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`SIGNAL problem rank validation passed: ranked=${report.summary?.rankedProblemCount ?? 0}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
