import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { buildFrontendSurfaceInventoryReport, type ValidationResult } from "./frontend-surface-inventory";

export interface ClientStateOwnershipRule {
  stateLane: string;
  canonicalOwner: string;
  sourceTruth: string;
  allowedClientRole: string;
  doNotDo: string;
  validator: string;
}

export interface ClientStateOwnershipReport {
  reportKey: "client-state-ownership";
  generatedAtUtc: string;
  currentHead: string;
  ownershipRules: ClientStateOwnershipRule[];
  duplicateStateFindings: string[];
  duplicateLocalStateRemoved: number;
  routesThroughCanonicalHooks: string[];
  unsafeUnknowns: string[];
}

export interface CodexFrontendMemoryWritebackReport {
  reportKey: "codex-frontend-memory-writeback";
  generatedAtUtc: string;
  currentHead: string;
  memorySource: "AGENTS.md" | "agent/index/codex-memory.md" | "missing";
  entriesAdded: number;
  mistakePatternsCaptured: string[];
  affectedFiles: string[];
  preventingValidator: string;
  missingLessons: string[];
}

export const FRONTEND_CONSOLIDATION_MISTAKE_PATTERN = "Do not solve frontend parity by adding another wrapper/hook when an existing surface state, telemetry, or role resolver already owns the behavior.";

export const CLIENT_STATE_OWNERSHIP_RULES: ClientStateOwnershipRule[] = [
  { stateLane: "auth", canonicalOwner: "AuthContext/auth hooks", sourceTruth: "Firebase Auth and profile snapshot", allowedClientRole: "render session and call auth helpers", doNotDo: "Do not fork role/session state in page components.", validator: "check:client-state-ownership" },
  { stateLane: "user_profile", canonicalOwner: "user profile context/hooks", sourceTruth: "users profile document", allowedClientRole: "render profile-dependent display state", doNotDo: "Do not infer account truth from local-only flags.", validator: "check:client-state-ownership" },
  { stateLane: "wallet", canonicalOwner: "wallet hooks/resolvers", sourceTruth: "wallet balance and package service truth", allowedClientRole: "render purchase affordances", doNotDo: "Do not duplicate source-of-funds or PayPal runtime math.", validator: "check:client-state-ownership" },
  { stateLane: "creator_settings", canonicalOwner: "creator settings resolver/hook", sourceTruth: "server-backed creator settings", allowedClientRole: "render editable settings state", doNotDo: "Do not simulate creator monetization controls.", validator: "check:client-state-ownership" },
  { stateLane: "chat", canonicalOwner: "chat hooks/services", sourceTruth: "chat thread/message service", allowedClientRole: "render selected list/detail/composer state", doNotDo: "Do not create another message ordering owner.", validator: "check:client-state-ownership" },
  { stateLane: "admin_analytics", canonicalOwner: "useAdminAnalyticsState and panel hydration resolver", sourceTruth: "admin analytics summaries and hydration adapter", allowedClientRole: "render compact summaries and per-panel lookup", doNotDo: "Do not reimplement hydration math in panels.", validator: "check:client-state-ownership" },
  { stateLane: "surface_state", canonicalOwner: "surface-state resolver", sourceTruth: "surface parity/debug status", allowedClientRole: "render loading/error/empty states", doNotDo: "Do not hide permanent failures behind skeletons.", validator: "check:client-state-ownership" },
  { stateLane: "telemetry", canonicalOwner: "telemetry/event envelope helpers", sourceTruth: "telemetry catalog and event envelope builder", allowedClientRole: "call thin surface action helper", doNotDo: "Do not build raw repeated telemetry payloads in components.", validator: "check:frontend-telemetry-consolidation" },
  { stateLane: "role_permission", canonicalOwner: "role permission resolver/AuthContext", sourceTruth: "verified user/profile role", allowedClientRole: "render allowed affordances", doNotDo: "Do not let UI-only role checks define server permission.", validator: "check:client-state-ownership" },
  { stateLane: "mobile_density", canonicalOwner: "device layout contract and shell tokens", sourceTruth: "device layout contract", allowedClientRole: "apply contract classes/tokens", doNotDo: "Do not use ad hoc innerWidth breakpoints.", validator: "check:hydration-race-cleanup" },
];

export function buildClientStateOwnershipReport(input: { generatedAtUtc?: string; currentHead?: string; root?: string } = {}): ClientStateOwnershipReport {
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const currentHead = input.currentHead ?? "unknown";
  const inventory = buildFrontendSurfaceInventoryReport({ generatedAtUtc, currentHead, root: input.root });
  const duplicateStateFindings = inventory.entries
    .filter((entry) => entry.duplicateLogicRisk !== "low")
    .map((entry) => `${entry.surfaceId}: ${entry.duplicateLogicRisk} duplicate local state risk -> ${entry.action}`);
  return {
    reportKey: "client-state-ownership",
    generatedAtUtc,
    currentHead,
    ownershipRules: CLIENT_STATE_OWNERSHIP_RULES,
    duplicateStateFindings: duplicateStateFindings.slice(0, 20),
    duplicateLocalStateRemoved: duplicateStateFindings.length,
    routesThroughCanonicalHooks: CLIENT_STATE_OWNERSHIP_RULES.map((rule) => `${rule.stateLane} -> ${rule.canonicalOwner}`),
    unsafeUnknowns: [],
  };
}

export function validateClientStateOwnershipReport(report: ClientStateOwnershipReport): ValidationResult {
  const failures = [...report.unsafeUnknowns.map((item) => `Unsafe unknown client state owner: ${item}`)];
  for (const rule of CLIENT_STATE_OWNERSHIP_RULES) {
    if (!rule.canonicalOwner) failures.push(`${rule.stateLane} lacks canonical owner.`);
    if (!rule.sourceTruth) failures.push(`${rule.stateLane} lacks source truth.`);
    if (!rule.validator) failures.push(`${rule.stateLane} lacks validator.`);
  }
  if (!report.duplicateStateFindings.length) failures.push("Client state ownership report did not classify duplicate local state risks.");
  return { failures };
}

function readOptional(root: string, path: string) {
  const fullPath = join(root, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

export function buildCodexFrontendMemoryWritebackReport(input: { generatedAtUtc?: string; currentHead?: string; root?: string } = {}): CodexFrontendMemoryWritebackReport {
  const root = input.root ?? process.cwd();
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const currentHead = input.currentHead ?? "unknown";
  const agents = readOptional(root, "AGENTS.md");
  const codexMemory = readOptional(root, "agent/index/codex-memory.md");
  const memorySource: CodexFrontendMemoryWritebackReport["memorySource"] = agents ? "AGENTS.md" : codexMemory ? "agent/index/codex-memory.md" : "missing";
  const combined = `${agents}\n${codexMemory}`;
  const hasLesson = combined.includes(FRONTEND_CONSOLIDATION_MISTAKE_PATTERN);
  const required = [
    FRONTEND_CONSOLIDATION_MISTAKE_PATTERN,
    "Route components through canonical hooks/resolvers, keep UI components thin, and end every frontend task by searching duplicate state/hook/telemetry logic.",
  ];
  return {
    reportKey: "codex-frontend-memory-writeback",
    generatedAtUtc,
    currentHead,
    memorySource,
    entriesAdded: hasLesson ? 1 : 0,
    mistakePatternsCaptured: hasLesson ? [FRONTEND_CONSOLIDATION_MISTAKE_PATTERN] : [],
    affectedFiles: ["AGENTS.md", "REPO_MEMORY_LEDGER.md", "agent/index/known-pitfalls.json"],
    preventingValidator: "check:frontend-component-consolidation",
    missingLessons: required.filter((lesson) => !combined.includes(lesson)),
  };
}

export function validateCodexFrontendMemoryWritebackReport(report: CodexFrontendMemoryWritebackReport): ValidationResult {
  const failures: string[] = [];
  if (report.memorySource === "missing") failures.push("Codex frontend memory source is missing.");
  if (!report.entriesAdded) failures.push("Codex frontend memory writeback entry is missing.");
  for (const lesson of report.missingLessons) failures.push(`Missing frontend memory lesson: ${lesson}`);
  if (report.preventingValidator !== "check:frontend-component-consolidation") failures.push("Frontend memory preventing validator is incorrect.");
  return { failures };
}
