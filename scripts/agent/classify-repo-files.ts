import path from "node:path";

import { fileExists, listRepoFiles, readFileModifiedMarker, toStableId } from "./shared";

export type RepoInventoryEntry = {
  stable_id: string;
  path: string;
  file_class: string;
  surface_category: string;
  generated: boolean;
  evidence_only: boolean;
  runtime_critical: boolean;
  workflow_guidance: boolean;
  governance_artifact: boolean;
  likely_shared_helper: boolean;
  likely_broad_signoff_relevant: boolean;
  dataconnect_related: boolean;
  functions_related: boolean;
  last_modified_or_hash: string;
};

const GOVERNANCE_DOCS = new Set([
  "FULL_SCALE_CODEBASE_AUDIT.md",
  "REPO_MEMORY_LEDGER.md",
  "EVERY_FILE_FUNCTION_CHECKLIST.md",
]);

const EVIDENCE_DOCS = new Set([
  "ANALYTICS_SYSTEM_AUDIT_2026-03-18.md",
  "FULL_CODEBASE_POST_AUDIT_2026-03-18.md",
  "STANDARDIZATION_AUDIT_CHECKLIST.md",
]);

const ROOT_CONFIG_FILES = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "eslint.config.mjs",
  "next.config.ts",
  "playwright.config.ts",
  "firebase.json",
  "firestore.rules",
  "storage.rules",
  "database.rules.json",
  "apphosting.yaml",
  "middleware.ts",
  ".dependency-cruiser.cjs",
  "knip.json",
  "vitest.config.ts",
  "vitest.contracts.config.ts",
]);

function isRootFile(filePath: string) {
  return !filePath.includes("/");
}

function isGenerated(filePath: string) {
  return (
    filePath.startsWith("agent/index/")
    || filePath.includes(".generated.")
    || filePath.includes("-generated")
    || filePath.includes("dataconnect-generated")
    || filePath.endsWith(".tsbuildinfo")
    || filePath.includes("-snapshots/")
  );
}

function isEvidenceOnly(filePath: string) {
  return (
    GOVERNANCE_DOCS.has(filePath)
    || EVIDENCE_DOCS.has(filePath)
    || filePath.startsWith("qa-screenshots/")
    || filePath.includes("-snapshots/")
    || filePath.startsWith("output/")
  );
}

function inferDomainClass(filePath: string) {
  if (GOVERNANCE_DOCS.has(filePath)) return "governance";
  if (filePath === "AGENTS.md") return "workflow_guidance";
  if (filePath.startsWith(".agent/")) return "workflow_tooling";
  if (filePath.startsWith("agent/index/")) return "agent_index";
  if (filePath.startsWith("agent/schemas/")) return "agent_schema";
  if (filePath.startsWith("agent/state/")) return "agent_state";
  if (filePath.startsWith("agent/")) return "agent_docs";
  if (filePath.startsWith("scripts/agent/")) return "repo_intelligence_tooling";
  if (filePath.startsWith("scripts/")) return "repo_tooling";
  if (filePath.startsWith("functions/src/")) return "functions_runtime";
  if (filePath.startsWith("functions/")) return "functions_config";
  if (filePath.startsWith("src/app/api/")) return "app_route";
  if (filePath.startsWith("src/app/admin/")) return "admin_surface";
  if (filePath.startsWith("src/app/")) return "app_surface";
  if (filePath.startsWith("src/components/")) return "component";
  if (filePath.startsWith("src/context/")) return "context";
  if (filePath.startsWith("src/hooks/")) return "hook";
  if (filePath.startsWith("src/lib/server/")) return "server_helper";
  if (filePath.startsWith("src/lib/")) return "shared_helper";
  if (filePath.startsWith("src/types/")) return "types";
  if (filePath.startsWith("tests/")) return "tests";
  if (filePath.startsWith("public/")) return "public_asset";
  if (filePath.startsWith("creator-playbooks/")) return "playbook";
  if (filePath.startsWith("cypress/")) return "ui_tests";
  if (ROOT_CONFIG_FILES.has(filePath)) return "root_config";
  if (isRootFile(filePath) && filePath.endsWith(".md")) return "documentation";
  if (isRootFile(filePath)) return "root_misc";
  return "other";
}

function inferSurfaceCategory(filePath: string) {
  if (filePath.startsWith("src/app/api/admin/ai/")) return "ai_admin_route";
  if (filePath.startsWith("src/app/admin/ai/")) return "ai_admin_ui";
  if (filePath.startsWith("src/app/api/admin/")) return "admin_route";
  if (filePath.startsWith("src/app/admin/")) return "admin_ui";
  if (filePath.startsWith("src/app/api/chat/")) return "chat_route";
  if (filePath.startsWith("src/components/Chat/")) return "chat_ui";
  if (filePath.startsWith("src/lib/chat")) return "chat_runtime";
  if (filePath.includes("analytics") || filePath.includes("telemetry")) return "analytics";
  if (filePath.includes("creator")) return "creator";
  if (filePath.includes("gumdrop") || filePath.includes("paypal") || filePath.includes("transaction")) return "economics";
  if (filePath.startsWith("src/app/api/")) return "route_handler";
  if (filePath.startsWith("src/app/")) return "app_ui";
  if (filePath.startsWith("src/components/")) return "ui_component";
  if (filePath.startsWith("src/lib/server/")) return "server_runtime";
  if (filePath.startsWith("src/lib/")) return "shared_runtime";
  if (filePath.startsWith("functions/src/")) return "firebase_functions";
  if (filePath.startsWith("scripts/")) return "repo_scripts";
  if (filePath.startsWith("agent/")) return "agent_intelligence";
  if (filePath.startsWith(".agent/")) return "agent_workflow";
  if (filePath.startsWith("tests/")) return "tests";
  if (filePath.startsWith("public/")) return "public_assets";
  if (filePath.endsWith(".md")) return "documentation";
  return "misc";
}

function isRuntimeCritical(filePath: string, domainClass: string) {
  return (
    domainClass === "app_route"
    || domainClass === "admin_surface"
    || domainClass === "app_surface"
    || domainClass === "component"
    || domainClass === "hook"
    || domainClass === "server_helper"
    || domainClass === "shared_helper"
    || domainClass === "functions_runtime"
    || filePath === "middleware.ts"
    || filePath === "next.config.ts"
    || filePath === "firebase.json"
    || filePath.endsWith(".rules")
    || filePath.endsWith(".rules.json")
  );
}

function isLikelySharedHelper(filePath: string, domainClass: string) {
  return (
    domainClass === "server_helper"
    || domainClass === "shared_helper"
    || filePath.startsWith("src/hooks/")
    || filePath.startsWith("scripts/agent/")
  );
}

function isBroadSignoffRelevant(filePath: string, domainClass: string) {
  return (
    domainClass.startsWith("agent_")
    || domainClass === "repo_intelligence_tooling"
    || domainClass === "repo_tooling"
    || domainClass === "governance"
    || domainClass === "workflow_guidance"
    || domainClass === "workflow_tooling"
    || domainClass === "root_config"
    || domainClass === "functions_config"
    || filePath === "package.json"
    || filePath === "functions/package.json"
    || filePath.endsWith("package-lock.json")
    || filePath.endsWith("pnpm-lock.yaml")
    || filePath.startsWith("src/lib/")
    || filePath.startsWith("src/lib/server/")
  );
}

export function classifyRepoFile(filePath: string): RepoInventoryEntry {
  const domainClass = inferDomainClass(filePath);

  return {
    stable_id: toStableId("file", filePath),
    path: filePath,
    file_class: domainClass,
    surface_category: inferSurfaceCategory(filePath),
    generated: isGenerated(filePath),
    evidence_only: isEvidenceOnly(filePath),
    runtime_critical: isRuntimeCritical(filePath, domainClass),
    workflow_guidance: domainClass === "workflow_guidance" || domainClass === "workflow_tooling",
    governance_artifact: domainClass === "governance",
    likely_shared_helper: isLikelySharedHelper(filePath, domainClass),
    likely_broad_signoff_relevant: isBroadSignoffRelevant(filePath, domainClass),
    dataconnect_related: filePath.includes("dataconnect") || filePath === "firebase.json",
    functions_related: filePath.startsWith("functions/"),
    last_modified_or_hash: readFileModifiedMarker(filePath),
  };
}

export function buildRepoInventory() {
  return listRepoFiles()
    .filter((filePath) => fileExists(filePath))
    .map((filePath) => classifyRepoFile(filePath));
}

export function groupInventoryByDomain(entries: RepoInventoryEntry[]) {
  return Object.entries(
    entries.reduce<Record<string, number>>((counts, entry) => {
      counts[entry.file_class] = (counts[entry.file_class] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .map(([domainClass, count]) => ({ domainClass, count }))
    .sort((left, right) => right.count - left.count || left.domainClass.localeCompare(right.domainClass));
}

export function countPathPrefixes(entries: RepoInventoryEntry[]) {
  const prefixes = [
    "src/app",
    "src/components",
    "src/hooks",
    "src/lib",
    "src/lib/server",
    "functions/src",
    "scripts",
    "tests",
    "agent/index",
    "agent/schemas",
    "agent/state",
  ];

  return prefixes.map((prefix) => ({
    prefix,
    count: entries.filter((entry) => entry.path === prefix || entry.path.startsWith(`${prefix}/`)).length,
  }));
}

export function fileDepth(filePath: string) {
  return path.posix.normalize(filePath).split("/").length;
}
