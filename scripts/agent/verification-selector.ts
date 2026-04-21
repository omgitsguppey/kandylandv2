import { execFileSync } from "node:child_process";

import type { RepoInventoryEntry } from "./classify-repo-files";
import { createMetadata, readJsonFile, toStableId, writeJsonFile, writeTextFile } from "./shared";

type VerificationCommandEntry = {
  command: string;
  scopeType: string;
  verifies_runtime: boolean;
  verifies_ui: boolean;
  verifies_rules: boolean;
  verifies_inventory: boolean;
  verifies_continuity: boolean;
};

type SurfaceDomain = {
  name: string;
  path_prefixes: string[];
  broad_work_trigger: boolean;
};

type UiSurface = {
  route_or_component: string;
};

type VerificationLane = "fast" | "signoff";

type VerificationSelection = {
  command: string;
  why: string[];
  lane: VerificationLane;
};

export type VerificationPlan = {
  generatedAt: string;
  truthOrder: string[];
  source: string[];
  stable_id: string;
  inputPaths: string[];
  matchedRepoPaths: string[];
  unmatchedPaths: string[];
  touchedDomains: string[];
  fastCommands: string[];
  signoffCommands: string[];
  fastSelections: VerificationSelection[];
  signoffSelections: VerificationSelection[];
  signoffAdvisories: string[];
  forbiddenSurfaces: string[];
  broadWork: boolean;
  reasoning: string[];
};

type SelectorInput = {
  paths: string[];
};

function normalizeRepoPath(value: string) {
  return value.replace(/\\/g, "/").trim();
}

function parseArgs() {
  const paths: string[] = [];

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--path=")) {
      paths.push(normalizeRepoPath(arg.slice("--path=".length)));
      continue;
    }

    if (arg.startsWith("--paths=")) {
      arg
        .slice("--paths=".length)
        .split(",")
        .map((entry) => normalizeRepoPath(entry))
        .filter(Boolean)
        .forEach((entry) => paths.push(entry));
      continue;
    }

    if (arg.trim()) {
      paths.push(normalizeRepoPath(arg));
    }
  }

  if (paths.length === 0) {
    throw new Error("Usage: tsx scripts/agent/verification-selector.ts --paths=<file1,file2> [--path=<file3>]");
  }

  return { paths };
}

function getAvailableCommands() {
  const commands = readJsonFile<{ commands: VerificationCommandEntry[] }>("agent/index/verification-commands.json").commands;
  return new Map(commands.map((entry) => [entry.command, entry]));
}

function getInventory() {
  const entries = readJsonFile<{ items: RepoInventoryEntry[] }>("agent/index/repo-inventory.json").items;
  return new Map(entries.map((entry) => [entry.path, entry]));
}

function getSurfaceDomains() {
  return readJsonFile<{ domains: SurfaceDomain[] }>("agent/index/surface-map.json").domains;
}

function getIndexedUiSurfaces() {
  return new Set(
    readJsonFile<{ surfaces: UiSurface[] }>("agent/index/ui-surface-coverage.json").surfaces
      .map((entry) => entry.route_or_component),
  );
}

function commandExists(command: string, available: Map<string, VerificationCommandEntry>) {
  return (
    available.has(command)
    || command.startsWith("npm run agent:test -- ")
    || command.startsWith("npm run trace:adjacent -- ")
  );
}

function addSelection(
  selections: Map<string, VerificationSelection>,
  available: Map<string, VerificationCommandEntry>,
  lane: VerificationLane,
  command: string,
  reason: string,
) {
  if (!commandExists(command, available)) {
    return;
  }

  const existing = selections.get(command);
  if (existing) {
    if (!existing.why.includes(reason)) {
      existing.why.push(reason);
    }
    if (lane === "signoff") {
      existing.lane = "signoff";
    }
    return;
  }

  selections.set(command, {
    command,
    why: [reason],
    lane,
  });
}

function buildTargetedTestCommands(paths: string[]) {
  return paths
    .filter((entry) => entry.endsWith(".ts") || entry.endsWith(".tsx") || entry.endsWith(".js") || entry.endsWith(".jsx"))
    .slice(0, 4)
    .map((entry) => `npm run agent:test -- ${entry}`);
}

function selectForbiddenSurfaces(matchedPaths: string[]) {
  const defaults = [
    "src/lib/gumdrop-ledger.ts",
    "src/lib/gumdrop-economics.ts",
    "src/lib/server/paypal.ts",
    "src/app/api/paypal",
    "functions/src/analytics-transactions.ts",
  ];

  return defaults.filter((entry) => !matchedPaths.some((path) => path === entry || path.startsWith(entry)));
}

function computeTouchedDomains(paths: string[], domains: SurfaceDomain[]) {
  return domains
    .filter((domain) => domain.path_prefixes.some((prefix) => paths.some((path) => path === prefix || path.startsWith(`${prefix}/`))))
    .map((domain) => domain.name)
    .sort();
}

export function selectVerificationPlan(input: SelectorInput): VerificationPlan {
  const inventory = getInventory();
  const available = getAvailableCommands();
  const domains = getSurfaceDomains();
  const indexedUiSurfaces = getIndexedUiSurfaces();
  const normalizedPaths = Array.from(new Set(input.paths.map(normalizeRepoPath).filter(Boolean)));
  const matchedEntries = normalizedPaths
    .map((entry) => inventory.get(entry))
    .filter((entry): entry is RepoInventoryEntry => Boolean(entry));
  const matchedPaths = matchedEntries.map((entry) => entry.path);
  const unmatchedPaths = normalizedPaths.filter((entry) => !inventory.has(entry));
  const touchedDomains = computeTouchedDomains(matchedPaths, domains);

  const touchesUi = matchedEntries.some((entry) =>
    entry.file_class === "admin_surface"
    || entry.file_class === "app_surface"
    || entry.file_class === "component"
    || indexedUiSurfaces.has(entry.path),
  );
  const touchesAdmin = matchedEntries.some((entry) =>
    entry.surface_category === "admin_ui"
    || entry.surface_category === "admin_route"
    || entry.surface_category === "ai_admin_ui"
    || entry.surface_category === "ai_admin_route",
  );
  const touchesTelemetry = matchedEntries.some((entry) =>
    entry.surface_category === "analytics"
    || entry.path.includes("telemetry")
    || entry.path.includes("analytics"),
  ) || matchedEntries.some((entry) =>
    entry.path.includes("behavioral")
    || entry.path.includes("recommendation"),
  );
  const touchesFunctions = matchedEntries.some((entry) => entry.functions_related);
  const touchesRules = matchedEntries.some((entry) =>
    entry.path.endsWith(".rules")
    || entry.path.endsWith(".rules.json")
    || entry.path === "firebase.json",
  );
  const touchesRuntimeContinuity = matchedEntries.some((entry) =>
    entry.path.includes("queue-runtime")
    || entry.path.includes("runtime-warning")
    || entry.path.includes("check-runtime-continuity")
    || entry.path.includes("check-scheduler-freshness")
    || entry.path.includes("check-warnings")
    || entry.path.includes("process-queue")
    || entry.path.includes("notify-active-drops"),
  );
  const touchesRepoTooling = matchedEntries.some((entry) =>
    entry.file_class === "repo_intelligence_tooling"
    || entry.file_class === "repo_tooling"
    || entry.file_class === "agent_docs"
    || entry.file_class === "agent_index"
    || entry.file_class === "agent_schema"
    || entry.file_class === "agent_state"
    || entry.file_class === "workflow_guidance"
    || entry.file_class === "workflow_tooling"
    || entry.file_class === "root_config"
    || entry.file_class === "functions_config"
    || entry.file_class === "governance",
  );
  const broadWork = matchedEntries.some((entry) => entry.likely_broad_signoff_relevant)
    || domains.some((domain) =>
      domain.broad_work_trigger
      && domain.path_prefixes.some((prefix) => matchedPaths.some((path) => path === prefix || path.startsWith(`${prefix}/`))),
    );

  const selections = new Map<string, VerificationSelection>();
  const reasoning = [
    matchedPaths.length > 0
      ? `Matched ${matchedPaths.length} repo-tracked paths.`
      : "No repo-tracked paths matched exactly; verification falls back to generic lanes only.",
  ];

  if (matchedEntries.some((entry) => entry.path.endsWith(".ts") || entry.path.endsWith(".tsx") || entry.path.endsWith(".js") || entry.path.endsWith(".jsx"))) {
    addSelection(selections, available, "fast", "npm run typecheck", "TypeScript or runtime code changed.");
  }

  buildTargetedTestCommands(matchedPaths).forEach((command) => {
    addSelection(selections, available, "fast", command, "Run the narrowest related contract/unit tests first.");
  });

  if (touchesUi || touchesAdmin) {
    addSelection(selections, available, "fast", "npm run check:ui:coverage", "Indexed UI/admin surfaces changed.");
    addSelection(selections, available, "fast", "npm run check:ui:runtime", "Hydration/runtime UI continuity should stay truthful.");
    addSelection(selections, available, "signoff", "npm run check:ui:audits", "UI/admin signoff requires Playwright audit coverage.");
  }

  if (touchesTelemetry) {
    addSelection(selections, available, "fast", "npm run check:telemetry", "Telemetry or analytics semantics changed.");
    addSelection(selections, available, "fast", "npm run check:analytics-semantics", "Canonical analytics naming/schema must remain aligned.");
    addSelection(selections, available, "signoff", "npm run check:analytics:continuity", "Analytics continuity needs explicit signoff for behavioral/runtime changes.");
  }

  if (touchesFunctions) {
    addSelection(selections, available, "fast", "npm --prefix functions run check", "Functions runtime/manifests changed.");
  }

  if (touchesRules) {
    addSelection(selections, available, "signoff", "npm run check:firebase:rules", "Rules or emulator-sensitive files changed.");
  }

  if (touchesRuntimeContinuity) {
    addSelection(selections, available, "signoff", "npm run check:scheduler:freshness", "Scheduler/runtime continuity surface changed.");
    addSelection(selections, available, "signoff", "npm run check:queue:runtime", "Queue runtime continuity surface changed.");
    addSelection(selections, available, "signoff", "npm run check:warnings", "Warning-budget/runtime degradation paths changed.");
    addSelection(selections, available, "signoff", "npm run check:runtime:continuity", "Runtime continuity signoff is required for scheduler/queue changes.");
  }

  if (touchesRepoTooling) {
    addSelection(selections, available, "fast", "npm run check:agent-context", "Repo intelligence outputs should stay internally valid.");
    addSelection(selections, available, "signoff", "npm run check:inventory", "Repo-tooling changes must preserve inventory truth.");
    addSelection(selections, available, "signoff", "npm run check:architecture", "Repo-tooling/shared-helper changes need architecture validation.");
    addSelection(selections, available, "signoff", "npm run check:agent-intelligence", "Agent indexes and helper extraction must stay coherent.");
    addSelection(selections, available, "signoff", "npm run eval:agent-context", "Task-context retrieval/eval fixtures changed.");
  }

  if (broadWork) {
    addSelection(selections, available, "signoff", "npm run check:continuity", "Broad/shared/helper/tooling work requires continuity signoff.");
  }

  const signoffAdvisories: string[] = [];
  if (touchesUi) {
    signoffAdvisories.push("Run `npm run check:ui:lighthouse` only if the touched UI change affects loading, rendering, or performance-sensitive behavior.");
  }

  if (matchedPaths.length > 0) {
    signoffAdvisories.push("Run `npm run trace:adjacent -- <path>` for the main touched files before broad signoff.");
  }

  const fastSelections = Array.from(selections.values()).filter((entry) => entry.lane === "fast");
  const signoffSelections = Array.from(selections.values()).filter((entry) => entry.lane === "signoff");

  return {
    ...createMetadata([
      "agent/index/repo-inventory.json",
      "agent/index/verification-commands.json",
      "agent/index/surface-map.json",
      "agent/index/ui-surface-coverage.json",
    ]),
    stable_id: toStableId("verifyplan", matchedPaths.join("|") || normalizedPaths.join("|") || "unknown"),
    inputPaths: normalizedPaths,
    matchedRepoPaths: matchedPaths,
    unmatchedPaths,
    touchedDomains,
    fastCommands: fastSelections.map((entry) => entry.command),
    signoffCommands: signoffSelections.map((entry) => entry.command),
    fastSelections,
    signoffSelections,
    signoffAdvisories,
    forbiddenSurfaces: selectForbiddenSurfaces(matchedPaths),
    broadWork,
    reasoning,
  };
}

function formatPlan(plan: VerificationPlan) {
  const lines = [
    "Verification plan",
    "",
    `Matched paths: ${plan.matchedRepoPaths.length > 0 ? plan.matchedRepoPaths.join(", ") : "(none)"}`,
    `Broad work: ${plan.broadWork ? "yes" : "no"}`,
    `Touched domains: ${plan.touchedDomains.length > 0 ? plan.touchedDomains.join(", ") : "(none)"}`,
    "",
    "Fast loop:",
    ...(plan.fastSelections.length > 0
      ? plan.fastSelections.map((entry) => `- ${entry.command}  # ${entry.why.join("; ")}`)
      : ["- No fast-loop commands selected."]),
    "",
    "Signoff loop:",
    ...(plan.signoffSelections.length > 0
      ? plan.signoffSelections.map((entry) => `- ${entry.command}  # ${entry.why.join("; ")}`)
      : ["- No signoff commands selected."]),
  ];

  if (plan.signoffAdvisories.length > 0) {
    lines.push("", "Advisories:", ...plan.signoffAdvisories.map((entry) => `- ${entry}`));
  }

  if (plan.forbiddenSurfaces.length > 0) {
    lines.push("", "Forbidden surfaces by default:", ...plan.forbiddenSurfaces.map((entry) => `- ${entry}`));
  }

  return `${lines.join("\n")}\n`;
}

export function writeVerificationPlan(plan: VerificationPlan) {
  writeJsonFile("agent/state/verification-plan.generated.json", plan);
  writeTextFile("agent/prompts/verification-plan.generated.md", formatPlan(plan));
}

export function runVerificationSelector(input: SelectorInput) {
  const plan = selectVerificationPlan(input);
  writeVerificationPlan(plan);
  return plan;
}

if (require.main === module) {
  const plan = runVerificationSelector(parseArgs());
  const command = process.platform === "win32" ? "cmd.exe" : "true";
  if (command === "cmd.exe") {
    execFileSync(command, ["/d", "/s", "/c", "echo Verification plan written to agent/state/verification-plan.generated.json"], {
      stdio: "inherit",
    });
  } else {
    console.log("Verification plan written to agent/state/verification-plan.generated.json");
  }
  console.log(formatPlan(plan));
}
