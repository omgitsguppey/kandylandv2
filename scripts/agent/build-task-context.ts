import { buildAgentIndexes } from "./build-agent-indexes";
import type { RepoInventoryEntry } from "./classify-repo-files";
import { buildLocalImportGraph } from "./summarize-dependency-graph";
import { compact, createMetadata, readJsonFile, toStableId, tokenize, validateWithSchema, writeJsonFile, writeTextFile } from "./shared";
import { selectVerificationPlan } from "./verification-selector";

type TaskMode =
  | "ui"
  | "runtime"
  | "security"
  | "dependency"
  | "audit"
  | "ai"
  | "chat"
  | "admin"
  | "creator"
  | "functions"
  | "governance";

const NOISE_TOKENS = new Set([
  "add",
  "breaking",
  "build",
  "canonical",
  "change",
  "changes",
  "handling",
  "modify",
  "patch",
  "runtime",
  "safe",
  "safely",
  "single",
  "surface",
  "surfaces",
  "without",
]);

type TaskSignals = {
  pathNeedles: string[];
  helperFamilyNeedles: string[];
  forbiddenPathNeedles: string[];
  requiredCommands: string[];
  optionalCommands: string[];
};

function parseArgs() {
  const files: string[] = [];
  let mode: TaskMode | null = null;
  let task = "";

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--mode=")) {
      mode = arg.slice("--mode=".length) as TaskMode;
      continue;
    }

    if (arg.startsWith("--file=")) {
      files.push(arg.slice("--file=".length).replace(/\\/g, "/"));
      continue;
    }

    if (arg.startsWith("--task=")) {
      task = arg.slice("--task=".length).trim();
      continue;
    }

    task = [task, arg].filter(Boolean).join(" ").trim();
  }

  if (!task) {
    throw new Error("Usage: tsx scripts/agent/build-task-context.ts --task=\"<task>\" [--mode=<mode>] [--file=<path>]");
  }

  return { task, mode, files };
}

function inferMode(task: string): TaskMode {
  const normalized = task.toLowerCase();
  if (normalized.includes("chat")) return "chat";
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("ai")) return "ai";
  if (normalized.includes("creator")) return "creator";
  if (normalized.includes("audit") || normalized.includes("ledger") || normalized.includes("governance")) return "audit";
  if (normalized.includes("dependency") || normalized.includes("lockfile") || normalized.includes("package")) return "dependency";
  if (normalized.includes("security")) return "security";
  if (normalized.includes("function")) return "functions";
  if (normalized.includes("ui") || normalized.includes("page") || normalized.includes("component")) return "ui";
  return "runtime";
}

function buildTaskSignals(mode: TaskMode, taskTokens: string[], taskText: string) {
  const hasAny = (...needles: string[]) => needles.some((needle) => taskTokens.includes(needle));
  const pathNeedles = new Set<string>();
  const helperFamilyNeedles = new Set<string>();
  const forbiddenPathNeedles = new Set<string>();
  const requiredCommands = new Set<string>();
  const optionalCommands = new Set<string>();
  const lowerTask = taskText.toLowerCase();

  const forbidIfScopedOut = (keyword: string, ...needles: string[]) => {
    if ((lowerTask.includes("without") || lowerTask.includes("do not") || lowerTask.includes("not touch")) && lowerTask.includes(keyword)) {
      needles.forEach((needle) => forbiddenPathNeedles.add(needle));
    }
  };

  forbidIfScopedOut("paypal", "paypal");
  forbidIfScopedOut("payment", "paypal", "payment");
  forbidIfScopedOut("payments", "paypal", "payment");
  forbidIfScopedOut("ledger", "ledger", "gumdrop", "transaction");
  forbidIfScopedOut("economy", "gumdrop", "economy", "transaction");
  forbidIfScopedOut("wallet", "wallet");
  forbidIfScopedOut("gumdrop", "gumdrop");

  if (mode === "chat" || hasAny("chat", "realtime", "thread", "message", "unread")) {
    ["chat", "chat-realtime", "thread", "message", "unread"].forEach((entry) => pathNeedles.add(entry));
    ["chat_realtime_runtime_helpers", "route_diagnostics_server_diagnostics", "route_boundary_auth_request_guard"].forEach((entry) => helperFamilyNeedles.add(entry));
    requiredCommands.add("npm run test:contracts");
  }

  if (mode === "admin" || hasAny("admin", "debug", "diagnostic", "diagnostics", "chart", "health")) {
    ["admin", "debug", "ui-chart-health", "chart-health", "route-diagnostics", "admin-panel-system-logs"].forEach((entry) => pathNeedles.add(entry));
    ["runtime_health_admin_debug_observability", "route_diagnostics_server_diagnostics", "route_boundary_auth_request_guard"].forEach((entry) => helperFamilyNeedles.add(entry));
    requiredCommands.add("npm run test:contracts");
    if (hasAny("ui", "chart", "health") || mode === "admin") {
      requiredCommands.add("npm run check:ui:audits");
    }
  }

  if (mode === "ai" || hasAny("ai", "model", "prompt", "cover")) {
    ["ai", "drop-covers"].forEach((entry) => pathNeedles.add(entry));
    helperFamilyNeedles.add("ai_admin_runtime_helpers");
    requiredCommands.add("npm run test:contracts");
  }

  if (mode === "creator" || hasAny("creator", "onboarding", "compliance")) {
    ["creator", "onboarding"].forEach((entry) => pathNeedles.add(entry));
    helperFamilyNeedles.add("creator_onboarding_compliance");
    requiredCommands.add("npm run test:contracts");
  }

  if (mode === "ui" || hasAny("ui", "hydration", "component", "page", "dashboard", "profile", "booking", "subscription")) {
    requiredCommands.add("npm run check:ui:coverage");
    requiredCommands.add("npm run check:ui:runtime");
    requiredCommands.add("npm run check:ui:audits");
    optionalCommands.add("npm run check:ui:lighthouse");
  }

  if (hasAny("telemetry", "analytics", "event")) {
    ["telemetry", "analytics", "analytics-event-facts", "analytics-security-events", "analytics-task-events"].forEach((entry) => pathNeedles.add(entry));
    helperFamilyNeedles.add("telemetry_analytics_canon");
    requiredCommands.add("npm run check:telemetry");
    requiredCommands.add("npm run check:analytics-semantics");
    requiredCommands.add("npm run check:analytics:continuity");
    optionalCommands.add("npm run test:contracts");
  }

  if (hasAny("behavioral", "ranking", "profile", "recommendation", "recommendations")) {
    ["behavioral", "ranking", "profile", "recommendation", "analytics"].forEach((entry) => pathNeedles.add(entry));
    helperFamilyNeedles.add("telemetry_analytics_canon");
    optionalCommands.add("npm run check:analytics-semantics");
  }

  if (mode === "dependency" || mode === "functions" || hasAny("dependency", "deploy", "lockfile", "npm", "package", "pnpm")) {
    ["package", "package-lock", "pnpm-lock", "functions/package", "functions/pnpm-lock"].forEach((entry) => pathNeedles.add(entry));
    requiredCommands.add("npm run check:continuity");
    if (mode === "functions" || hasAny("functions")) {
      requiredCommands.add("npm --prefix functions run check");
    }
  }

  if (mode === "audit" || mode === "governance" || hasAny("agent", "audit", "governance", "ledger", "repo")) {
    ["agent/", "governance", "ledger", "audit", "scripts/agent"].forEach((entry) => pathNeedles.add(entry));
    requiredCommands.add("npm run check:agent-context");
    requiredCommands.add("npm run check:continuity");
  }

  if (hasAny("contract", "contracts", "route", "routes", "api", "debug", "diagnostic", "diagnostics")) {
    helperFamilyNeedles.add("route_diagnostics_server_diagnostics");
    helperFamilyNeedles.add("route_boundary_auth_request_guard");
    optionalCommands.add("npm run test:contracts");
  }

  return {
    pathNeedles: Array.from(pathNeedles).sort(),
    helperFamilyNeedles: Array.from(helperFamilyNeedles).sort(),
    forbiddenPathNeedles: Array.from(forbiddenPathNeedles).sort(),
    requiredCommands: Array.from(requiredCommands).sort(),
    optionalCommands: Array.from(optionalCommands).sort(),
  } satisfies TaskSignals;
}

function scoreCandidate(input: {
  entry: RepoInventoryEntry;
  signalTokens: string[];
  mode: TaskMode;
  fileHints: string[];
  recentPasses: Array<{ title: string; touchedSurfaces: string[] }>;
  pitfalls: Array<{ title: string; affected_surfaces: string[]; description: string }>;
  helperEntries: Array<{ path: string; family: string; purpose: string }>;
  verificationCommands: Array<{ command: string; scopeType: string }>;
  graph: Map<string, { imports: Set<string>; importers: Set<string> }>;
  highInboundPaths: Set<string>;
  taskSignals: TaskSignals;
}) {
  const { entry, signalTokens, mode, fileHints, recentPasses, pitfalls, helperEntries, verificationCommands, graph, highInboundPaths, taskSignals } = input;
  const evidence: string[] = [];
  let score = 0;

  if (fileHints.includes(entry.path)) {
    score += 40;
    evidence.push("explicit_file_hint");
  }

  if (signalTokens.some((token) => entry.path.toLowerCase().includes(token) || entry.file_class.includes(token) || entry.surface_category.includes(token))) {
    score += 28;
    evidence.push("path_domain_match");
  }

  if (taskSignals.pathNeedles.some((needle) => entry.path.toLowerCase().includes(needle) || entry.surface_category.includes(needle) || entry.file_class.includes(needle))) {
    score += 30;
    evidence.push("task_signal_match");
  }

  if (taskSignals.forbiddenPathNeedles.some((needle) => entry.path.toLowerCase().includes(needle))) {
    score -= 45;
    evidence.push("forbidden_surface_penalty");
  }

  const fileName = entry.path.split("/").pop() ?? entry.path;
  if (signalTokens.some((token) => fileName.toLowerCase().includes(token))) {
    score += 22;
    evidence.push("filename_match");
  }

  if (helperEntries.some((helper) =>
    helper.path === entry.path
    || signalTokens.some((token) => helper.family.includes(token) || helper.purpose.toLowerCase().includes(token))
    || taskSignals.helperFamilyNeedles.some((needle) => helper.family.includes(needle) && helper.path === entry.path),
  )) {
    score += 18;
    evidence.push("canonical_helper_relevance");
  }

  if (fileHints.some((hint) => {
    const node = graph.get(hint);
    return node ? node.imports.has(entry.path) || node.importers.has(entry.path) : false;
  })) {
    score += 16;
    evidence.push("adjacency_match");
  }

  if (recentPasses.some((pass) =>
    pass.touchedSurfaces.includes(entry.path)
    || signalTokens.some((token) => pass.title.toLowerCase().includes(token) && pass.touchedSurfaces.includes(entry.path)),
  )) {
    score += 14;
    evidence.push("recent_pass_match");
  }

  if (pitfalls.some((pitfall) =>
    pitfall.affected_surfaces.some((surface) => entry.path === surface || entry.path.startsWith(surface.replace("/**", ""))),
  )) {
    score += 12;
    evidence.push("pitfall_match");
  }

  if (entry.runtime_critical && (mode === "runtime" || mode === "chat" || mode === "admin" || mode === "ai")) {
    score += 10;
    evidence.push("runtime_sensitivity");
  }

  if (verificationCommands.some((command) => signalTokens.some((token) => command.command.includes(token) || command.scopeType.includes(token)))) {
    score += 8;
    evidence.push("verification_lane_match");
  }

  if ((mode === "runtime" || mode === "ui") && (entry.evidence_only || entry.file_class.includes("workflow") || entry.file_class === "governance")) {
    score -= 15;
    evidence.push("workflow_or_evidence_penalty");
  }

  if ((mode !== "audit" && mode !== "governance") && entry.generated) {
    score -= 20;
    evidence.push("generated_penalty");
  }

  if (highInboundPaths.has(entry.path)) {
    score += 6;
    evidence.push("high_inbound_bonus");
  }

  return { path: entry.path, score, evidence, entry };
}

function broadSignoffRequired(mode: TaskMode, touchedFiles: Array<{ entry: RepoInventoryEntry }>) {
  if (mode === "audit" || mode === "governance") {
    return true;
  }

  if (mode === "dependency" && touchedFiles.some((entry) =>
    entry.entry.path === "package.json"
    || entry.entry.path === "functions/package.json"
    || entry.entry.path.endsWith("package-lock.json")
    || entry.entry.path.endsWith("pnpm-lock.yaml"),
  )) {
    return true;
  }

  return touchedFiles.some((entry) =>
    entry.entry.file_class === "repo_intelligence_tooling"
    || entry.entry.file_class === "repo_tooling"
    || entry.entry.file_class === "agent_docs"
    || entry.entry.file_class === "agent_index"
    || entry.entry.file_class === "agent_schema"
    || entry.entry.file_class === "agent_state"
    || entry.entry.file_class === "governance"
    || entry.entry.file_class === "workflow_guidance"
    || entry.entry.file_class === "workflow_tooling"
    || entry.entry.file_class === "root_config"
    || entry.entry.file_class === "functions_config",
  );
}

function classifyScope(mode: TaskMode, touchedFiles: Array<{ entry: RepoInventoryEntry }>, broadSignoff: boolean) {
  if (broadSignoff || mode === "audit" || mode === "governance" || touchedFiles.some((entry) => entry.entry.file_class.includes("repo") || entry.entry.file_class.includes("governance"))) {
    return {
      scope: "broad",
      why: "Touches repo-tooling, governance, or multiple broad-signoff surfaces.",
    };
  }

  if (touchedFiles.length >= 6 || touchedFiles.some((entry) => entry.entry.likely_shared_helper)) {
    return {
      scope: "moderate",
      why: "Touches several files or shared helper surfaces with non-trivial adjacency.",
    };
  }

  return {
    scope: "narrow",
    why: "Primary impact is limited to a small number of directly relevant surfaces.",
  };
}

function selectVerificationCommands(input: {
  mode: TaskMode;
  taskTokens: string[];
  taskSignals: TaskSignals;
  likelyTouchedFiles: Array<{ entry: RepoInventoryEntry; path: string }>;
  verificationCommands: Array<{ command: string; scopeType: string }>;
  broadSignoff: boolean;
  fileHints: string[];
}) {
  const { mode, taskTokens, taskSignals, likelyTouchedFiles, verificationCommands, broadSignoff, fileHints } = input;
  const available = new Set(verificationCommands.map((entry) => entry.command));
  const required = new Set<string>();
  const optional = new Set<string>();
  const paths = likelyTouchedFiles.map((entry) => entry.path);
  const touchesRouteOrRuntime = likelyTouchedFiles.some((entry) =>
    entry.entry.file_class === "app_route"
    || entry.entry.file_class === "server_helper"
    || entry.entry.file_class === "shared_helper"
    || entry.entry.path.startsWith("src/app/api/"),
  );
  const touchesUi = likelyTouchedFiles.some((entry) =>
    entry.entry.file_class === "app_surface"
    || entry.entry.file_class === "admin_surface"
    || entry.entry.file_class === "component"
    || entry.entry.path.includes("ui-chart-health"),
  );
  const touchesTelemetry = taskTokens.includes("telemetry") || taskTokens.includes("analytics") || paths.some((entry) => entry.includes("telemetry") || entry.includes("analytics"));
  const touchesFunctions = likelyTouchedFiles.some((entry) => entry.entry.functions_related) || mode === "functions";
  const touchesRepoTooling = likelyTouchedFiles.some((entry) => entry.entry.file_class.includes("repo") || entry.entry.file_class.startsWith("agent_") || entry.entry.file_class === "governance");

  const addRequired = (command: string) => {
    if (available.has(command)) required.add(command);
  };
  const addOptional = (command: string) => {
    if (available.has(command) && !required.has(command)) optional.add(command);
  };

  taskSignals.requiredCommands.forEach(addRequired);
  taskSignals.optionalCommands.forEach(addOptional);

  if (fileHints.length > 0 || broadSignoff) {
    addRequired("npm run trace:adjacent -- <path>");
  } else {
    addOptional("npm run trace:adjacent -- <path>");
  }

  if (touchesRouteOrRuntime || mode === "runtime" || mode === "chat" || mode === "admin" || mode === "ai" || mode === "creator") {
    addRequired("npm run test:contracts");
  }

  if (touchesUi || mode === "ui" || (mode === "admin" && (taskTokens.includes("ui") || taskTokens.includes("chart") || taskTokens.includes("health")))) {
    addRequired("npm run check:ui:audits");
  }

  if (taskTokens.includes("performance") || taskTokens.includes("loading") || taskTokens.includes("render") || taskTokens.includes("lighthouse")) {
    addRequired("npm run check:ui:lighthouse");
  }

  if (touchesTelemetry) {
    addRequired("npm run check:telemetry");
    addRequired("npm run check:analytics-semantics");
  }

  if (touchesFunctions || (mode === "dependency" && paths.some((entry) => entry.startsWith("functions/")))) {
    addRequired("npm --prefix functions run check");
  }

  if (broadSignoff || mode === "dependency" || touchesRepoTooling) {
    addRequired("npm run check:continuity");
    addRequired("npm run check:architecture");
  } else if (touchesRouteOrRuntime) {
    addOptional("npm run check:architecture");
  }

  if (touchesRepoTooling || mode === "audit" || mode === "governance") {
    addRequired("npm run check:inventory");
    addRequired("npm run check:agent-context");
  }

  return {
    required: Array.from(required),
    optional: Array.from(optional).slice(0, 10),
  };
}

function buildPrompt(name: "short" | "standard" | "deep", context: Record<string, unknown>) {
  const hot = (context.hotContextFiles as string[]) ?? [];
  const warm = (context.warmContextFiles as string[]) ?? [];
  const cold = (context.coldContextFiles as string[]) ?? [];
  const touched = name === "short"
    ? hot.slice(0, 6)
    : name === "standard"
      ? [...hot, ...warm].slice(0, 10)
      : [...hot, ...warm, ...cold].slice(0, 14);
  const helpers = (context.canonicalHelpersToReuse as string[]).slice(0, name === "short" ? 4 : 8);
  const pitfalls = (context.relevantKnownPitfalls as string[]).slice(0, name === "short" ? 4 : 8);
  const required = context.requiredVerificationCommands as string[];
  const optional = context.optionalVerificationCommands as string[];
  const fast = (context.fastVerificationCommands as string[]) ?? required;
  const signoff = (context.signoffVerificationCommands as string[]) ?? optional;
  const forbidden = ((context.forbiddenSurfaces as string[]) ?? []).slice(0, name === "short" ? 4 : 8);
  const lines = [
    `# ${name.toUpperCase()} Task Context`,
    ``,
    "## Goal",
    `${context.normalizedTaskSummary as string}`,
    ``,
    `Mode: ${context.taskModeClassification as string}`,
    `Scope: ${context.scopeClassification as string}`,
    `Why scope: ${context.scopeWhy as string}`,
    ``,
    `## Likely Entrypoints`,
    ...touched.map((entry) => `- ${entry}`),
    ``,
    `## Canonical Helpers To Reuse`,
    ...helpers.map((entry) => `- ${entry}`),
    ``,
    `## Acceptance Criteria`,
    "- Reuse the canonical helpers before introducing new ownership paths.",
    "- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.",
    "- Report any blocked or unverified lane explicitly instead of implying success.",
    "",
    "## Relevant Pitfalls",
    ...pitfalls.map((entry) => `- ${entry}`),
    ``,
    "## Forbidden Surfaces",
    ...(forbidden.length > 0 ? forbidden.map((entry) => `- ${entry}`) : ["- None pre-classified."]),
    "",
    "## Fast Verification",
    ...fast.map((entry) => `- ${entry}`),
  ];

  if (signoff.length > 0) {
    lines.push("", "## Signoff Verification", ...signoff.map((entry) => `- ${entry}`));
  }

  if (name !== "short" && required.length > 0 && optional.length > 0) {
    lines.push("", "## Compatibility Verification Fields", ...required.map((entry) => `- required: ${entry}`), ...optional.map((entry) => `- optional: ${entry}`));
  }

  if (name === "deep") {
    lines.push(
      "",
      "Do not read unless needed:",
      ...((context.do_not_read_unless_needed as string[]) ?? []).map((entry) => `- ${entry}`),
      "",
      "Do not touch without broad signoff:",
      ...((context.do_not_touch_without_broad_signoff as string[]) ?? []).map((entry) => `- ${entry}`),
    );
  }

  return `${lines.join("\n")}\n`;
}

export function buildTaskContext() {
  buildAgentIndexes();

  const { task, mode: rawMode, files: fileHints } = parseArgs();
  const mode = rawMode ?? inferMode(task);
  const taskTokens = tokenize(task).concat(fileHints.flatMap((entry) => tokenize(entry)));
  const signalTokens = taskTokens.filter((token) => !NOISE_TOKENS.has(token));
  const taskSignals = buildTaskSignals(mode, signalTokens, task);
  const repoInventory = readJsonFile<{ items: RepoInventoryEntry[] }>("agent/index/repo-inventory.json").items;
  const helperEntries = readJsonFile<{ entries: Array<{ path: string; family: string; purpose: string }> }>("agent/index/canonical-helpers.json").entries;
  const recentPasses = readJsonFile<{ passes: Array<{ title: string; touchedSurfaces: string[] }> }>("agent/index/recent-passes.json").passes;
  const pitfalls = readJsonFile<{ pitfalls: Array<{ stable_id: string; title: string; affected_surfaces: string[]; description: string; severity: string }> }>("agent/index/known-pitfalls.json").pitfalls;
  const governanceTruth = readJsonFile<{ files: Array<{ path: string; consultMode: string }> }>("agent/index/governance-truth.json").files;
  const verificationCommands = readJsonFile<{ commands: Array<{ command: string; scopeType: string; requiredWhen: string[] }> }>("agent/index/verification-commands.json").commands;
  const dependencySummary = readJsonFile<{ highInboundFiles: Array<{ path: string }> }>("agent/index/dependency-graph.summary.json");
  const uiCoverage = readJsonFile<{ surfaces: Array<{ route_or_component: string; audience: string[]; hydration_mode: string; criticality: string; runtime_dependencies: string[]; coverage_notes: string[] }> }>("agent/index/ui-surface-coverage.json").surfaces;
  const graph = buildLocalImportGraph();
  const entriesByPath = new Map(repoInventory.map((entry) => [entry.path, entry]));
  const highInboundPaths = new Set(dependencySummary.highInboundFiles.map((entry) => entry.path));

  const ranked = repoInventory
    .map((entry) => scoreCandidate({
      entry,
      signalTokens,
      mode,
      fileHints,
      recentPasses,
      pitfalls,
      helperEntries,
      verificationCommands,
      graph,
      highInboundPaths,
      taskSignals,
    }))
    .sort((left, right) =>
      Number(fileHints.includes(right.path)) - Number(fileHints.includes(left.path))
      || right.score - left.score
      || left.path.split("/").length - right.path.split("/").length
      || left.path.localeCompare(right.path));

  const likelyTouchedFiles = ranked.filter((entry) => entry.score > 0).slice(0, 12);
  const likelyAdjacentFiles = Array.from(
    new Set(
      likelyTouchedFiles.flatMap((entry) => {
        const node = graph.get(entry.path);
        return node ? [...node.imports, ...node.importers] : [];
      }),
    ),
  )
    .filter((entry) => !likelyTouchedFiles.some((candidate) => candidate.path === entry))
    .slice(0, 12);

  const likelyAdjacentHelpers = helperEntries
    .map((entry) => ({
      ...entry,
      score:
        (likelyTouchedFiles.some((candidate) => candidate.path === entry.path) ? 100 : 0)
        + (signalTokens.some((token) => entry.family.includes(token) || entry.purpose.toLowerCase().includes(token)) ? 18 : 0)
        + (taskSignals.helperFamilyNeedles.some((needle) => entry.family.includes(needle)) ? 20 : 0)
        + (likelyAdjacentFiles.includes(entry.path) ? 16 : 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, 8);
  const relevantUiSurfaces = uiCoverage
    .map((surface) => ({
      ...surface,
      score:
        (signalTokens.some((token) => surface.route_or_component.toLowerCase().includes(token)) ? 28 : 0)
        + (likelyTouchedFiles.some((entry) => entry.path === surface.route_or_component) ? 40 : 0)
        + (signalTokens.some((token) => surface.audience.includes(token)) ? 12 : 0)
        + ((mode === "ui" || mode === "admin" || mode === "creator") && surface.hydration_mode !== "static" ? 10 : 0),
    }))
    .filter((surface) => surface.score > 0)
    .sort((left, right) => right.score - left.score || left.route_or_component.localeCompare(right.route_or_component))
    .slice(0, 8);

  const relevantPitfalls = pitfalls.filter((pitfall) =>
    likelyTouchedFiles.some((entry) =>
      pitfall.affected_surfaces.some((surface) => entry.path === surface || entry.path.startsWith(surface.replace("/**", ""))),
    ) || signalTokens.some((token) => pitfall.title.includes(token) || pitfall.description.toLowerCase().includes(token)),
  );

  const broadSignoff = broadSignoffRequired(mode, likelyTouchedFiles);
  const scopeInfo = classifyScope(mode, likelyTouchedFiles, broadSignoff);
  const verificationPlan = selectVerificationPlan({ paths: likelyTouchedFiles.map((entry) => entry.path) });
  const hotContextFiles = likelyTouchedFiles.slice(0, 5).map((entry) => entry.path);
  const warmContextFiles = likelyTouchedFiles.slice(5, 10).map((entry) => entry.path);
  const coldContextFiles = compact([
    ...governanceTruth
      .filter((entry) => entry.consultMode !== "historical_only")
      .slice(0, mode === "audit" || broadSignoff ? 3 : 1)
      .map((entry) => entry.path),
    ...recentPasses
      .flatMap((entry) => entry.touchedSurfaces)
      .filter((entry, index, array) =>
        !hotContextFiles.includes(entry)
        && !warmContextFiles.includes(entry)
        && array.indexOf(entry) === index,
      )
      .slice(0, 4),
  ]);
  const verificationSelection = selectVerificationCommands({
    mode,
    taskTokens: signalTokens,
    taskSignals,
    likelyTouchedFiles,
    verificationCommands,
    broadSignoff,
    fileHints,
  });
  const payload = {
    ...createMetadata([
      "agent/index/repo-inventory.json",
      "agent/index/canonical-helpers.json",
      "agent/index/recent-passes.json",
      "agent/index/known-pitfalls.json",
      "agent/index/verification-commands.json",
      "agent/index/dependency-graph.summary.json",
      "agent/index/ui-surface-coverage.json",
    ]),
    stable_id: toStableId("taskctx", `${mode}:${task}`),
    input: { task, mode, fileHints, tokenBudgetProfile: "standard" },
    normalizedTaskSummary: task.trim().replace(/\s+/g, " "),
    taskModeClassification: mode,
    scopeClassification: scopeInfo.scope,
    scopeWhy: scopeInfo.why,
    likelySurfaceCategory: likelyTouchedFiles[0]?.entry.surface_category ?? "unknown",
    likelySurfaces: Array.from(new Set(likelyTouchedFiles.map((entry) => entry.entry.surface_category))).slice(0, 8),
    hotContextFiles,
    warmContextFiles,
    coldContextFiles,
    likelyTouchedFiles: likelyTouchedFiles.map((entry) => entry.path),
    likelyAdjacentFiles,
    likelyAdjacentHelpers: likelyAdjacentHelpers.map((entry) => entry.path),
    governanceConsultFull: governanceTruth.filter((entry) => entry.consultMode === "full").map((entry) => entry.path),
    governanceConsultSelective: governanceTruth.filter((entry) => entry.consultMode === "selective" || entry.consultMode === "historical_only").map((entry) => entry.path),
    canonicalHelpersToReuse: likelyAdjacentHelpers.map((entry) => entry.path),
    relevantKnownPitfalls: relevantPitfalls.map((entry) => entry.title),
    requiredVerificationCommands: Array.from(new Set(verificationSelection.required)),
    optionalVerificationCommands: Array.from(new Set(verificationSelection.optional)),
    fastVerificationCommands: Array.from(new Set(verificationPlan.fastCommands)),
    signoffVerificationCommands: Array.from(new Set(verificationPlan.signoffCommands)),
    verificationAdvisories: verificationPlan.signoffAdvisories,
    forbiddenSurfaces: verificationPlan.forbiddenSurfaces,
    cleanupExpectations: [
      "Remove non-committed generated artifacts such as output/dependency-graph.json if created only for local verification.",
      "Clean .next, playwright-report, test-results, lighthouse-results, build.log, and emulator logs before signoff.",
    ],
    broadSignoffAuditUpdateRequired: broadSignoff,
    broadWorkStartupProtocolRequired: broadSignoff || scopeInfo.scope === "broad",
    sqlMirrorFreshnessState: fileHints.some((entry) => entry.includes("dataconnect")) ? "required_but_unknown" : "unknown",
    confidenceNotes: [
      `Mode resolved as ${mode}.`,
      `Ranking considered ${repoInventory.length} repo files and ${helperEntries.length} canonical helper entries.`,
      relevantUiSurfaces.length > 0 ? `UI coverage matched ${relevantUiSurfaces.length} indexed surfaces.` : "No indexed UI surfaces matched the current task keywords.",
    ],
    ambiguityNotes: compact([
      likelyTouchedFiles.length === 0 ? "No file scored above zero; task wording may be too broad." : null,
      fileHints.length === 0 ? "No explicit file hints were provided, so ranking depended on task keywords and repo history." : null,
      mode === "ui" && relevantUiSurfaces.length === 0 ? "UI mode resolved without any indexed UI surface match." : null,
    ]),
    do_not_read_unless_needed: governanceTruth.filter((entry) => entry.consultMode === "historical_only").map((entry) => entry.path),
    excludedContext: ranked
      .filter((entry) => entry.score <= 0 || entry.entry.evidence_only || entry.entry.generated)
      .slice(0, 10)
      .map((entry) => ({
        path: entry.path,
        why_not_selected: entry.entry.evidence_only
          ? "evidence_only"
          : entry.entry.generated
            ? "generated_penalty"
            : "non_matching_or_low_signal",
      })),
    do_not_touch_without_broad_signoff: likelyTouchedFiles.filter((entry) => entry.entry.likely_broad_signoff_relevant).map((entry) => entry.path).slice(0, 12),
    rankingEvidence: likelyTouchedFiles.map((entry) => ({
      stable_id: entry.entry.stable_id,
      path: entry.path,
      score: entry.score,
      why_selected: entry.evidence.join(", "),
      weighted_components: entry.evidence,
      freshness_state: "fresh",
    })),
    relevantUiSurfaces: relevantUiSurfaces.map((surface) => ({
      route_or_component: surface.route_or_component,
      criticality: surface.criticality,
      hydration_mode: surface.hydration_mode,
      coverage_notes: surface.coverage_notes,
    })),
  };

  writeJsonFile("agent/state/task-context.generated.json", payload);
  validateWithSchema("agent/schemas/task-context.schema.json", payload);
  writeTextFile("agent/prompts/task-prompt.short.md", buildPrompt("short", payload));
  writeTextFile("agent/prompts/task-prompt.standard.md", buildPrompt("standard", payload));
  writeTextFile("agent/prompts/task-prompt.deep.md", buildPrompt("deep", payload));
  return payload;
}

if (require.main === module) {
  buildTaskContext();
  console.log("Task context generated at agent/state/task-context.generated.json");
}
