import { execFileSync } from "node:child_process";

import type { RepoInventoryEntry } from "./classify-repo-files";
import { createMetadata, getPackageScripts, readJsonFile, toStableId, writeJsonFile, writeTextFile } from "./shared";

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
  forbiddenByDefaultCommands: string[];
  protectedDomainEscalations: string[];
  manualEvidenceRequirements: string[];
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
  const available = new Map(commands.map((entry) => [entry.command, entry]));
  const packageScripts = getPackageScripts("package.json");

  for (const scriptName of Object.keys(packageScripts)) {
    const command = `npm run ${scriptName}`;
    if (available.has(command)) continue;
    available.set(command, {
      command,
      scopeType: "package_script",
      verifies_runtime: /typecheck|test|runtime|auth|payment|telemetry|debug|device|rules/u.test(scriptName),
      verifies_ui: /ui|device|layout|lighthouse/u.test(scriptName),
      verifies_rules: /rules|firebase/u.test(scriptName),
      verifies_inventory: /agent|inventory|architecture|generated/u.test(scriptName),
      verifies_continuity: /continuity|freshness|context/u.test(scriptName),
    });
  }

  return available;
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

function pathMatches(paths: string[], needles: string[]) {
  return paths.some((path) => {
    const normalizedPath = path.toLowerCase();
    return needles.some((needle) => {
      const normalizedNeedle = needle.toLowerCase();
      return normalizedPath === normalizedNeedle
        || normalizedPath.includes(normalizedNeedle)
        || normalizedPath.startsWith(`${normalizedNeedle}/`);
    });
  });
}

function pushUnique(values: string[], value: string) {
  if (!values.includes(value)) values.push(value);
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
  const pathSignals = [...matchedPaths, ...unmatchedPaths];
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
  ) || pathMatches(pathSignals, ["src/app/admin/debug", "src/app/admin/analytics", "admin-debug", "admin-analytics"]);
  const touchesTelemetry = matchedEntries.some((entry) =>
    entry.surface_category === "analytics"
    || entry.path.includes("telemetry")
    || entry.path.includes("analytics"),
  ) || matchedEntries.some((entry) =>
    entry.path.includes("behavioral")
    || entry.path.includes("recommendation"),
  ) || pathMatches(pathSignals, ["telemetry", "analytics", "behavioral", "person-metrics", "identity-handoff"]);
  const touchesFunctions = matchedEntries.some((entry) => entry.functions_related) || pathSignals.some((path) => path.startsWith("functions/src/"));
  const touchesRules = matchedEntries.some((entry) =>
    entry.path.endsWith(".rules")
    || entry.path.endsWith(".rules.json")
    || entry.path === "firebase.json",
  ) || pathMatches(pathSignals, ["firestore.rules", "database.rules", "storage.rules", "firebase.json"]);
  const touchesAuth = pathMatches(pathSignals, ["auth", "identity-truth", "identity-handoff", "middleware.ts"]);
  const touchesPayment = pathMatches(pathSignals, ["paypal", "payment", "purchase", "wallet", "gumdrop", "unlock", "entitlement"]);
  const touchesDeviceLayout = pathMatches(pathSignals, ["device-layout", "device-ui", "mobile-ui", "user-mobile-shell", "Navbar", "ChatExperience"]);
  const touchesGeneratedArtifacts = pathSignals.some((path) =>
    path.startsWith("agent/state/")
    || path.startsWith("agent/index/")
    || path.startsWith("agent/context/")
    || path.endsWith(".generated.json")
    || path.endsWith(".generated.md"),
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
  const protectedDomainEscalations: string[] = [];
  const manualEvidenceRequirements: string[] = [];
  const forbiddenByDefaultCommands = [
    "npm run check",
    "npm run check:ui:audits",
    "npm run check:ui:lighthouse",
    "npm run check:ui:omni",
    "npx cypress run",
    "playwright",
    "cypress",
    "lighthouse",
    "firebase deploy",
    "gcloud",
    "provider API calls",
  ];
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
  }

  if (touchesAdmin) {
    addSelection(selections, available, "fast", "npm run check:admin-browser-surface-smoke", "Admin browser surface map, selectors, and evidence boundary should stay current.");
    addSelection(selections, available, "signoff", "npm run check:admin-browser-surface-smoke:browser", "Authenticated admin browser signoff uses the dedicated opt-in surface smoke lane.");
    pushUnique(manualEvidenceRequirements, "admin_browser_auth: authenticated admin browser signoff requires ADMIN_BROWSER_SMOKE_STORAGE_STATE and does not clear provider/runtime/admin-truth gates.");
  } else if (touchesUi) {
    addSelection(selections, available, "fast", "npm run check:ui:runtime", "Hydration/runtime UI continuity should stay truthful.");
    addSelection(selections, available, "signoff", "npm run check:ui:audits", "Public/user UI signoff requires Playwright audit coverage.");
  }

  if (touchesDeviceLayout) {
    addSelection(selections, available, "fast", "npm run check:device-layout-contract", "Device layout/mobile shell contract changed.");
    addSelection(selections, available, "fast", "npm run check:device-ui", "Device UI dry audit is cheaper than browser audits.");
    pushUnique(protectedDomainEscalations, "device_layout: use deterministic device/layout validators before any browser audit.");
  }

  if (touchesTelemetry) {
    addSelection(selections, available, "fast", "npm run check:telemetry-dependency-graph", "Telemetry dependency graph should remain source-closed.");
    addSelection(selections, available, "fast", "npm run check:telemetry", "Telemetry or analytics semantics changed.");
    addSelection(selections, available, "fast", "npm run check:analytics-semantics", "Canonical analytics naming/schema must remain aligned.");
    addSelection(selections, available, "fast", "npm run check:telemetry-parity-score", "Telemetry parity score catches broad source drift without runtime proof.");
    addSelection(selections, available, "signoff", "npm run check:analytics:continuity", "Analytics continuity needs explicit signoff for behavioral/runtime changes.");
    pushUnique(manualEvidenceRequirements, "telemetry_runtime: source checks cannot prove provider/runtime/admin sample evidence.");
  }

  if (touchesFunctions) {
    addSelection(selections, available, "fast", "npm --prefix functions run check", "Functions runtime/manifests changed.");
  }

  if (touchesAuth) {
    addSelection(selections, available, "fast", "npm run check:auth-runtime-telemetry", "Auth/session telemetry and classified 4xx paths need targeted validation.");
    addSelection(selections, available, "fast", "npm run check:auth-role-drift-4xx-policy", "Auth role/session errors must stay classified.");
    addSelection(selections, available, "signoff", "npm run check:auth-readiness-lock", "Auth surfaces are protected and need readiness signoff before release claims.");
    pushUnique(protectedDomainEscalations, "auth: preserve session semantics, permission truth, and classified 4xx behavior.");
  }

  if (touchesPayment) {
    addSelection(selections, available, "fast", "npm run check:payment-unlock-security", "Payment/unlock/economy source truth is protected.");
    addSelection(selections, available, "fast", "npm run check:purchase-telemetry-truth", "Purchase telemetry must remain source-truth aligned.");
    addSelection(selections, available, "fast", "npm run check:unlock-telemetry-truth", "Unlock telemetry must remain source-truth aligned.");
    addSelection(selections, available, "signoff", "npm run check:legal-payment-copy", "Payment-adjacent user-facing copy/legal state needs signoff.");
    pushUnique(protectedDomainEscalations, "payment_economy_unlock: do not weaken source-of-funds, entitlement, provider callback, or locked content truth.");
    pushUnique(manualEvidenceRequirements, "payment_provider: PayPal/provider success requires formal external smoke evidence, not source-only checks.");
  }

  if (touchesRules) {
    addSelection(selections, available, "signoff", "npm run check:firebase:rules", "Rules or emulator-sensitive files changed.");
    pushUnique(protectedDomainEscalations, "firebase_rules: security/rules changes are signoff-only and require emulator/rules validation.");
  }

  if (touchesAdmin) {
    addSelection(selections, available, "fast", "npm run check:debug-evidence-pipeline", "Admin Debug surfaces must preserve debug evidence lanes.");
    addSelection(selections, available, "fast", "npm run check:admin-debug-control-tower", "Admin Debug Control Tower must not show missing/stale data as healthy.");
    pushUnique(manualEvidenceRequirements, "admin_truth_sample: source checks cannot satisfy redacted admin truth sample gates.");
  }

  if (touchesGeneratedArtifacts) {
    addSelection(selections, available, "fast", "npm run check:generated-report-authority", "Generated artifacts are evidence snapshots, not source truth.");
    addSelection(selections, available, "fast", "npm run check:agent-context", "Generated agent context/index artifacts should stay internally valid.");
    pushUnique(manualEvidenceRequirements, "generated_artifacts: refresh only consumed artifacts; stale reports remain evidence, not runtime truth.");
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
    forbiddenByDefaultCommands,
    protectedDomainEscalations,
    manualEvidenceRequirements,
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

  if (plan.protectedDomainEscalations.length > 0) {
    lines.push("", "Protected-domain escalations:", ...plan.protectedDomainEscalations.map((entry) => `- ${entry}`));
  }

  if (plan.manualEvidenceRequirements.length > 0) {
    lines.push("", "Manual evidence requirements:", ...plan.manualEvidenceRequirements.map((entry) => `- ${entry}`));
  }

  if (plan.forbiddenByDefaultCommands.length > 0) {
    lines.push("", "Forbidden by default:", ...plan.forbiddenByDefaultCommands.map((entry) => `- ${entry}`));
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
