import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type EvidenceStatus = "missing" | "incomplete" | "complete";

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
  failures: string[];
};

const REQUIRED_ADMIN_TRUTH_CHECKS = [
  "source-freshness",
  "sample-count",
  "source-state-label",
  "redacted-artifact-attached",
] as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const evidenceFolder = "agent/evidence/admin-truth-sample";
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

  for (const file of files) {
    try {
      const document = readJson(file);
      const validationFailures = validateAdminTruthSampleEvidenceDocument(document, { requireComplete: true });
      if (validationFailures.length === 0) {
        completeArtifacts.push(file);
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
    lane: "adminTruthSampleEvidence",
    status,
    folder: evidenceFolder,
    templatePath,
    templateExists: existsSync(join(repoRoot, templatePath)),
    evidenceFiles: files,
    completeArtifacts,
    failures,
  };
}

function main() {
  const result = evaluateAdminTruthSampleEvidence();
  const strict = process.env.EVIDENCE_STRICT === "1";
  const failures = [...result.failures];

  if (strict && result.status !== "complete") {
    failures.push("admin truth sample evidence is missing or incomplete in strict mode.");
  }

  if (failures.length > 0) {
    console.error("Admin truth sample evidence validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Admin truth sample evidence status: ${result.status}; ` +
      `templates are not evidence; completeArtifacts=${result.completeArtifacts.length}; ` +
      `head=${execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim()}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
