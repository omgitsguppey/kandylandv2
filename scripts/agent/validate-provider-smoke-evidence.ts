import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

export type ProviderSmokeLaneEvaluation = {
  lane: "providerSmokeEvidence";
  status: EvidenceStatus;
  folder: string;
  templatePath: string;
  templateExists: boolean;
  evidenceFiles: string[];
  completeArtifacts: string[];
  passingArtifacts: string[];
  failures: string[];
};

export const REQUIRED_PROVIDER_SMOKE_CHECKS = [
  "paypal-order-create-capture",
  "gumdrop-purchased-balance-increase",
  "paid-bonus-purchased-balance",
  "reward-balance-not-creator-funding",
  "creator-request-paid-spend",
  "booking-slot-paid-spend",
  "subscription-paid-spend-if-safe",
  "no-secrets-raw-provider-tokens",
] as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const evidenceFolder = "agent/evidence/provider-smoke";
const templatePath = `${evidenceFolder}/evidence.template.json`;
const MAX_PROVIDER_SMOKE_AGE_HOURS = 24;
const secretPatterns = [
  /access_token/i,
  /refresh_token/i,
  /id_token/i,
  /client_secret/i,
  /private_key/i,
  /authorization\s*[:=]/i,
  /bearer\s+[a-z0-9._-]{12,}/i,
  /paypal[_-]?token/i,
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

function pathExists(relativePath: string, options: ValidationOptions) {
  if (options.existingPaths) return options.existingPaths.has(relativePath);
  return existsSync(join(repoRoot, relativePath));
}

function containsRawSecret(value: unknown) {
  const source = JSON.stringify(value);
  return secretPatterns.some((pattern) => pattern.test(source));
}

function containsScreenshotOnlyEvidence(value: unknown) {
  const text = JSON.stringify(value).toLowerCase();
  return /"screenshots?only"\s*:\s*true/u.test(text)
    || /"manualscreenshots?only"\s*:\s*true/u.test(text)
    || /"clearedbyscreenshot"\s*:\s*true/u.test(text)
    || /screenshot[-_\s]?only proof/u.test(text)
    || /manual screenshot clears/u.test(text);
}

export function validateProviderSmokeEvidenceDocument(
  document: unknown,
  options: ValidationOptions = {},
) {
  const failures: string[] = [];
  const doc = record(document);

  if (containsRawSecret(doc)) {
    failures.push("provider smoke evidence must not include raw secrets or provider tokens.");
  }
  if (containsScreenshotOnlyEvidence(doc)) {
    failures.push("provider-backed source activity evidence cannot be cleared by screenshot-only or manual-only proof.");
  }
  if (doc.status === "template_not_evidence") {
    if (options.requireComplete) failures.push("provider smoke evidence template is not completed evidence.");
    return failures;
  }
  if (!["complete", "incomplete"].includes(String(doc.status))) {
    failures.push("provider smoke evidence status must be complete, incomplete, or template_not_evidence.");
  }
  if (options.requireComplete && doc.status !== "complete") {
    failures.push("provider smoke evidence must be complete.");
  }
  if (doc.status !== "complete") return failures;

  if (!isValidUtc(doc.capturedAtUtc)) {
    failures.push("provider smoke complete evidence must include a valid capturedAtUtc.");
  } else {
    const capturedAtMs = Date.parse(String(doc.capturedAtUtc));
    const nowMs = evaluatedNowMs(options);
    const maxAgeHours = typeof options.maxAgeHours === "number" && Number.isFinite(options.maxAgeHours)
      ? options.maxAgeHours
      : MAX_PROVIDER_SMOKE_AGE_HOURS;
    if (capturedAtMs > nowMs) {
      failures.push("provider smoke complete evidence capturedAtUtc must not be in the future.");
    } else if (nowMs - capturedAtMs > maxAgeHours * 60 * 60 * 1000) {
      failures.push(`provider smoke complete evidence capturedAtUtc is older than ${maxAgeHours}h.`);
    }
  }
  const expectedHead = options.currentHead ?? currentHead();
  const artifactHead = typeof doc.currentHead === "string" ? doc.currentHead : "";
  if (!artifactHead) {
    failures.push("provider smoke complete evidence must include currentHead.");
  } else if (artifactHead !== expectedHead) {
    failures.push(`provider smoke complete evidence currentHead ${artifactHead} does not match ${expectedHead}.`);
  }
  if (doc.provider !== "paypal") failures.push("provider smoke complete evidence provider must be paypal.");
  if (!["production", "sandbox", "unknown"].includes(String(doc.environment))) {
    failures.push("provider smoke complete evidence environment must be production, sandbox, or unknown.");
  }
  if (array(doc.redactions).length === 0) {
    failures.push("provider smoke complete evidence must include at least one redaction entry.");
  }

  const checks = array(doc.checks).map(record);
  const seenChecks = new Set(checks.map((check) => check.id).filter((id): id is string => typeof id === "string"));
  for (const requiredCheck of REQUIRED_PROVIDER_SMOKE_CHECKS) {
    if (!seenChecks.has(requiredCheck)) {
      failures.push(`provider smoke complete evidence must include check "${requiredCheck}".`);
    }
  }
  for (const check of checks) {
    if (!["pass", "fail", "blocked"].includes(String(check.status))) {
      failures.push(`provider smoke check "${String(check.id ?? "unknown")}" must use pass, fail, or blocked status.`);
    }
    if (!isRelativeEvidencePath(check.artifactPath)) {
      failures.push(`provider smoke check "${String(check.id ?? "unknown")}" artifactPath must be a relative path.`);
      continue;
    }
    const artifactPath = String(check.artifactPath);
    if (!pathExists(artifactPath, options)) {
      failures.push(`provider smoke check "${String(check.id ?? "unknown")}" artifactPath must exist.`);
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

export function evaluateProviderSmokeEvidence(options: EvaluationOptions = {}): ProviderSmokeLaneEvaluation {
  const files = listEvidenceFiles();
  const failures: string[] = [];
  const completeArtifacts: string[] = [];
  const passingArtifacts: string[] = [];
  const expectedHead = options.currentHead ?? currentHead();
  const nowMs = evaluatedNowMs(options);

  for (const file of files) {
    try {
      const document = readJson(file);
      const validationFailures = validateProviderSmokeEvidenceDocument(document, {
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
    lane: "providerSmokeEvidence",
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

function readOptionalJson(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

export function providerSmokeEvaluationPassed(
  result: Pick<ProviderSmokeLaneEvaluation, "passingArtifacts" | "failures">,
) {
  return result.passingArtifacts.length > 0 && result.failures.length === 0;
}

function writeGeneratedState(result: ProviderSmokeLaneEvaluation) {
  const head = currentHead();
  const generatedAtUtc = new Date().toISOString();
  const passed = providerSmokeEvaluationPassed(result);
  const operatorRevenue = record(record(readOptionalJson("agent/state/operator-revenue-smoke.generated.json")).summary);
  const operatorConfirmed = operatorRevenue.revenueSmokeStatus === "operator_confirmed_revenue_smoke";
  const operatorNote = operatorConfirmed
    ? passed
      ? "Operator-confirmed PayPal activity is retained as product context; the current provider-backed source artifact controls this gate."
      : "Operator-confirmed PayPal activity is tracked as product context only; it does not clear provider-backed site activity evidence."
    : "No operator-confirmed PayPal activity is attached.";
  const report = {
    generatedAtUtc,
    reportKey: "provider-smoke-evidence",
    currentHead: head,
    sourceCommit: head,
    overallStatus: passed ? "formal_provider_smoke_passed" : operatorConfirmed ? "operator_reported_not_formal_provider_smoke" : "missing_formal_evidence",
    status: passed ? "formal_provider_smoke_passed" : operatorConfirmed ? "operator_reported_not_formal_provider_smoke" : "missing_formal_evidence",
    externalEvidenceStatus: passed ? "formal_provider_proof_attached" : "external_evidence_required",
    evidenceBoundary: {
      evidenceKind: "provider_backed_source_activity",
      compatibleLegacyEvidenceKind: "provider_proof",
      sourceEvidenceStatus: passed ? "source_validated" : "external_source_required",
      sourceCheckCanPass: true,
      providerCallsPerformed: false,
      secretValuesPrinted: false,
      screenshotOnlyClearsGate: false,
      operatorReportClearsGate: false,
      acceptedEvidence:
        "A redacted provider-backed source activity artifact with server transaction, GumDrop source-of-funds, webhook/capture, and privacy redaction checks.",
      doesNotProve: "Source checks, env registration, operator-reported payment activity, and screenshots do not prove provider credentials, provider callbacks, PayPal UI, or webhook truth.",
    },
    providerSmoke: {
      status: passed ? "formal_provider_smoke_passed" : "missing_formal_evidence",
      sourceEvidenceStatus: passed ? "source_validated" : "external_source_required",
      passed,
      recommendedAction: passed
        ? "Keep redacted provider-backed site activity evidence fresh."
        : "Produce redacted provider-backed source activity evidence; product-context notes and screenshots do not clear this gate.",
    },
    paypalRefillSmoke: {
      status: passed
        ? "formal_provider_smoke_passed"
        : operatorConfirmed
          ? "operator_reported_not_formal_provider_smoke"
          : "missing_formal_evidence",
      note: operatorNote,
      formalRepoArtifactAttached: passed,
    },
    readinessImpact: {
      providerSmokeGatePassed: passed,
      paypalSmokeGatePassed: passed,
      phaseOneStatusCap: passed ? "Ready" : "Ready with smoke required",
      notes: [
        operatorNote,
        passed
          ? "A complete redacted provider artifact cleared the provider-backed site activity gate."
          : "Provider/payment status remains external_source_required until a complete redacted provider-backed source activity artifact exists.",
      ],
    },
    evidenceFiles: result.evidenceFiles,
    completeArtifacts: result.completeArtifacts,
    passingArtifacts: result.passingArtifacts,
    validationFailures: result.failures,
    evidence: [
      `providerSmoke.status=${result.status}`,
      `providerSmoke.completeArtifacts=${result.completeArtifacts.length}`,
      `providerSmoke.passingArtifacts=${result.passingArtifacts.length}`,
      `operatorConfirmedRevenueSmoke=${operatorConfirmed}`,
      `providerSmokeGatePassed=${passed}`,
      ...result.passingArtifacts.map((artifact) => `providerSmoke.passingArtifact=${artifact}`),
    ],
  };
  mkdirSync(join(repoRoot, "agent/state"), { recursive: true });
  writeFileSync(join(repoRoot, "agent/state/provider-smoke-evidence.generated.json"), `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  const result = evaluateProviderSmokeEvidence();
  const strict = process.env.EVIDENCE_STRICT === "1";
  const failures = [...result.failures];
  writeGeneratedState(result);

  if (strict && result.status !== "complete") {
    failures.push("provider smoke evidence is missing or incomplete in strict mode.");
  }

  if (failures.length > 0) {
    console.error("Provider smoke evidence validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Provider smoke evidence status: ${result.status}; ` +
      `templates are not evidence; completeArtifacts=${result.completeArtifacts.length}; ` +
      `passingArtifacts=${result.passingArtifacts.length}; ` +
      `head=${execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim()}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
