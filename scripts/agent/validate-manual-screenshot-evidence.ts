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
  lane: "manualScreenshotEvidence";
  status: EvidenceStatus;
  folder: string;
  templatePath: string;
  templateExists: boolean;
  evidenceFiles: string[];
  completeArtifacts: string[];
  failures: string[];
};

export const REQUIRED_MANUAL_SCREENSHOT_ROUTES = [
  "/",
  "/drops",
  "/drops/[id]/preview locked state",
  "/dashboard",
  "/dashboard/creator",
  "/dashboard/profile",
  "/dashboard/settings",
  "/dashboard/library",
  "/dashboard/chat shell only",
  "/creators/[username]",
  "wallet / GumDrop purchase modal",
  "creator profile Fan Pass",
  "creator profile requests",
  "creator profile booking slots",
  "creator owner profile mode",
  "Beta release notes drawer",
  "mobile nav/sidebar/profile dropdown",
] as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const evidenceFolder = "agent/evidence/manual-screenshot-qa";
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

export function validateManualScreenshotEvidenceDocument(
  document: unknown,
  options: ValidationOptions = {},
) {
  const failures: string[] = [];
  const doc = record(document);

  if (containsRawSecret(doc)) {
    failures.push("manual screenshot evidence must not include raw secrets or provider tokens.");
  }
  if (doc.status === "template_not_evidence") {
    if (options.requireComplete) {
      failures.push("manual screenshot evidence template is not completed evidence.");
    }
    return failures;
  }
  if (!["complete", "incomplete"].includes(String(doc.status))) {
    failures.push("manual screenshot evidence status must be complete, incomplete, or template_not_evidence.");
  }
  if (options.requireComplete && doc.status !== "complete") {
    failures.push("manual screenshot evidence must be complete.");
  }
  if (doc.status !== "complete") return failures;

  if (!isValidUtc(doc.capturedAtUtc)) failures.push("manual screenshot complete evidence must include capturedAtUtc.");
  if (typeof doc.appBaseUrl !== "string" || doc.appBaseUrl.length === 0) {
    failures.push("manual screenshot complete evidence must include appBaseUrl.");
  }
  if (typeof doc.device !== "string" || doc.device.length === 0) {
    failures.push("manual screenshot complete evidence must include device.");
  }
  if (typeof doc.browser !== "string" || doc.browser.length === 0) {
    failures.push("manual screenshot complete evidence must include browser.");
  }
  if (array(doc.redactions).length === 0) {
    failures.push("manual screenshot complete evidence must include at least one redaction entry.");
  }

  const routes = array(doc.routes).map(record);
  const seenRoutes = new Set(routes.map((route) => route.route).filter((route): route is string => typeof route === "string"));
  for (const requiredRoute of REQUIRED_MANUAL_SCREENSHOT_ROUTES) {
    if (!seenRoutes.has(requiredRoute)) {
      failures.push(`manual screenshot complete evidence must include route "${requiredRoute}".`);
    }
  }
  for (const route of routes) {
    if (!["pass", "fail", "blocked"].includes(String(route.status))) {
      failures.push(`manual screenshot route "${String(route.route ?? "unknown")}" must use pass, fail, or blocked status.`);
    }
    if (!isRelativeEvidencePath(route.screenshotPath)) {
      failures.push(`manual screenshot route "${String(route.route ?? "unknown")}" screenshotPath must be a relative path.`);
      continue;
    }
    const screenshotPath = String(route.screenshotPath);
    if (!pathExists(screenshotPath, options)) {
      failures.push(`manual screenshot route "${String(route.route ?? "unknown")}" screenshotPath must exist.`);
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

export function evaluateManualScreenshotEvidence(): LaneEvaluation {
  const files = listEvidenceFiles();
  const failures: string[] = [];
  const completeArtifacts: string[] = [];

  for (const file of files) {
    try {
      const document = readJson(file);
      const validationFailures = validateManualScreenshotEvidenceDocument(document, { requireComplete: true });
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
    lane: "manualScreenshotEvidence",
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
  const result = evaluateManualScreenshotEvidence();
  const strict = process.env.EVIDENCE_STRICT === "1";
  const failures = [...result.failures];

  if (strict && result.status !== "complete") {
    failures.push("manual screenshot evidence is missing or incomplete in strict mode.");
  }

  if (failures.length > 0) {
    console.error("Manual screenshot evidence validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Manual screenshot evidence status: ${result.status}; ` +
      `templates are not evidence; completeArtifacts=${result.completeArtifacts.length}; ` +
      `head=${execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim()}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
