import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SURFACE_PARITY_REQUIRED_STATES,
  validateSurfaceParityRegistry,
  type SurfaceParityDoctrineReport,
} from "@/lib/parity/surface-parity-contract";
import {
  ACTIVE_SUPPORTING_PARITY_VALIDATORS,
  SUPERSEDED_PARITY_VALIDATORS,
  SURFACE_PARITY_REGISTRY,
  buildSurfaceParityDoctrineReport,
} from "@/lib/parity/surface-parity-registry";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const REPORT_PATH = "agent/state/surface-parity-doctrine.generated.json";
const DOC_PATH = "docs/agent-truth/surface-parity-doctrine.md";
const CHECK_SCRIPT = "check:surface-parity-doctrine";

function safeExec(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function currentHead() {
  return safeExec("git", ["rev-parse", "HEAD"]);
}

function dirtyFiles() {
  return safeExec("git", ["status", "--short", "--untracked-files=all"])
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .map((line) => line.replace(/^(?:[MADRCU?! ]{1,2})\s+/u, ""))
    .filter(Boolean);
}

function readPackageScripts() {
  const raw = readFileSync(join(ROOT, "package.json"), "utf8");
  const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
  return parsed.scripts ?? {};
}

function renderDoc(report: SurfaceParityDoctrineReport) {
  const surfaceRows = report.surfaces
    .map((surface) => {
      const roles = Object.entries(surface.roleVisibility)
        .map(([role, status]) => `${role}:${status}`)
        .join(", ");
      return `| ${surface.surfaceId} | ${surface.surfaceOwner} | ${surface.canonicalRoute} | ${surface.featureId} | ${roles} | ${surface.debugLane} | ${surface.scoreDimensionImpact.dimensions.join(", ")} |`;
    })
    .join("\n");
  const validatorRows = report.supersededParityValidators
    .map((validator) => `| ${validator.packageScript} | ${validator.status} | ${validator.authority} | ${validator.reason} |`)
    .join("\n");
  const dirtyRows = report.dirtyFiles.length > 0
    ? report.dirtyFiles.map((file) => `| ${file.path} | ${file.classification} |`).join("\n")
    : "| none | fixed_current |";

  return `# Surface Parity Doctrine

Status: \`${report.status}\`  
Artifact: \`${REPORT_PATH}\`  
Validator: \`npm run ${CHECK_SCRIPT}\`  
Production reads performed: \`${report.productionReadsPerformed}\`  
Provider calls performed: \`${report.providerCallsPerformed}\`

## Doctrine

This is the canonical surface parity doctrine for public, user, creator, and admin surfaces. It maps each major surface to role visibility, required layout states, data source, backend route or action, telemetry event coverage, debug visibility, score impact, mobile density status, and old-logic status.

Required states: ${SURFACE_PARITY_REQUIRED_STATES.map((state) => `\`${state}\``).join(", ")}

## Major Surfaces

| Surface | Owner | Canonical route | Feature | Roles | Debug lane | Score dimensions |
| --- | --- | --- | --- | --- | --- | --- |
${surfaceRows}

## Validator Authority

The registry is the cross-role surface state authority. Existing feature, telemetry, settings, chat, wallet, and creator validators remain active as surface-specific evidence and must not be duplicated here.

| Validator | Status | Authority | Reason |
| --- | --- | --- | --- |
${validatorRows}

Active supporting validators:

${report.activeSupportingParityValidators.map((validator) => `- \`${validator}\``).join("\n")}

## Dirty File Classification

| Path | Classification |
| --- | --- |
${dirtyRows}

## Validation

${report.validationFailures.length > 0
    ? report.validationFailures.map((failure) => `- ${failure}`).join("\n")
    : "- No validation failures."}
`;
}

export function validateSurfaceParityDoctrineReport(
  report: SurfaceParityDoctrineReport,
  scripts: Record<string, string> = readPackageScripts(),
) {
  const failures = [...validateSurfaceParityRegistry(report.surfaces, report.supersededParityValidators)];
  if (report.reportKey !== "surface-parity-doctrine") failures.push("reportKey must be surface-parity-doctrine.");
  if (!report.generatedAtUtc || Number.isNaN(Date.parse(report.generatedAtUtc))) failures.push("generatedAtUtc must be parseable UTC.");
  if (report.productionReadsPerformed !== false) failures.push("surface parity validator must not run production reads.");
  if (report.providerCallsPerformed !== false) failures.push("surface parity validator must not run provider calls.");
  if (report.majorSurfacesRegistered !== report.majorSurfaceIds.length) failures.push("major surface count does not match registered ids.");
  if (!scripts[CHECK_SCRIPT]?.includes("validate-surface-parity-doctrine.ts")) failures.push("package script check:surface-parity-doctrine is missing.");
  if (!existsSync(join(ROOT, "tests/unit/surface-parity-doctrine.spec.ts"))) failures.push("surface parity doctrine test is missing.");
  if (report.duplicateParityValidatorsRetired.length === 0) failures.push("duplicate parity validator retirement evidence is missing.");
  for (const validator of ACTIVE_SUPPORTING_PARITY_VALIDATORS) {
    if (!scripts[validator]) failures.push(`${validator} supporting validator script is missing.`);
  }
  for (const validator of SUPERSEDED_PARITY_VALIDATORS) {
    if (!validator.reason || !validator.authority) failures.push(`${validator.packageScript} lacks retirement authority or reason.`);
  }
  for (const file of report.dirtyFiles) {
    if (file.classification === "unsafe_unknown") failures.push(`${file.path} is unclassified.`);
  }
  return [...new Set(failures)];
}

function main() {
  const report = buildSurfaceParityDoctrineReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    dirtyFiles: dirtyFiles(),
  });
  const validationFailures = validateSurfaceParityDoctrineReport(report);
  const finalReport: SurfaceParityDoctrineReport = {
    ...report,
    status: validationFailures.length > 0 ? "fail" : "pass",
    validationFailures,
  };

  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, REPORT_PATH), `${JSON.stringify(finalReport, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(finalReport));

  if (validationFailures.length > 0) {
    console.error("Surface parity doctrine validation failed:");
    for (const failure of validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Surface parity doctrine validation passed. surfaces=${finalReport.majorSurfacesRegistered}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
