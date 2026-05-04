import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  mapDebugCategoryToAuditDomains,
  rankDebugEvidenceForAudit,
  type DebugEvidenceAuditSummary,
  type DebugEvidenceIndexArtifact,
} from "../../src/lib/debug-evidence-contract";

export const DEBUG_EVIDENCE_INDEX_PATH = "agent/state/debug-evidence-index.generated.json";
export const PRECATCH_RUNTIME_ISSUES_PATH = "agent/state/precatch-runtime-issues.generated.json";

function readJsonFile<T>(root: string, relativePath: string): T | null {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as T;
  } catch {
    return null;
  }
}

export function readDebugEvidenceIndex(root = process.cwd()): DebugEvidenceIndexArtifact | null {
  return readJsonFile<DebugEvidenceIndexArtifact>(root, DEBUG_EVIDENCE_INDEX_PATH);
}

export function loadDebugEvidenceForAuditDomain(
  domain: string,
  root = process.cwd(),
  limitCount = 10,
): DebugEvidenceAuditSummary[] {
  const artifact = readDebugEvidenceIndex(root);
  if (!artifact?.records?.length) {
    return [];
  }

  return artifact.records
    .filter((record) => mapDebugCategoryToAuditDomains(record.category).includes(domain))
    .sort(rankDebugEvidenceForAudit)
    .slice(0, Math.max(1, limitCount));
}

export function loadDebugEvidenceForAuditDomains(
  domains: string[],
  root = process.cwd(),
  limitCount = 10,
) {
  return Object.fromEntries(
    domains.map((domain) => [
      domain,
      loadDebugEvidenceForAuditDomain(domain, root, limitCount),
    ]),
  );
}

if (process.argv[1]?.endsWith("load-debug-evidence-for-audit.ts")) {
  const domains = process.argv.slice(2);
  const selectedDomains = domains.length > 0 ? domains : ["layout", "hydration", "economy", "telemetry", "contentProtection", "support"];
  const evidence = loadDebugEvidenceForAuditDomains(selectedDomains);
  console.log(JSON.stringify({ domains: selectedDomains, evidence }, null, 2));
}
