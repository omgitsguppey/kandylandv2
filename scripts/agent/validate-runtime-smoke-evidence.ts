import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type EvidenceStatus = "missing" | "incomplete" | "complete";

type ValidationOptions = {
  requireComplete?: boolean;
  existingPaths?: Set<string>;
};

type LaneEvaluation = {
  lane: "runtimeSmokeEvidence";
  status: EvidenceStatus;
  folder: string;
  templatePath: string;
  templateExists: boolean;
  evidenceFiles: string[];
  completeArtifacts: string[];
  passingArtifacts: string[];
  failures: string[];
};

export const REQUIRED_RUNTIME_SMOKE_CHECKS = [
  "/",
  "/drops",
  "/creators/[username]",
  "creator-booking-slot-flow",
  "/dashboard/creator",
  "/dashboard/chat",
  "beta-release-notes-drawer",
  "no-provider-calls",
  "no-raw-secrets",
] as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const evidenceFolder = "agent/evidence/runtime-smoke";
const templatePath = `${evidenceFolder}/evidence.template.json`;
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

export function validateRuntimeSmokeEvidenceDocument(
  document: unknown,
  options: ValidationOptions = {},
) {
  const failures: string[] = [];
  const doc = record(document);

  if (containsRawSecret(doc)) {
    failures.push("runtime smoke evidence must not include raw secrets or provider tokens.");
  }
  if (doc.status === "template_not_evidence") {
    if (options.requireComplete) failures.push("runtime smoke evidence template is not completed evidence.");
    return failures;
  }
  if (!["complete", "incomplete"].includes(String(doc.status))) {
    failures.push("runtime smoke evidence status must be complete, incomplete, or template_not_evidence.");
  }
  if (options.requireComplete && doc.status !== "complete") {
    failures.push("runtime smoke evidence must be complete.");
  }
  if (doc.status !== "complete") return failures;

  if (!isValidUtc(doc.capturedAtUtc)) failures.push("runtime smoke complete evidence must include capturedAtUtc.");
  if (typeof doc.appBaseUrl !== "string" || doc.appBaseUrl.length === 0) {
    failures.push("runtime smoke complete evidence must include appBaseUrl.");
  }
  if (!["production", "preview", "unknown"].includes(String(doc.environment))) {
    failures.push("runtime smoke complete evidence environment must be production, preview, or unknown.");
  }
  if (array(doc.redactions).length === 0) {
    failures.push("runtime smoke complete evidence must include at least one redaction entry.");
  }

  const checks = array(doc.checks).map(record);
  const seenChecks = new Set(checks.map((check) => check.route).filter((route): route is string => typeof route === "string"));
  for (const requiredCheck of REQUIRED_RUNTIME_SMOKE_CHECKS) {
    if (!seenChecks.has(requiredCheck)) {
      failures.push(`runtime smoke complete evidence must include check "${requiredCheck}".`);
    }
  }
  for (const check of checks) {
    if (!["pass", "fail", "blocked"].includes(String(check.status))) {
      failures.push(`runtime smoke check "${String(check.route ?? "unknown")}" must use pass, fail, or blocked status.`);
    }
    if (!isRelativeEvidencePath(check.artifactPath)) {
      failures.push(`runtime smoke check "${String(check.route ?? "unknown")}" artifactPath must be a relative path.`);
      continue;
    }
    const artifactPath = String(check.artifactPath);
    if (!pathExists(artifactPath, options)) {
      failures.push(`runtime smoke check "${String(check.route ?? "unknown")}" artifactPath must exist.`);
    }
  }

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

export function evaluateRuntimeSmokeEvidence(): LaneEvaluation {
  const files = listEvidenceFiles();
  const failures: string[] = [];
  const completeArtifacts: string[] = [];
  const passingArtifacts: string[] = [];

  for (const file of files) {
    try {
      const document = readJson(file);
      const validationFailures = validateRuntimeSmokeEvidenceDocument(document, { requireComplete: true });
      if (validationFailures.length === 0) {
        completeArtifacts.push(file);
        const checks = array(record(document).checks).map(record);
        if (checks.length > 0 && checks.every((check) => check.status === "pass")) {
          passingArtifacts.push(file);
        }
      } else if (containsRawSecret(document)) {
        failures.push(...validationFailures);
      }
    } catch (error) {
      failures.push(`${file} must be valid JSON: ${(error as Error).message}`);
    }
  }

  const status: EvidenceStatus = completeArtifacts.length > 0
    ? "complete"
    : files.length > 0
      ? "incomplete"
      : "missing";

  return {
    lane: "runtimeSmokeEvidence",
    status,
    folder: evidenceFolder,
    templatePath,
    templateExists: existsSync(join(repoRoot, templatePath)),
    evidenceFiles: files,
    completeArtifacts,
    passingArtifacts,
    failures,
  };
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function writeGeneratedState(result: LaneEvaluation) {
  const head = currentHead();
  const generatedAtUtc = new Date().toISOString();
  const passed = result.passingArtifacts.length > 0;
  const report = {
    generatedAtUtc,
    reportKey: "runtime-smoke-evidence",
    currentHead: head,
    sourceCommit: head,
    overallStatus: passed ? "formal_runtime_smoke_passed" : result.status === "incomplete" ? "failed" : "runtime_unverified",
    status: passed ? "formal_runtime_smoke_passed" : result.status === "incomplete" ? "failed" : "runtime_unverified",
    runtimeDeploymentSmokePassed: passed,
    passed,
    evidenceFiles: result.evidenceFiles,
    completeArtifacts: result.completeArtifacts,
    passingArtifacts: result.passingArtifacts,
    readinessImpact: {
      runtimeGatePassed: passed,
      phaseOneStatusCap: passed ? "Ready" : "Runtime unverified",
      recommendedAction: passed
        ? "Keep deployed route/runtime evidence fresh."
        : "Run npm run capture:truthful-evidence -- --runtime-smoke to intentionally generate deployed route/runtime evidence; do not treat local source validators as deployed runtime evidence.",
    },
    evidenceItems: [
      `runtimeEvidence.status=${result.status}`,
      `runtimeEvidence.completeArtifacts=${result.completeArtifacts.length}`,
      `runtimeEvidence.passingArtifacts=${result.passingArtifacts.length}`,
      ...result.passingArtifacts.map((artifact) => `runtimeEvidence.passingArtifact=${artifact}`),
    ],
  };
  mkdirSync(join(repoRoot, "agent/state"), { recursive: true });
  writeFileSync(join(repoRoot, "agent/state/runtime-smoke-evidence.generated.json"), `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  const result = evaluateRuntimeSmokeEvidence();
  const strict = process.env.EVIDENCE_STRICT === "1";
  const failures = [...result.failures];
  writeGeneratedState(result);

  if (strict && result.status !== "complete") {
    failures.push("runtime smoke evidence is missing or incomplete in strict mode.");
  }

  if (failures.length > 0) {
    console.error("Runtime smoke evidence validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Runtime smoke evidence status: ${result.status}; ` +
      `templates are not evidence; completeArtifacts=${result.completeArtifacts.length}; ` +
      `passingArtifacts=${result.passingArtifacts.length}; ` +
      `head=${execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim()}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
