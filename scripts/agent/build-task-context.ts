import { buildAgentIndexes } from "./build-agent-indexes";
import type { RepoInventoryEntry } from "./classify-repo-files";
import { buildLocalImportGraph } from "./summarize-dependency-graph";
import { compact, createMetadata, readJsonFile, toStableId, tokenize, validateWithSchema, writeJsonFile, writeTextFile } from "./shared";

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

function scoreCandidate(input: {
  entry: RepoInventoryEntry;
  taskTokens: string[];
  mode: TaskMode;
  fileHints: string[];
  recentPasses: Array<{ title: string; touchedSurfaces: string[] }>;
  pitfalls: Array<{ title: string; affected_surfaces: string[]; description: string }>;
  helperEntries: Array<{ path: string; family: string; purpose: string }>;
  verificationCommands: Array<{ command: string; scopeType: string }>;
  graph: Map<string, { imports: Set<string>; importers: Set<string> }>;
  highInboundPaths: Set<string>;
}) {
  const { entry, taskTokens, mode, fileHints, recentPasses, pitfalls, helperEntries, verificationCommands, graph, highInboundPaths } = input;
  const evidence: string[] = [];
  let score = 0;

  if (fileHints.includes(entry.path)) {
    score += 40;
    evidence.push("explicit_file_hint");
  }

  if (taskTokens.some((token) => entry.path.toLowerCase().includes(token) || entry.file_class.includes(token) || entry.surface_category.includes(token))) {
    score += 28;
    evidence.push("path_domain_match");
  }

  const fileName = entry.path.split("/").pop() ?? entry.path;
  if (taskTokens.some((token) => fileName.toLowerCase().includes(token))) {
    score += 22;
    evidence.push("filename_match");
  }

  if (helperEntries.some((helper) => helper.path === entry.path || taskTokens.some((token) => helper.family.includes(token) || helper.purpose.toLowerCase().includes(token)))) {
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
    || taskTokens.some((token) => pass.title.toLowerCase().includes(token) && pass.touchedSurfaces.includes(entry.path)),
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

  if (verificationCommands.some((command) => taskTokens.some((token) => command.command.includes(token) || command.scopeType.includes(token)))) {
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

function broadSignoffRequired(paths: string[], entriesByPath: Map<string, RepoInventoryEntry>) {
  const broadPaths = paths.filter((candidate) => entriesByPath.get(candidate)?.likely_broad_signoff_relevant);
  const domainCount = new Set(broadPaths.map((candidate) => entriesByPath.get(candidate)?.file_class)).size;
  return broadPaths.length > 0 && domainCount > 1;
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

function buildPrompt(name: "short" | "standard" | "deep", context: Record<string, unknown>) {
  const touched = (context.likelyTouchedFiles as string[]).slice(0, name === "short" ? 6 : name === "standard" ? 10 : 14);
  const helpers = (context.canonicalHelpersToReuse as string[]).slice(0, name === "short" ? 4 : 8);
  const pitfalls = (context.relevantKnownPitfalls as string[]).slice(0, name === "short" ? 4 : 8);
  const required = context.requiredVerificationCommands as string[];
  const optional = context.optionalVerificationCommands as string[];
  const lines = [
    `# ${name.toUpperCase()} Task Context`,
    ``,
    `Task: ${context.normalizedTaskSummary as string}`,
    `Mode: ${context.taskModeClassification as string}`,
    `Scope: ${context.scopeClassification as string}`,
    `Why scope: ${context.scopeWhy as string}`,
    ``,
    `Likely touched files:`,
    ...touched.map((entry) => `- ${entry}`),
    ``,
    `Canonical helpers to reuse:`,
    ...helpers.map((entry) => `- ${entry}`),
    ``,
    `Relevant pitfalls:`,
    ...pitfalls.map((entry) => `- ${entry}`),
    ``,
    `Required verification:`,
    ...required.map((entry) => `- ${entry}`),
  ];

  if (name !== "short" && optional.length > 0) {
    lines.push("", "Optional verification:", ...optional.map((entry) => `- ${entry}`));
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
  const repoInventory = readJsonFile<{ items: RepoInventoryEntry[] }>("agent/index/repo-inventory.json").items;
  const helperEntries = readJsonFile<{ entries: Array<{ path: string; family: string; purpose: string }> }>("agent/index/canonical-helpers.json").entries;
  const recentPasses = readJsonFile<{ passes: Array<{ title: string; touchedSurfaces: string[] }> }>("agent/index/recent-passes.json").passes;
  const pitfalls = readJsonFile<{ pitfalls: Array<{ stable_id: string; title: string; affected_surfaces: string[]; description: string; severity: string }> }>("agent/index/known-pitfalls.json").pitfalls;
  const governanceTruth = readJsonFile<{ files: Array<{ path: string; consultMode: string }> }>("agent/index/governance-truth.json").files;
  const verificationCommands = readJsonFile<{ commands: Array<{ command: string; scopeType: string; requiredWhen: string[] }> }>("agent/index/verification-commands.json").commands;
  const dependencySummary = readJsonFile<{ highInboundFiles: Array<{ path: string }> }>("agent/index/dependency-graph.summary.json");
  const graph = buildLocalImportGraph();
  const entriesByPath = new Map(repoInventory.map((entry) => [entry.path, entry]));
  const highInboundPaths = new Set(dependencySummary.highInboundFiles.map((entry) => entry.path));

  const ranked = repoInventory
    .map((entry) => scoreCandidate({
      entry,
      taskTokens,
      mode,
      fileHints,
      recentPasses,
      pitfalls,
      helperEntries,
      verificationCommands,
      graph,
      highInboundPaths,
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
        + (taskTokens.some((token) => entry.family.includes(token) || entry.purpose.toLowerCase().includes(token)) ? 18 : 0)
        + (likelyAdjacentFiles.includes(entry.path) ? 16 : 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, 8);

  const relevantPitfalls = pitfalls.filter((pitfall) =>
    likelyTouchedFiles.some((entry) =>
      pitfall.affected_surfaces.some((surface) => entry.path === surface || entry.path.startsWith(surface.replace("/**", ""))),
    ) || taskTokens.some((token) => pitfall.title.includes(token) || pitfall.description.toLowerCase().includes(token)),
  );

  const requiredVerificationCommands = verificationCommands
    .filter((command) =>
      command.requiredWhen.length > 0
      && (
        likelyTouchedFiles.some((entry) => command.scopeType === "repo_tooling" && entry.entry.likely_broad_signoff_relevant)
        || taskTokens.some((token) => command.command.includes(token) || command.scopeType.includes(token))
        || command.command === "npm run check:continuity"
      ),
    )
    .map((entry) => entry.command);

  const optionalVerificationCommands = verificationCommands
    .filter((command) => !requiredVerificationCommands.includes(command.command))
    .filter((command) =>
      taskTokens.some((token) => command.command.includes(token) || command.scopeType.includes(token))
      || likelyTouchedFiles.some((entry) => command.scopeType === "tests" && entry.entry.runtime_critical),
    )
    .map((entry) => entry.command)
    .slice(0, 10);

  const broadSignoff = broadSignoffRequired(likelyTouchedFiles.map((entry) => entry.path), entriesByPath);
  const scopeInfo = classifyScope(mode, likelyTouchedFiles, broadSignoff);
  const payload = {
    ...createMetadata([
      "agent/index/repo-inventory.json",
      "agent/index/canonical-helpers.json",
      "agent/index/recent-passes.json",
      "agent/index/known-pitfalls.json",
      "agent/index/verification-commands.json",
      "agent/index/dependency-graph.summary.json",
    ]),
    stable_id: toStableId("taskctx", `${mode}:${task}`),
    input: { task, mode, fileHints, tokenBudgetProfile: "standard" },
    normalizedTaskSummary: task.trim().replace(/\s+/g, " "),
    taskModeClassification: mode,
    scopeClassification: scopeInfo.scope,
    scopeWhy: scopeInfo.why,
    likelySurfaceCategory: likelyTouchedFiles[0]?.entry.surface_category ?? "unknown",
    likelySurfaces: Array.from(new Set(likelyTouchedFiles.map((entry) => entry.entry.surface_category))).slice(0, 8),
    likelyTouchedFiles: likelyTouchedFiles.map((entry) => entry.path),
    likelyAdjacentFiles,
    likelyAdjacentHelpers: likelyAdjacentHelpers.map((entry) => entry.path),
    governanceConsultFull: governanceTruth.filter((entry) => entry.consultMode === "full").map((entry) => entry.path),
    governanceConsultSelective: governanceTruth.filter((entry) => entry.consultMode === "selective" || entry.consultMode === "historical_only").map((entry) => entry.path),
    canonicalHelpersToReuse: likelyAdjacentHelpers.map((entry) => entry.path),
    relevantKnownPitfalls: relevantPitfalls.map((entry) => entry.title),
    requiredVerificationCommands: Array.from(new Set(requiredVerificationCommands)),
    optionalVerificationCommands: Array.from(new Set(optionalVerificationCommands)),
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
    ],
    ambiguityNotes: compact([
      likelyTouchedFiles.length === 0 ? "No file scored above zero; task wording may be too broad." : null,
      fileHints.length === 0 ? "No explicit file hints were provided, so ranking depended on task keywords and repo history." : null,
    ]),
    do_not_read_unless_needed: governanceTruth.filter((entry) => entry.consultMode === "historical_only").map((entry) => entry.path),
    do_not_touch_without_broad_signoff: likelyTouchedFiles.filter((entry) => entry.entry.likely_broad_signoff_relevant).map((entry) => entry.path).slice(0, 12),
    rankingEvidence: likelyTouchedFiles.map((entry) => ({
      stable_id: entry.entry.stable_id,
      path: entry.path,
      score: entry.score,
      why_selected: entry.evidence.join(", "),
      weighted_components: entry.evidence,
      freshness_state: "fresh",
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
