import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getConfiguredSiteOrigins } from "../../src/lib/site-origin";

type EvidenceStatus = "missing" | "incomplete" | "complete";

type ValidationOptions = {
  requireComplete?: boolean;
  existingPaths?: Set<string>;
  currentHead?: string;
  nowMs?: number;
  nowUtc?: string;
  maxAgeHours?: number;
};

type EvaluationOptions = Pick<ValidationOptions, "currentHead" | "nowMs" | "nowUtc" | "maxAgeHours">;

export type LaneEvaluation = {
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
const MAX_RUNTIME_SMOKE_AGE_HOURS = 24;
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

function evaluatedNowMs(options: Pick<ValidationOptions, "nowMs" | "nowUtc">) {
  if (typeof options.nowMs === "number" && Number.isFinite(options.nowMs)) return options.nowMs;
  if (isValidUtc(options.nowUtc)) return Date.parse(String(options.nowUtc));
  return Date.now();
}

function isRelativeEvidencePath(value: unknown) {
  return typeof value === "string" && value.length > 0 && !isAbsolute(value) && !/^[a-z]+:/iu.test(value);
}

function isDeployedHttpsUrl(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const localHost = host === "localhost"
      || host === "127.0.0.1"
      || host === "0.0.0.0"
      || host === "::1"
      || host.endsWith(".localhost")
      || host.endsWith(".local");
    const configuredOrigins = new Set(getConfiguredSiteOrigins().map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        return "";
      }
    }));
    return url.protocol === "https:"
      && !localHost
      && url.username.length === 0
      && url.password.length === 0
      && configuredOrigins.has(url.origin);
  } catch {
    return false;
  }
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

  if (!isValidUtc(doc.capturedAtUtc)) {
    failures.push("runtime smoke complete evidence must include a valid capturedAtUtc.");
  } else {
    const capturedAtMs = Date.parse(String(doc.capturedAtUtc));
    const nowMs = evaluatedNowMs(options);
    const maxAgeHours = typeof options.maxAgeHours === "number" && Number.isFinite(options.maxAgeHours)
      ? options.maxAgeHours
      : MAX_RUNTIME_SMOKE_AGE_HOURS;
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    if (capturedAtMs > nowMs) {
      failures.push("runtime smoke complete evidence capturedAtUtc must not be in the future.");
    } else if (nowMs - capturedAtMs > maxAgeMs) {
      failures.push(`runtime smoke complete evidence capturedAtUtc is older than ${maxAgeHours}h.`);
    }
  }

  const expectedHead = options.currentHead ?? currentHead();
  const artifactHead = typeof doc.currentHead === "string" ? doc.currentHead : "";
  if (!artifactHead) {
    failures.push("runtime smoke complete evidence must include currentHead.");
  } else if (artifactHead !== expectedHead) {
    failures.push(`runtime smoke complete evidence currentHead ${artifactHead} does not match ${expectedHead}.`);
  }
  if (!isDeployedHttpsUrl(doc.appBaseUrl)) {
    failures.push("runtime smoke complete evidence appBaseUrl must be a configured non-local HTTPS deployment origin without credentials.");
  }
  if (!["production", "preview"].includes(String(doc.environment))) {
    failures.push("runtime smoke complete evidence environment must be production or preview.");
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

export function evaluateRuntimeSmokeEvidence(options: EvaluationOptions = {}): LaneEvaluation {
  const files = listEvidenceFiles();
  const failures: string[] = [];
  const completeArtifacts: string[] = [];
  const passingArtifacts: string[] = [];
  const expectedHead = options.currentHead ?? currentHead();
  const nowMs = evaluatedNowMs(options);

  for (const file of files) {
    try {
      const document = readJson(file);
      const validationFailures = validateRuntimeSmokeEvidenceDocument(document, {
        requireComplete: true,
        currentHead: expectedHead,
        nowMs,
        maxAgeHours: options.maxAgeHours,
      });
      if (validationFailures.length === 0) {
        completeArtifacts.push(file);
        const checks = array(record(document).checks).map(record);
        if (checks.length > 0 && checks.every((check) => check.status === "pass")) {
          passingArtifacts.push(file);
        }
      } else {
        failures.push(...validationFailures.map((failure) => `${file}: ${failure}`));
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

export function buildRuntimeSmokeEvidenceReport(
  result: LaneEvaluation,
  options: { currentHead?: string; generatedAtUtc?: string } = {},
) {
  const head = options.currentHead ?? currentHead();
  const generatedAtUtc = options.generatedAtUtc ?? new Date().toISOString();
  const validationFailures = [...result.failures];
  const passed = result.passingArtifacts.length > 0 && validationFailures.length === 0;
  const status = passed ? "formal_runtime_smoke_passed" : "runtime_unverified";
  return {
    generatedAtUtc,
    reportKey: "runtime-smoke-evidence",
    currentHead: head,
    sourceCommit: head,
    overallStatus: status,
    status,
    runtimeDeploymentSmokePassed: passed,
    passed,
    evidenceFiles: result.evidenceFiles,
    completeArtifacts: result.completeArtifacts,
    passingArtifacts: result.passingArtifacts,
    validationFailures,
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
}

function writeGeneratedState(result: LaneEvaluation) {
  const report = buildRuntimeSmokeEvidenceReport(result);
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
