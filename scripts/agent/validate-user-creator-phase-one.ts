import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { nowIso, writeJsonFile, type Json } from "./shared";

type ValidatorResult = {
  script: string;
  command: string;
  status: "pass" | "fail" | "skipped";
  exitCode: number | null;
  surfaces: string[];
  output: string[];
};

type ValidatorSpec = {
  script: string;
  command: string;
  surfaces: string[];
};

type PhaseOneLockReport = {
  reportKey: "user-creator-phase-one";
  generatedAt: string;
  status: "pass" | "fail";
  promoReadinessVerdict: "ready" | "blocked";
  criticalBlockers: string[];
  warnings: string[];
  surfacesAffected: string[];
  exactValidatorsToRun: string[];
  conditionalValidators: string[];
  skippedValidators: string[];
  requiredTargetedChecks: string[];
  forbiddenBroadChecks: string[];
  changedFilesSinceLastUserCreatorPhaseOne: string[];
  validatorResults: ValidatorResult[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const reportPath = join(repoRoot, "agent", "state", "user-creator-phase-one.generated.json");

const validatorSpecs: ValidatorSpec[] = [
  {
    script: "check:user-critical-path-lock",
    command: "npm run check:user-critical-path-lock",
    surfaces: ["user home", "signup/login", "dashboard", "drops", "viewer/library", "chat", "support"],
  },
  {
    script: "check:creator-public-profile-lock",
    command: "npm run check:creator-public-profile-lock",
    surfaces: ["creator public profile", "creator fan conversion", "creator chat gating"],
  },
  {
    script: "check:creator-dashboard-projection-lock",
    command: "npm run check:creator-dashboard-projection-lock",
    surfaces: ["creator dashboard projection", "admin view-as projection"],
  },
  {
    script: "check:creator-monetization-gates-lock",
    command: "npm run check:creator-monetization-gates-lock",
    surfaces: ["creator monetization", "chat paid-GD guidance", "Fan Pass", "requests", "bookings"],
  },
  {
    script: "check:mobile-shell-safe-area",
    command: "npm run check:mobile-shell-safe-area",
    surfaces: ["user mobile shell", "creator profile mobile", "chat shell", "drops mobile"],
  },
  {
    script: "check:gumdrop-source-of-funds-truth",
    command: "npm run check:gumdrop-source-of-funds-truth",
    surfaces: ["wallet paid/free source truth", "creator monetization spend policy"],
  },
  {
    script: "check:payment-unlock-security",
    command: "npm run check:payment-unlock-security",
    surfaces: ["wallet capture", "drop unlock", "viewer entitlement"],
  },
  {
    script: "check:chat-paid-gumdrops-guidance",
    command: "npm run check:chat-paid-gumdrops-guidance",
    surfaces: ["chat paid-GD guidance", "low paid-GD reminder"],
  },
  {
    script: "check:release-notes-cutover",
    command: "npm run check:release-notes-cutover",
    surfaces: ["release notes feed", "public changelog"],
  },
  {
    script: "check:beta-versioning",
    command: "npm run check:beta-versioning",
    surfaces: ["beta badge versioning", "release note version contract"],
  },
  {
    script: "check:beta-release-notes",
    command: "npm run check:beta-release-notes",
    surfaces: ["beta release notes drawer", "last 5 public notes"],
  },
  {
    script: "check:beta-modal-layout",
    command: "npm run check:beta-modal-layout",
    surfaces: ["beta badge modal layout"],
  },
];

const uploadValidator: ValidatorSpec = {
  script: "check:drop-asset-upload-progress",
  command: "npm run check:drop-asset-upload-progress",
  surfaces: ["drop asset upload", "upload progress", "upload errors"],
};

const uploadSurfacePrefixes = [
  "src/components/Admin/AssetUploader.tsx",
  "src/components/Admin/CreateDropModal.tsx",
  "src/lib/uploads/",
  "storage.rules",
  "tests/unit/asset-upload-",
  "tests/unit/upload-",
  "src/lib/telemetry-catalog.ts",
  "src/app/api/creator/drops/assets/",
  "src/app/api/admin/content/",
];

function gitChangedFiles() {
  const result = spawnSync("git", ["status", "--porcelain=v1", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const output = typeof result.stdout === "string" ? result.stdout : "";
  return output
    .split("\0")
    .filter(Boolean)
    .map((entry) => entry.slice(3).replace(/\\/g, "/"))
    .sort((left, right) => left.localeCompare(right));
}

function collectRelevantChangedFiles(changedFiles: string[]) {
  const prefixes = [
    "package.json",
    "scripts/agent/validate-user-creator-phase-one.ts",
    "docs/agent-truth/user-creator-phase-one.md",
    "agent/state/user-creator-phase-one.generated.json",
  ];

  return changedFiles.filter((filePath) => prefixes.some((prefix) => filePath.startsWith(prefix)));
}

function hasUploadSurfaceChanges(changedFiles: string[]) {
  return changedFiles.some((filePath) => uploadSurfacePrefixes.some((prefix) => filePath.startsWith(prefix)));
}

function runValidator(script: string, command: string, surfaces: string[]): ValidatorResult {
  const result = spawnSync(command, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: true,
  });

  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const stderr = typeof result.stderr === "string" ? result.stderr : "";
  const output = [stdout, stderr]
    .flatMap((chunk) => chunk.split(/\r?\n/u))
    .map((line) => line.trim())
    .filter(Boolean);

  const status = result.status === 0 ? "pass" : "fail";

  if (status === "pass") {
    console.log(`[pass] ${command}`);
  } else {
    console.log(`[fail] ${command}`);
    for (const line of output.slice(0, 16)) {
      console.log(`  ${line}`);
    }
  }

  return {
    script,
    command,
    status,
    exitCode: typeof result.status === "number" ? result.status : null,
    surfaces: [...surfaces],
    output,
  };
}

function buildReport(): PhaseOneLockReport {
  const changedFiles = gitChangedFiles();
  const uploadTouched = hasUploadSurfaceChanges(changedFiles);

  const validators = [...validatorSpecs];
  if (uploadTouched) {
    validators.push(uploadValidator);
  }

  const validatorResults = validators.map((validator) =>
    runValidator(validator.script, validator.command, validator.surfaces),
  );

  const criticalBlockers = validatorResults
    .filter((result) => result.status === "fail")
    .flatMap((result) => {
      const failureLines = result.output.length > 0 ? result.output : [`${result.command} failed.`];
      return failureLines.map((line) => `${result.command}: ${line}`);
    });

  const warnings: string[] = [];

  const status: PhaseOneLockReport["status"] = criticalBlockers.length > 0 ? "fail" : "pass";

  const surfacesAffected = Array.from(
    new Set(
      validatorResults.flatMap((result) => result.surfaces).concat(uploadTouched ? uploadValidator.surfaces : []),
    ),
  );

  const exactValidatorsToRun = validatorResults.map((result) => result.command);
  const conditionalValidators = [uploadValidator.command];

  const report: PhaseOneLockReport = {
    reportKey: "user-creator-phase-one",
    generatedAt: nowIso(),
    status,
    promoReadinessVerdict: status === "pass" ? "ready" : "blocked",
    criticalBlockers,
    warnings,
    surfacesAffected,
    exactValidatorsToRun,
    conditionalValidators,
    skippedValidators: uploadTouched ? [] : [uploadValidator.command],
    requiredTargetedChecks: uploadTouched
      ? [...exactValidatorsToRun, "npm run typecheck"]
      : [...exactValidatorsToRun, "npm run typecheck"],
    forbiddenBroadChecks: [
      "npm run check",
      "playwright",
      "lighthouse",
      "cypress",
      "firebase deploy",
      "admin analytics rebuilds",
    ],
    changedFilesSinceLastUserCreatorPhaseOne: collectRelevantChangedFiles(changedFiles),
    validatorResults,
  };

  writeJsonFile(reportPath, report as unknown as Json);

  const refreshedChangedFiles = collectRelevantChangedFiles(gitChangedFiles());
  const refreshedReport: PhaseOneLockReport = {
    ...report,
    changedFilesSinceLastUserCreatorPhaseOne: refreshedChangedFiles,
  };

  writeJsonFile(reportPath, refreshedReport as unknown as Json);
  return refreshedReport;
}

const report = buildReport();

console.log(`status=${report.status}`);
console.log(`criticalBlockers=${report.criticalBlockers.length}`);
console.log(`warnings=${report.warnings.length}`);
console.log(`promoReadinessVerdict=${report.promoReadinessVerdict}`);
console.log(`surfacesAffected=${report.surfacesAffected.join(", ")}`);

if (report.status === "fail") {
  process.exitCode = 1;
}
