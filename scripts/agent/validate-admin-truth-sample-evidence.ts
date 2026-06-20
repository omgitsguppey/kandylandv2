import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type EvidenceStatus = "missing" | "incomplete" | "complete" | "stale";

type ValidationOptions = {
  requireComplete?: boolean;
  existingPaths?: Set<string>;
};

type LaneEvaluation = {
  lane: "adminTruthSampleEvidence";
  status: EvidenceStatus;
  folder: string;
  templatePath: string;
  templateExists: boolean;
  evidenceFiles: string[];
  completeArtifacts: string[];
  passingArtifacts: string[];
  launchHistoryCoverageArtifacts: string[];
  staleArtifacts: string[];
  staleReasons: string[];
  failures: string[];
};

const REQUIRED_ADMIN_TRUTH_CHECKS = [
  "source-freshness",
  "sample-count",
  "source-state-label",
  "redacted-artifact-attached",
] as const;

const LAUNCH_HISTORY_COVERAGE_CHECK_ID = "launch-history-coverage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const evidenceFolder = "agent/evidence/admin-truth-sample";
const templatePath = `${evidenceFolder}/evidence.template.json`;
const MAX_ADMIN_TRUTH_SAMPLE_AGE_HOURS = 24;
const secretPatterns = [
  /access_token/i,
  /refresh_token/i,
  /id_token/i,
  /client_secret/i,
  /private_key/i,
  /authorization\s*[:=]/i,
  /bearer\s+[a-z0-9._-]{12,}/i,
];

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function isValidUtc(value: unknown) {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function isRelativeEvidencePath(value: unknown) {
  return typeof value === "string" && value.length > 0 && !isAbsolute(value) && !/^[a-z]+:/iu.test(value);
}

function pathExists(relativePath: string, options: ValidationOptions) {
  if (options.existingPaths) return options.existingPaths.has(relativePath);
  return existsSync(join(repoRoot, relativePath));
}

function containsRawSecret(value: unknown) {
  const source = JSON.stringify(value);
  return secretPatterns.some((pattern) => pattern.test(source));
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function hoursBetween(leftUtc: string, rightUtc: string) {
  const left = Date.parse(leftUtc);
  const right = Date.parse(rightUtc);
  if (Number.isNaN(left) || Number.isNaN(right)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (right - left) / (60 * 60 * 1000));
}

export function adminTruthSampleEvidenceStaleReasons(
  document: unknown,
  options: {
    currentHead?: string;
    nowUtc?: string;
    maxAgeHours?: number;
  } = {},
) {
  const doc = record(document);
  if (doc.status !== "complete") return [];

  const reasons: string[] = [];
  const expectedHead = options.currentHead ?? currentHead();
  const artifactHead = typeof doc.currentHead === "string" && doc.currentHead.trim()
    ? doc.currentHead.trim()
    : typeof doc.sourceCommit === "string" && doc.sourceCommit.trim()
      ? doc.sourceCommit.trim()
      : "";
  if (!artifactHead) {
    reasons.push("admin truth complete evidence must include currentHead or sourceCommit to clear the current-code gate.");
  } else if (artifactHead !== expectedHead) {
    reasons.push(`admin truth evidence currentHead ${artifactHead} does not match ${expectedHead}.`);
  }

  const nowUtc = options.nowUtc ?? new Date().toISOString();
  const maxAgeHours = options.maxAgeHours ?? MAX_ADMIN_TRUTH_SAMPLE_AGE_HOURS;
  const sourceFreshnessUtc = typeof doc.sourceFreshnessUtc === "string" ? doc.sourceFreshnessUtc : "";
  if (!sourceFreshnessUtc || hoursBetween(sourceFreshnessUtc, nowUtc) > maxAgeHours) {
    reasons.push(`admin truth sourceFreshnessUtc is older than ${maxAgeHours}h or missing.`);
  }

  return reasons;
}

function normalizedDayRows(value: unknown) {
  return array(value)
    .map(record)
    .filter((day) => typeof day.dayKey === "string" && day.dayKey.trim().length > 0)
    .map((day) => ({
      ...day,
      dayKey: String(day.dayKey).trim(),
    }));
}

export function adminTruthSampleLaunchHistoryCoverageFailures(document: unknown) {
  const doc = record(document);
  const checks = array(doc.checks).map(record);
  const launchCheck = checks.find((check) => check.id === LAUNCH_HISTORY_COVERAGE_CHECK_ID);
  const coverage = record(doc.launchHistoryCoverage);
  const hasCoverage = Object.keys(coverage).length > 0;
  const failures: string[] = [];

  if (!hasCoverage) {
    if (launchCheck?.status === "pass") {
      failures.push("admin truth launch-history coverage check cannot pass without launchHistoryCoverage rows.");
    }
    return failures;
  }

  if (!launchCheck) {
    failures.push('admin truth evidence with launchHistoryCoverage must include check "launch-history-coverage".');
  }

  const rangeProof = record(coverage.rangeProof);
  const allLaunchRangeProven = rangeProof.allLaunchRangeProven === true;
  const dayRows = normalizedDayRows(coverage.days);
  const expectedDayCount = typeof coverage.expectedDayCount === "number" && Number.isFinite(coverage.expectedDayCount)
    ? coverage.expectedDayCount
    : dayRows.length;
  const rangeStartDayKey = typeof coverage.rangeStartDayKey === "string" ? coverage.rangeStartDayKey.trim() : "";
  const rangeEndDayKey = typeof coverage.rangeEndDayKey === "string" ? coverage.rangeEndDayKey.trim() : "";
  const firstDayKey = dayRows[0]?.dayKey ?? "";
  const lastDayKey = dayRows[dayRows.length - 1]?.dayKey ?? "";

  if (launchCheck?.status === "pass" && !allLaunchRangeProven) {
    failures.push("admin truth launch-history coverage check cannot pass unless rangeProof.allLaunchRangeProven is true.");
  }
  if (allLaunchRangeProven && launchCheck?.status !== "pass") {
    failures.push("admin truth launchHistoryCoverage cannot claim allLaunchRangeProven without a passing launch-history-coverage check.");
  }
  if (allLaunchRangeProven && dayRows.length === 0) {
    failures.push("admin truth launchHistoryCoverage must include day rows when allLaunchRangeProven is true.");
  }
  if (allLaunchRangeProven && expectedDayCount !== dayRows.length) {
    failures.push("admin truth launchHistoryCoverage expectedDayCount must match day rows when allLaunchRangeProven is true.");
  }
  if (allLaunchRangeProven && rangeStartDayKey !== firstDayKey) {
    failures.push("admin truth launchHistoryCoverage rangeStartDayKey must match the first day row.");
  }
  if (allLaunchRangeProven && rangeEndDayKey !== lastDayKey) {
    failures.push("admin truth launchHistoryCoverage rangeEndDayKey must match the last day row.");
  }

  return failures;
}

export function validateAdminTruthSampleEvidenceDocument(
  document: unknown,
  options: ValidationOptions = {},
) {
  const failures: string[] = [];
  const doc = record(document);

  if (containsRawSecret(doc)) {
    failures.push("admin truth evidence must not include raw secrets or provider tokens.");
  }
  if (doc.status === "template_not_evidence") {
    if (options.requireComplete) failures.push("admin truth evidence template is not completed evidence.");
    return failures;
  }
  if (!["complete", "incomplete"].includes(String(doc.status))) {
    failures.push("admin truth evidence status must be complete, incomplete, or template_not_evidence.");
  }
  if (options.requireComplete && doc.status !== "complete") {
    failures.push("admin truth evidence must be complete.");
  }
  if (doc.status !== "complete") return failures;

  if (!isValidUtc(doc.capturedAtUtc)) failures.push("admin truth complete evidence must include capturedAtUtc.");
  if (doc.surface !== "admin_truth_sample") failures.push("admin truth complete evidence surface must be admin_truth_sample.");
  if (!isValidUtc(doc.sourceFreshnessUtc)) {
    failures.push("admin truth complete evidence must include sourceFreshnessUtc.");
  }
  if (array(doc.redactions).length === 0) {
    failures.push("admin truth complete evidence must include at least one redaction entry.");
  }
  if (!isRelativeEvidencePath(doc.artifactPath)) {
    failures.push("admin truth complete evidence artifactPath must be a relative path.");
  } else if (!pathExists(String(doc.artifactPath), options)) {
    failures.push("admin truth complete evidence artifactPath must exist.");
  }

  const checks = array(doc.checks).map(record);
  const seenChecks = new Set(checks.map((check) => check.id).filter((id): id is string => typeof id === "string"));
  for (const requiredCheck of REQUIRED_ADMIN_TRUTH_CHECKS) {
    if (!seenChecks.has(requiredCheck)) {
      failures.push(`admin truth complete evidence must include check "${requiredCheck}".`);
    }
  }
  for (const check of checks) {
    if (!["pass", "fail", "blocked"].includes(String(check.status))) {
      failures.push(`admin truth check "${String(check.id ?? "unknown")}" must use pass, fail, or blocked status.`);
    }
  }
  failures.push(...adminTruthSampleLaunchHistoryCoverageFailures(doc));

  return failures;
}

function readJson(relativePath: string) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8")) as unknown;
}

function listEvidenceFiles() {
  const folder = join(repoRoot, evidenceFolder);
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((entry) => entry.endsWith(".json") && entry !== "evidence.template.json")
    .map((entry) => `${evidenceFolder}/${entry}`);
}

export function evaluateAdminTruthSampleEvidence(): LaneEvaluation {
  const files = listEvidenceFiles();
  const failures: string[] = [];
  const completeArtifacts: string[] = [];
  const passingArtifacts: string[] = [];
  const launchHistoryCoverageArtifacts: string[] = [];
  const staleArtifacts: string[] = [];
  const staleReasons: string[] = [];
  const head = currentHead();
  const nowUtc = new Date().toISOString();

  for (const file of files) {
    try {
      const document = readJson(file);
      const validationFailures = validateAdminTruthSampleEvidenceDocument(document, { requireComplete: true });
      if (validationFailures.length === 0) {
        completeArtifacts.push(file);
        const checks = array(record(document).checks).map(record);
        const hasPassingLaunchCoverageCheck = checks.some((check) =>
          check.id === LAUNCH_HISTORY_COVERAGE_CHECK_ID && check.status === "pass"
        );
        const launchCoverage = record(record(document).launchHistoryCoverage);
        const launchRangeProof = record(launchCoverage.rangeProof);
        if (hasPassingLaunchCoverageCheck && launchRangeProof.allLaunchRangeProven === true) {
          launchHistoryCoverageArtifacts.push(file);
        }
        if (checks.length > 0 && checks.every((check) => check.status === "pass")) {
          const documentStaleReasons = adminTruthSampleEvidenceStaleReasons(document, {
            currentHead: head,
            nowUtc,
          });
          if (documentStaleReasons.length > 0) {
            staleArtifacts.push(file);
            staleReasons.push(...documentStaleReasons.map((reason) => `${file}: ${reason}`));
          } else {
            passingArtifacts.push(file);
          }
        }
      } else if (containsRawSecret(document)) {
        failures.push(...validationFailures);
      }
    } catch (error) {
      failures.push(`${file} must be valid JSON: ${(error as Error).message}`);
    }
  }

  const status: EvidenceStatus = passingArtifacts.length > 0
    ? "complete"
    : staleArtifacts.length > 0
      ? "stale"
      : files.length > 0
        ? "incomplete"
        : "missing";

  return {
    lane: "adminTruthSampleEvidence",
    status,
    folder: evidenceFolder,
    templatePath,
    templateExists: existsSync(join(repoRoot, templatePath)),
    evidenceFiles: files,
    completeArtifacts,
    passingArtifacts,
    launchHistoryCoverageArtifacts,
    staleArtifacts,
    staleReasons,
    failures,
  };
}

function writeGeneratedState(result: LaneEvaluation) {
  const head = currentHead();
  const generatedAtUtc = new Date().toISOString();
  const passed = result.passingArtifacts.length > 0;
  const status = passed
    ? "formal_admin_truth_sample_passed"
    : result.status === "stale"
      ? "stale_admin_truth_sample_evidence"
      : result.status === "incomplete"
        ? "failed"
        : "missing_or_unknown";
  const report = {
    generatedAtUtc,
    reportKey: "admin-truth-sample-evidence",
    currentHead: head,
    sourceCommit: head,
    overallStatus: status,
    status,
    freshAdminTruthSampleAttached: passed,
    productionSampleAttached: result.completeArtifacts.length > 0,
    formalAdminTruthSamplePassed: passed,
    launchHistoryCoverageSampleAttached: result.launchHistoryCoverageArtifacts.length > 0,
    launchHistoryCoverageSampleCount: result.launchHistoryCoverageArtifacts.length,
    sampleCount: result.passingArtifacts.length,
    completeSampleCount: result.completeArtifacts.length,
    staleSampleCount: result.staleArtifacts.length,
    passed,
    evidenceFiles: result.evidenceFiles,
    completeArtifacts: result.completeArtifacts,
    passingArtifacts: result.passingArtifacts,
    staleArtifacts: result.staleArtifacts,
    staleReasons: result.staleReasons,
    readinessImpact: {
      adminTruthSampleGatePassed: passed,
      phaseOneStatusCap: passed ? "Ready" : result.status === "stale" ? "Stale evidence" : "Unknown evidence",
      recommendedAction: passed
        ? "Keep redacted first-party admin truth JSON sample fresh."
        : result.status === "stale"
          ? "Refresh the redacted admin truth JSON sample from the current code version before clearing the formal gate."
        : "Run npm run capture:truthful-evidence to generate a bounded redacted admin truth JSON sample.",
    },
    adminTruthCommandEvidence: [
      `adminTruthSample.status=${result.status}`,
      `adminTruthSample.completeArtifacts=${result.completeArtifacts.length}`,
      `adminTruthSample.passingArtifacts=${result.passingArtifacts.length}`,
      `adminTruthSample.launchHistoryCoverageArtifacts=${result.launchHistoryCoverageArtifacts.length}`,
      `adminTruthSample.staleArtifacts=${result.staleArtifacts.length}`,
      `productionSampleAttached=${result.completeArtifacts.length > 0}`,
      `formalAdminTruthSamplePassed=${passed}`,
      ...result.passingArtifacts.map((artifact) => `adminTruthSample.passingArtifact=${artifact}`),
      ...result.launchHistoryCoverageArtifacts.map((artifact) => `adminTruthSample.launchHistoryCoverageArtifact=${artifact}`),
      ...result.staleArtifacts.map((artifact) => `adminTruthSample.staleArtifact=${artifact}`),
      ...result.staleReasons.map((reason) => `adminTruthSample.staleReason=${reason}`),
    ],
  };
  mkdirSync(join(repoRoot, "agent/state"), { recursive: true });
  writeFileSync(join(repoRoot, "agent/state/admin-truth-sample-evidence.generated.json"), `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  const result = evaluateAdminTruthSampleEvidence();
  const strict = process.env.EVIDENCE_STRICT === "1";
  const failures = [...result.failures];
  writeGeneratedState(result);

  if (strict && result.passingArtifacts.length === 0) {
    failures.push("admin truth sample evidence is missing, stale, or incomplete in strict mode.");
  }

  if (failures.length > 0) {
    console.error("Admin truth sample evidence validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Admin truth sample evidence status: ${result.status}; ` +
      `templates are not evidence; completeArtifacts=${result.completeArtifacts.length}; ` +
      `passingArtifacts=${result.passingArtifacts.length}; ` +
      `head=${execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim()}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
