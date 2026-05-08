import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { listTrackedFiles, nowIso, writeJsonFile } from "./shared";

type Classification =
  | "canonical"
  | "supporting"
  | "generated_snapshot"
  | "legacy_fallback"
  | "deprecated"
  | "blocked"
  | "orphan_candidate"
  | "safe_to_remove";

type JunkRecord = {
  file: string;
  classification: Classification;
  reasons: string[];
};

type JunkReport = {
  generatedAt: string;
  status: "pass" | "warning" | "fail";
  summary: string;
  records: JunkRecord[];
  removedFiles: string[];
  deprecatedFiles: string[];
  blockedLegacyPaths: string[];
  orphanCandidates: string[];
  safeToRemove: string[];
};

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/codebase-junk-cleanup.generated.json";

type ScriptReferenceIndex = Map<string, string[]>;

function repoPath(relativePath: string) {
  return path.join(ROOT, relativePath);
}

function buildAgentScriptReferenceIndex(trackedFiles: string[]) {
  const scriptFiles = trackedFiles.filter((file) => file.startsWith("scripts/agent/") && file.endsWith(".ts"));
  const scriptSource = new Map<string, string>();

  for (const file of scriptFiles) {
    const absolutePath = repoPath(file);
    if (!existsSync(absolutePath)) continue;
    scriptSource.set(file, readFileSync(absolutePath, "utf8"));
  }

  const referenceIndex: ScriptReferenceIndex = new Map();
  for (const candidate of scriptFiles) {
    const candidateBase = candidate.replace(/^scripts\/agent\//u, "").replace(/\.ts$/u, "");
    const candidateName = path.basename(candidate, ".ts");
    const importedBy: string[] = [];
    for (const [sourceFile, sourceText] of scriptSource.entries()) {
      if (sourceFile === candidate) continue;
      const matchesByPath = sourceText.includes(`scripts/agent/${candidateBase}.ts`);
      const matchesByImport = sourceText.includes(`"${candidateBase}"`) || sourceText.includes(`'${candidateBase}'`);
      const matchesByFilename = sourceText.includes(candidateName);
      if (matchesByPath || matchesByImport || matchesByFilename) {
        importedBy.push(sourceFile);
      }
    }
    referenceIndex.set(candidate, importedBy.sort((left, right) => left.localeCompare(right)));
  }

  return referenceIndex;
}

function classifyFile(
  file: string,
  packageScripts: Record<string, string>,
  scriptReferenceIndex: ScriptReferenceIndex,
): JunkRecord | null {
  const reasons: string[] = [];
  let classification: Classification | null = null;

  if (file.startsWith("agent/state/") && file.endsWith(".generated.json")) {
    classification = "generated_snapshot";
    reasons.push("Generated state snapshot; evidence only.");
  }

  if (file.includes("/legacy/") || file.includes("-legacy-") || file.includes("legacy-")) {
    classification = classification ?? "legacy_fallback";
    reasons.push("Legacy lane detected by path naming.");
  }

  if (file.includes("/deprecated/") || file.includes(".deprecated.")) {
    classification = "deprecated";
    reasons.push("Deprecated naming convention detected.");
  }

  if (file.includes("/blocked/")) {
    classification = "blocked";
    reasons.push("Blocked path convention detected.");
  }

  if (file.startsWith("scripts/agent/") && file.endsWith(".ts")) {
    const scriptBase = file.replace(/^scripts\/agent\//u, "").replace(/\.ts$/u, "");
    const isWired = Object.values(packageScripts).some((command) => command.includes(`scripts/agent/${scriptBase}.ts`));
    const importedBy = scriptReferenceIndex.get(file) ?? [];
    if (!isWired && importedBy.length === 0) {
      classification = "orphan_candidate";
      reasons.push("Agent script is not referenced by package scripts.");
      reasons.push("Agent script is not imported by other agent scripts.");
    } else {
      classification = classification ?? "supporting";
      if (isWired) reasons.push("Agent script is referenced by package scripts.");
      if (importedBy.length > 0) reasons.push(`Agent script is imported by ${importedBy.length} agent scripts.`);
    }
  }

  if (file.startsWith("docs/agent-truth/")) {
    classification = classification ?? "supporting";
    reasons.push("Agent truth documentation.");
  }

  if (file.startsWith("src/") || file.startsWith("functions/src/") || file === "firestore.rules" || file === "storage.rules") {
    classification = classification ?? "canonical";
    reasons.push("Runtime/configuration surface.");
  }

  if (!classification) return null;
  return { file, classification, reasons };
}

function main() {
  const packageJsonPath = repoPath("package.json");
  const packageJson = existsSync(packageJsonPath)
    ? (JSON.parse(readFileSync(packageJsonPath, "utf8")) as { scripts?: Record<string, string> })
    : {};
  const scripts = packageJson.scripts ?? {};

  const trackedFiles = listTrackedFiles();
  const scriptReferenceIndex = buildAgentScriptReferenceIndex(trackedFiles);
  const records = trackedFiles
    .filter((file) => existsSync(repoPath(file)))
    .map((file) => classifyFile(file, scripts, scriptReferenceIndex))
    .filter((record): record is JunkRecord => Boolean(record));

  const orphanCandidates = records.filter((record) => record.classification === "orphan_candidate").map((record) => record.file);
  const deprecatedFiles = records.filter((record) => record.classification === "deprecated").map((record) => record.file);
  const blockedLegacyPaths = records.filter((record) => record.classification === "blocked").map((record) => record.file);
  const safeToRemove = records.filter((record) => record.classification === "safe_to_remove").map((record) => record.file);

  const status: JunkReport["status"] = orphanCandidates.length > 0 ? "warning" : "pass";
  const summary = `classified=${records.length}, orphanCandidates=${orphanCandidates.length}, deprecated=${deprecatedFiles.length}, blocked=${blockedLegacyPaths.length}`;

  const report: JunkReport = {
    generatedAt: nowIso(),
    status,
    summary,
    records,
    removedFiles: [],
    deprecatedFiles,
    blockedLegacyPaths,
    orphanCandidates,
    safeToRemove,
  };

  writeJsonFile(REPORT_PATH, report);
  console.log(`Codebase junk scan: ${status.toUpperCase()} (${summary})`);
}

main();
