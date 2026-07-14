import { readdirSync } from "node:fs";
import path from "node:path";

import { ROOT, getPackageScripts, readJsonFile, walkDirectoryFiles } from "./shared";

export const VALIDATOR_AUTHORITY_PATH = "agent/context/validator-authority.json";

export type ValidatorAuthorityStatus = "canonical" | "supporting" | "superseded" | "legacy" | "blocked";
export type ValidatorAuthorityLevel =
  | "canonical_contract"
  | "supporting_contract"
  | "superseded_contract"
  | "supporting_score"
  | "legacy_reference"
  | "blocked_reference";

export type ValidatorAuthorityValidatorEntry = {
  surface: string;
  authority: ValidatorAuthorityLevel;
  status: ValidatorAuthorityStatus;
  canonicalContracts: string[];
  packageScripts: string[];
  reason: string;
};

export type ValidatorAuthorityPackageScriptEntry = {
  surface: string;
  authority: ValidatorAuthorityLevel;
  status: ValidatorAuthorityStatus;
  canonicalContracts: string[];
  validators: string[];
  reason: string;
  legacyReference?: boolean;
};

export type ValidatorAuthorityDocument = {
  version: number;
  updatedAt: string;
  defaultAffectedAuditBlockedStatuses: ValidatorAuthorityStatus[];
  validators: Record<string, ValidatorAuthorityValidatorEntry>;
  packageScripts: Record<string, ValidatorAuthorityPackageScriptEntry>;
  summary: {
    validatorCount: number;
    packageScriptCount: number;
    byStatus: Record<ValidatorAuthorityStatus, number>;
  };
};

export type ValidatorMapDocument = {
  validators?: Record<string, string>;
};

export function readRootPackageScripts() {
  return getPackageScripts("package.json");
}

export function readValidatorMap() {
  return readJsonFile<ValidatorMapDocument>("agent/context/validator-map.json");
}

export function extractScriptFileRefs(command: string) {
  return Array.from(
    command.matchAll(/scripts\/[A-Za-z0-9_./:-]+\.(?:ts|tsx|js|mjs|cjs)/gu),
    (match) => match[0]?.replace(/\\/gu, "/") ?? "",
  ).filter(Boolean);
}

export function extractNestedPackageRuns(command: string) {
  return Array.from(
    command.matchAll(/npm run ([a-z0-9:_-]+)/giu),
    (match) => match[1] ?? "",
  ).filter(Boolean);
}

export function resolvePackageScriptValidatorFiles(
  packageScripts: Record<string, string>,
  scriptName: string,
  seen = new Set<string>(),
): string[] {
  if (seen.has(scriptName)) {
    return [];
  }
  seen.add(scriptName);
  const command = packageScripts[scriptName];
  if (!command) {
    return [];
  }

  const direct = extractScriptFileRefs(command);
  const nested = extractNestedPackageRuns(command)
    .flatMap((nestedScriptName) => resolvePackageScriptValidatorFiles(packageScripts, nestedScriptName, seen));

  return Array.from(new Set([...direct, ...nested])).sort((left, right) => left.localeCompare(right));
}

export function listStandaloneValidatorFiles() {
  const scriptFiles = walkDirectoryFiles("scripts")
    .map((repoPath) => repoPath.replace(/\\/gu, "/"))
    .filter((repoPath) => /\.(?:ts|tsx|js|mjs|cjs)$/u.test(repoPath));

  const included = scriptFiles.filter((repoPath) => {
    const baseName = path.basename(repoPath);
    if (/^check-.*\.(?:ts|tsx|js|mjs|cjs)$/u.test(baseName)) return true;
    if (/^validate-.*\.(?:ts|tsx|js|mjs|cjs)$/u.test(baseName)) return true;
    if (/^score-.*\.(?:ts|tsx|js|mjs|cjs)$/u.test(baseName)) return true;
    return false;
  });

  return Array.from(new Set(included)).sort((left, right) => left.localeCompare(right));
}

export function listValidatorPackageScripts(packageScripts: Record<string, string>) {
  return Object.entries(packageScripts)
    .filter(([scriptName, command]) => {
      if (!/^(check|score|legacy):/u.test(scriptName)) {
        return false;
      }
      if (extractScriptFileRefs(command).length > 0) {
        return true;
      }
      return resolvePackageScriptValidatorFiles(packageScripts, scriptName).length > 0;
    })
    .map(([scriptName]) => scriptName)
    .sort((left, right) => left.localeCompare(right));
}

export function readValidatorAuthority() {
  return readJsonFile<ValidatorAuthorityDocument>(VALIDATOR_AUTHORITY_PATH);
}

export function fileExistsInRepo(repoPath: string) {
  try {
    const absolutePath = path.join(ROOT, repoPath);
    return readdirSync(path.dirname(absolutePath)).includes(path.basename(absolutePath));
  } catch {
    return false;
  }
}
