import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type LegacyRegistryItem = {
  file: string;
  classification: "canonical" | "adapter" | "legacy_fallback" | "deprecated" | "blocked";
  blockedConsumers: string[];
};

const repoRoot = process.cwd();
const statePath = path.join(repoRoot, "agent/state/phase-one-lock.generated.json");

const REQUIRED_PACKAGE_SCRIPTS = {
  "check:runtime-facts-cutover": "runtime facts are canonical",
  "check:materializers-cutover": "materializers consume canonical facts",
  "check:admin-pages-cutover": "admin pages use canonical snapshots",
  "check:admin-ui-primitives-cutover": "admin truth badges use shared primitive",
  "check:debug-control-tower-cutover": "debug reads canonical truth",
  "check:admin-realtime-cutover": "realtime metrics cannot override snapshots",
  "check:generated-report-authority": "generated reports are not runtime truth",
  "check:validator-authority": "validators are classified",
  "check:release-notes-cutover": "release notes do not loop or stale",
  "check:privacy-import-export-cutover": "privacy-limited data is not scored as zero and imports stay evidence-only",
  "check:chat-paid-gumdrops-guidance": "chat paid-GD guidance exists",
  "check:drop-asset-upload-progress": "asset uploader has progress + queue state",
} as const;

const CHECK_SEQUENCE = Object.keys(REQUIRED_PACKAGE_SCRIPTS);
const CANONICAL_UI_BOUNDARY_FILES = [
  "src/app/admin/page.tsx",
  "src/app/admin/users/page.tsx",
  "src/app/admin/user/[userId]/page.tsx",
  "src/components/Admin/AdminStatsBar.tsx",
  "src/components/Admin/AdminModuleVerificationCard.tsx",
  "src/app/admin/analytics/AnalyticsHelpers.tsx",
  "src/app/admin/debug/components/DebugPrimitives.tsx",
  "src/app/admin/ai/AiHelpers.tsx",
] as const;

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function writeState(payload: Record<string, unknown>) {
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function normalizeImportSpecifier(filePath: string) {
  const withoutExtension = filePath.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, "");
  return withoutExtension.startsWith("src/") ? `@/${withoutExtension.slice(4)}` : withoutExtension;
}

function extractQuotedImports(source: string) {
  return Array.from(
    source.matchAll(/from\s+["']([^"']+)["']|import\s+["']([^"']+)["']/gu),
    (match) => match[1] ?? match[2] ?? "",
  ).filter(Boolean);
}

function runPackageScript(scriptName: string) {
  const result = process.platform === "win32"
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", `npm run ${scriptName}`], {
        cwd: repoRoot,
        stdio: "pipe",
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      })
    : spawnSync("npm", ["run", scriptName], {
        cwd: repoRoot,
        stdio: "pipe",
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });

  return {
    scriptName,
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? String(result.error) : "",
    ok: result.status === 0,
  };
}

function main() {
  const failures: string[] = [];
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const packageScripts = packageJson.scripts ?? {};

  for (const scriptName of CHECK_SEQUENCE) {
    if (!packageScripts[scriptName]) {
      failures.push(`package.json must expose ${scriptName} so Phase 1 lock can verify ${REQUIRED_PACKAGE_SCRIPTS[scriptName as keyof typeof REQUIRED_PACKAGE_SCRIPTS]}.`);
    }
  }

  if (failures.length > 0) {
    writeState({
      generatedAt: new Date().toISOString(),
      status: "fail",
      failures,
      executedChecks: [],
      boundaryChecks: [],
    });
    console.error("Phase 1 lock validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  const checkResults = CHECK_SEQUENCE.map(runPackageScript);
  for (const result of checkResults) {
    if (!result.ok) {
      failures.push(`${result.scriptName} failed.`);
      if (result.error.trim()) {
        console.error(result.error.trim());
      }
      if (result.stdout.trim()) {
        console.error(result.stdout.trim());
      }
      if (result.stderr.trim()) {
        console.error(result.stderr.trim());
      }
    }
  }

  const registrySource = read("src/lib/legacy/admin-analytics-legacy-registry.ts");
  const registryModule = /\[\s*([\s\S]*?)\s*\]\s*;/u.exec(registrySource);
  if (!registryModule) {
    failures.push("Admin analytics legacy registry must remain readable for Phase 1 lock.");
  }

  const registryItems = registryModule
    ? (Function(`"use strict"; return [${registryModule[1]}];`)() as LegacyRegistryItem[])
    : [];

  const legacyBoundaryFindings: Array<{ consumer: string; forbiddenImport: string; classification: string }> = [];

  for (const item of registryItems) {
    if (item.classification !== "blocked" && item.classification !== "legacy_fallback" && item.classification !== "deprecated") {
      continue;
    }

    const forbiddenSpecifier = normalizeImportSpecifier(item.file);
    const blockedConsumers = item.blockedConsumers.length > 0 ? item.blockedConsumers : [...CANONICAL_UI_BOUNDARY_FILES];

    for (const consumerPath of blockedConsumers) {
      if (!existsSync(path.join(repoRoot, consumerPath))) {
        continue;
      }
      const consumerSource = read(consumerPath);
      const imports = extractQuotedImports(consumerSource);
      if (imports.includes(forbiddenSpecifier)) {
        legacyBoundaryFindings.push({
          consumer: consumerPath,
          forbiddenImport: forbiddenSpecifier,
          classification: item.classification,
        });
      }
    }
  }

  for (const finding of legacyBoundaryFindings) {
    failures.push(`${finding.consumer} must not import ${finding.forbiddenImport} (${finding.classification}) into canonical UI.`);
  }

  writeState({
    generatedAt: new Date().toISOString(),
    status: failures.length === 0 ? "pass" : "fail",
    requiredChecks: CHECK_SEQUENCE,
    executedChecks: checkResults.map(({ scriptName, ok }) => ({ scriptName, ok })),
    boundaryChecks: legacyBoundaryFindings,
    failures,
  });

  if (failures.length > 0) {
    console.error("Phase 1 lock validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Phase 1 lock validation passed.");
}

main();
