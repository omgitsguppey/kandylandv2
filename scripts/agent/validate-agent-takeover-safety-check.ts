import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { validateBloatGuard, type BloatGuardConfig } from "../../src/lib/agent-governance/addition-bloat-guard";
import { ANTIGRAVITY_CAPABILITY_POLICY, validatePolicy } from "../../src/lib/agent-governance/antigravity-capability-policy";
import { buildGeneratedReportCompleteness, deriveGeneratedReportFreshness, isGeneratedReportPath } from "../../src/lib/agent-governance/generated-reports/generated-report-contract";
import { selectAllowedTaskFiles } from "./build-task-context";

export const TAKEOVER_REPORT_PATH = "agent/state/agent-takeover-safety-check.generated.json";
export const RETIRED_TAKEOVER_SNAPSHOTS = [
  "agent/state/antigravity-agent-self-knowledge.generated.json",
  "agent/state/addition-bloat-guard.generated.json",
  "agent/state/antigravity-output-audit.generated.json",
] as const;
export type TakeoverCheck = "safety" | "knowledge" | "bloat" | "output" | "all";
type SourceEntry = { path: string; hash: string | null };
type SourceState = { currentHead: string; entries: SourceEntry[]; sourceFingerprint: string; dirtyStatus: string[] };

export type BinaryAssetAddition = {
  file: string;
  mediaType: "image/png";
  sha256: string;
  maxBytes: number;
  justification: string;
};

type MeasuredBinaryAssetAddition = BinaryAssetAddition & { bytes: number };

export type TakeoverTaskInput = {
  taskKey: string;
  activePromptLane: string;
  goal: string;
  authority: string;
  allowedFiles: string[];
  forbiddenFiles: string[];
  inFlightLanes: string[];
  unknowns: string[];
  memoryWriteback: { required: boolean; evidencePath: string; reason: string };
  releaseNoteImpact: string;
  justificationForNetAdditions: string;
  authorityFiles: string[];
  binaryAssetAdditions?: BinaryAssetAddition[];
};
type Baseline = SourceState & {
  schemaVersion: 1;
  capturedAtUtc: string;
  inputHash: string;
  authorityHashes: SourceEntry[];
};
export type TakeoverEvidenceReport = {
  schemaVersion: 2;
  taskKey: string;
  generatedAtUtc: string;
  currentHead: string;
  sourceCommit: string;
  sourceFingerprint: string;
  inputHash: string;
  takeoverStatus: "verified_safe";
  evidenceScope: "local_task_source_and_review_declarations";
  knowledge: {
    dirtySourceFileCount: number;
    inheritedDirtySourceFileCount: number;
    unknowns: string[];
    betaDiagnosticScore: { status: string; value: number | null };
    openPrStatus: { status: "not_requested"; count: null; reason: string };
    releaseReadiness: "not_assessed";
  };
  output: { changedFiles: string[]; preservedInheritedWork: boolean };
  bloat: BloatGuardConfig & { measurementScope: string; binaryAssetAdditions?: MeasuredBinaryAssetAddition[]; binaryBytesAdded?: number };
};

const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
const git = (root: string, args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", shell: false }).trimEnd();
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const stringList = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string" && entry.trim());
const relativeSourcePath = (value: string) => !path.isAbsolute(value) && !value.split(/[\\/]/u).includes("..") && value.length > 0;

export function decodeTakeoverTaskInput(value: unknown): TakeoverTaskInput {
  if (!isRecord(value) || typeof value.taskKey !== "string" || !/^[a-z0-9][a-z0-9-]{1,80}$/u.test(value.taskKey)) throw new Error("Task input needs a bounded taskKey.");
  for (const key of ["activePromptLane", "goal", "authority", "releaseNoteImpact", "justificationForNetAdditions"] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) throw new Error(`Task input needs ${key}.`);
  }
  for (const key of ["allowedFiles", "forbiddenFiles", "inFlightLanes", "unknowns", "authorityFiles"] as const) {
    if (!stringList(value[key])) throw new Error(`Task input needs nonempty ${key}.`);
  }
  const allowedFiles = value.allowedFiles as string[];
  if (!allowedFiles.every(relativeSourcePath)) throw new Error("Allowed files must be repository paths without traversal.");
  if (selectAllowedTaskFiles(allowedFiles, value.forbiddenFiles as string[], Infinity).length !== new Set(allowedFiles).size) throw new Error("Task input contains an Allowed/Forbidden overlap.");
  if (!isRecord(value.memoryWriteback) || typeof value.memoryWriteback.required !== "boolean" || typeof value.memoryWriteback.evidencePath !== "string" || !relativeSourcePath(value.memoryWriteback.evidencePath) || typeof value.memoryWriteback.reason !== "string" || !value.memoryWriteback.reason.trim()) throw new Error("Memory disposition needs a repository owner and reason.");
  if (value.binaryAssetAdditions !== undefined) {
    if (!Array.isArray(value.binaryAssetAdditions) || value.binaryAssetAdditions.length === 0) throw new Error("Binary additions need a nonempty reviewed classification.");
    const seen = new Set<string>();
    for (const asset of value.binaryAssetAdditions) {
      if (!isRecord(asset) || typeof asset.file !== "string" || !relativeSourcePath(asset.file)
        || !/^public\/.+\.png$/u.test(asset.file) || !allowedFiles.includes(asset.file) || seen.has(asset.file)
        || asset.mediaType !== "image/png" || typeof asset.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(asset.sha256)
        || typeof asset.maxBytes !== "number" || !Number.isSafeInteger(asset.maxBytes) || asset.maxBytes < 8
        || typeof asset.justification !== "string" || !asset.justification.trim()) throw new Error("Binary addition needs one exact allowed public PNG, hash, byte ceiling and reason.");
      seen.add(asset.file);
    }
  }
  return value as TakeoverTaskInput;
}

function evidenceDirectory(root: string, taskKey: string) {
  if (!/^[a-z0-9][a-z0-9-]{1,80}$/u.test(taskKey)) throw new Error("Invalid taskKey.");
  return path.join(root, "output", taskKey);
}

function loadInput(root: string, inputPath: string) {
  const absolutePath = path.resolve(root, inputPath);
  const input = decodeTakeoverTaskInput(readJson(absolutePath));
  if (absolutePath !== path.join(evidenceDirectory(root, input.taskKey), "input.json")) throw new Error("Task input must use its owned output/<taskKey>/input.json path.");
  return { input, inputHash: hash(readFileSync(absolutePath)) };
}

export function captureTakeoverSourceState(root = process.cwd()): SourceState {
  const currentHead = git(root, ["rev-parse", "--verify", "HEAD"]);
  const files = Array.from(new Set(git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean))).sort();
  const entries = files.filter((file) => !isGeneratedReportPath(file)).map((file) => ({ path: file, hash: existsSync(path.join(root, file)) ? hash(readFileSync(path.join(root, file))) : null }));
  return { currentHead, entries, sourceFingerprint: hash(JSON.stringify(entries)), dirtyStatus: git(root, ["status", "--porcelain=v1", "--untracked-files=all", "-z"]).split("\0").filter(Boolean) };
}

function changedSourceFiles(baseline: SourceState, current: SourceState) {
  const before = new Map(baseline.entries.map((entry) => [entry.path, entry.hash]));
  const after = new Map(current.entries.map((entry) => [entry.path, entry.hash]));
  return Array.from(new Set([...before.keys(), ...after.keys()])).filter((file) => before.get(file) !== after.get(file)).sort();
}

function dirtySourceCount(status: string[]) {
  // The one bootstrap receipt used trim(); retain its first single-status record.
  return status.filter((record) => {
    const file = /^[ MADRCU?!]{2} /u.test(record) ? record.slice(3) : /^[MADRCU?!] /u.test(record) ? record.slice(2) : null;
    return file !== null && !isGeneratedReportPath(file);
  }).length;
}

function authorityHashes(root: string, input: TakeoverTaskInput) {
  return input.authorityFiles.map((file) => ({ path: file, hash: hash(readFileSync(path.resolve(root, file))) }));
}

export function startTakeoverEvidence(inputPath: string, root = process.cwd()) {
  const { input, inputHash } = loadInput(root, inputPath);
  const directory = evidenceDirectory(root, input.taskKey);
  const baselinePath = path.join(directory, "baseline.json");
  if (existsSync(baselinePath)) throw new Error("Baseline already exists; it cannot be overwritten to reclassify inherited work.");
  const baseline: Baseline = { schemaVersion: 1, capturedAtUtc: new Date().toISOString(), inputHash, ...captureTakeoverSourceState(root), authorityHashes: authorityHashes(root, input) };
  for (const file of input.allowedFiles) {
    const original = path.join(root, file);
    if (!existsSync(original)) continue;
    const copy = path.join(directory, "before", `${file}.source`);
    mkdirSync(path.dirname(copy), { recursive: true });
    copyFileSync(original, copy);
  }
  writeFileSync(path.join(directory, "empty"), "");
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n");
  return baseline;
}

function loadBaseline(root: string, input: TakeoverTaskInput, inputHash: string): Baseline {
  const value = readJson(path.join(evidenceDirectory(root, input.taskKey), "baseline.json"));
  if (!isRecord(value) || value.schemaVersion !== 1 || value.inputHash !== inputHash || !Array.isArray(value.entries) || !Array.isArray(value.authorityHashes) || !Array.isArray(value.dirtyStatus) || typeof value.currentHead !== "string" || typeof value.sourceFingerprint !== "string") throw new Error("Baseline is missing, malformed, or the declared task input changed.");
  const baseline = value as Baseline;
  if (!baseline.entries.every((entry) => relativeSourcePath(entry.path) && (entry.hash === null || /^[a-f0-9]{64}$/u.test(entry.hash)))) throw new Error("Baseline source entries are malformed.");
  if (hash(JSON.stringify(baseline.entries)) !== baseline.sourceFingerprint) throw new Error("Baseline source fingerprint is invalid.");
  if (JSON.stringify(baseline.authorityHashes) !== JSON.stringify(authorityHashes(root, input))) throw new Error("Authority changed after the baseline; review and start a new authorized task.");
  for (const file of input.allowedFiles) {
    const expectedHash = baseline.entries.find((entry) => entry.path === file)?.hash;
    if (!expectedHash) continue;
    const copy = path.join(evidenceDirectory(root, input.taskKey), "before", `${file}.source`);
    if (!existsSync(copy) || hash(readFileSync(copy)) !== expectedHash) throw new Error(`Retained baseline bytes are missing or changed: ${file}`);
  }
  return baseline;
}

function measureSourceChanges(root: string, input: TakeoverTaskInput, changedFiles: string[]) {
  const directory = evidenceDirectory(root, input.taskKey);
  let netAdditions = 0;
  let netDeletions = 0;
  const binaryAssetAdditions: MeasuredBinaryAssetAddition[] = [];
  for (const file of changedFiles) {
    const before = path.join(directory, "before", `${file}.source`);
    const after = path.join(root, file);
    const diff = spawnSync("git", ["diff", "--no-index", "--numstat", "--", existsSync(before) ? before : path.join(directory, "empty"), existsSync(after) ? after : path.join(directory, "empty")], { cwd: root, encoding: "utf8", shell: false });
    if (diff.error || (diff.status !== 0 && diff.status !== 1)) throw new Error(`Cannot measure ${file}: ${diff.error?.message ?? diff.stderr}`);
    for (const line of diff.stdout.trim().split(/\r?\n/u).filter(Boolean)) {
      const [added, deleted] = line.split("\t");
      if (added === "-" && deleted === "-") {
        const asset = input.binaryAssetAdditions?.find(entry => entry.file === file);
        if (!asset) throw new Error(`Binary change ${file} needs a separate budget classification.`);
        if (existsSync(before) || !existsSync(after)) throw new Error(`Binary classification permits a create-only PNG addition: ${file}`);
        const bytes = readFileSync(after);
        if (bytes.length > asset.maxBytes || hash(bytes) !== asset.sha256
          || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`Binary PNG bytes, hash or byte ceiling disagree: ${file}`);
        binaryAssetAdditions.push({ ...asset, bytes: bytes.length });
        continue;
      }
      if (!/^\d+$/u.test(added) || !/^\d+$/u.test(deleted)) throw new Error(`Unsupported source numstat: ${file}`);
      if (input.binaryAssetAdditions?.some(asset => asset.file === file)) throw new Error(`Binary classification cannot exclude a text change: ${file}`);
      netAdditions += Number(added);
      netDeletions += Number(deleted);
    }
  }
  return { netAdditions, netDeletions, binaryAssetAdditions, binaryBytesAdded: binaryAssetAdditions.reduce((sum, asset) => sum + asset.bytes, 0) };
}

function readBetaDiagnosticScore(root: string, currentHead: string, nowMs: number) {
  const file = path.join(root, "agent/state/public-beta-score.generated.json");
  if (!existsSync(file)) return { status: "missing", value: null };
  const data = readJson(file);
  if (!isRecord(data)) return { status: "unknown", value: null };
  const recordedHead = typeof data.currentHead === "string" ? data.currentHead : typeof data.sourceCommit === "string" ? data.sourceCommit : null;
  const generatedAt = typeof data.generatedAtUtc === "string" ? data.generatedAtUtc : null;
  const status = !recordedHead || (generatedAt && Date.parse(generatedAt) > nowMs) ? "unknown" : deriveGeneratedReportFreshness({ generatedAt, sourceCommit: recordedHead, currentHead, nowMs });
  const value = typeof data.overallScore === "number" && Number.isFinite(data.overallScore) ? data.overallScore : null;
  return { status, value: status === "fresh" ? value : null };
}

export function validateOutputAuditScope(changedFiles: string[], input: TakeoverTaskInput) {
  const permitted = new Set(selectAllowedTaskFiles(input.allowedFiles, input.forbiddenFiles, Infinity));
  return changedFiles.filter((file) => !permitted.has(file)).map((file) => `Output scope violation: ${file} changed outside the declared allowed/forbidden contract.`);
}

/** Explicit adapter for source validators; standalone incident guards keep their whole-tree view. */
export function readValidatorMutationScope(root = process.cwd(), args: readonly string[] = process.argv.slice(2)) {
  const inline = args.filter((arg) => arg.startsWith("--task-input="));
  const indexes = args.flatMap((arg, index) => arg === "--task-input" ? [index] : []);
  if (inline.length + indexes.length === 0) return null;
  if (inline.length + indexes.length !== 1) throw new Error("Exactly one --task-input is required.");
  const inputPath = inline[0]?.slice("--task-input=".length) ?? args[indexes[0] + 1];
  if (!inputPath || inputPath.startsWith("--")) throw new Error("--task-input needs its immutable input path.");
  const { input, inputHash } = loadInput(root, inputPath);
  const baseline = loadBaseline(root, input, inputHash);
  const current = captureTakeoverSourceState(root);
  if (baseline.currentHead !== current.currentHead) throw new Error("Validator task baseline does not match current Git HEAD.");
  const changedFiles = changedSourceFiles(baseline, current);
  const failures = validateOutputAuditScope(changedFiles, input);
  if (failures.length) throw new Error(failures.join("\n"));
  return {
    owner: "scripts/agent/validate-agent-takeover-safety-check.ts",
    mode: "input_bound_task" as const,
    taskKey: input.taskKey,
    inputHash,
    currentHead: current.currentHead,
    sourceFingerprint: current.sourceFingerprint,
    changedFiles,
    inheritedDirtySourceFileCount: dirtySourceCount(baseline.dirtyStatus),
    evidenceBoundary: "authorized_task_mutations_only; inherited bytes are baseline evidence, not behavior or formal proof",
  };
}

export function listValidatorScopeFiles(root = process.cwd(), args: readonly string[] = process.argv.slice(2)) {
  // A validated task delegates mutation safety to the canonical exact allowlist.
  // Empty here means no mutations remain for the legacy incident classifier;
  // the emitted mutationScope retains every actual task change and its fingerprint.
  if (readValidatorMutationScope(root, args)) return [];
  const files = new Set<string>();
  for (const flags of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]]) {
    for (const file of git(root, flags).split(/\r?\n/u).filter(Boolean)) files.add(file.replace(/\\/gu, "/"));
  }
  return [...files].sort();
}

export function withValidatorMutationScope<T>(report: T) {
  return { ...report, mutationScope: readValidatorMutationScope() ?? { mode: "whole_git_worktree" as const } };
}

export function validateTakeoverEvidence(report: TakeoverEvidenceReport, input: TakeoverTaskInput, baseline: Baseline, current: SourceState, check: TakeoverCheck = "all", nowMs = Date.now(), root = process.cwd()) {
  const failures: string[] = [];
  if (report.schemaVersion !== 2) return ["Historical takeover schema is not current task evidence; use --start and --record."];
  if (report.currentHead !== current.currentHead || baseline.currentHead !== current.currentHead) failures.push("Takeover evidence does not match current Git HEAD.");
  if (report.sourceFingerprint !== current.sourceFingerprint) failures.push("Takeover evidence does not match the current working tree.");
  if (report.inputHash !== baseline.inputHash || report.taskKey !== input.taskKey) failures.push("Takeover evidence does not match the immutable task input.");
  if (deriveGeneratedReportFreshness({ generatedAt: report.generatedAtUtc, sourceCommit: report.currentHead, currentHead: current.currentHead, nowMs }) !== "fresh" || Date.parse(report.generatedAtUtc) > nowMs) failures.push("Takeover evidence is stale, future-dated, or missing its generation time.");
  const changedFiles = changedSourceFiles(baseline, current);
  failures.push(...validateOutputAuditScope(changedFiles, input));
  if (JSON.stringify(report.output.changedFiles) !== JSON.stringify(changedFiles)) failures.push("Output changed-file evidence differs from the current baseline comparison.");
  if (report.output.preservedInheritedWork !== true || report.takeoverStatus !== "verified_safe" || report.evidenceScope !== "local_task_source_and_review_declarations") failures.push("Takeover safety scope or inherited-work classification is invalid.");
  if (check === "safety" || check === "all") {
    failures.push(...validatePolicy(ANTIGRAVITY_CAPABILITY_POLICY));
    if (input.inFlightLanes.length !== 1) failures.push("This takeover route requires one declared sole-agent lane.");
    if (input.memoryWriteback.required && (!changedFiles.includes(input.memoryWriteback.evidencePath) || !existsSync(path.join(root, input.memoryWriteback.evidencePath)))) failures.push("Required memory writeback has no changed durable-owner evidence.");
  }
  if (check === "knowledge" || check === "all") {
    if (JSON.stringify(report.knowledge.unknowns) !== JSON.stringify(input.unknowns) || report.knowledge.unknowns.length === 0) failures.push("Knowledge unknowns do not match the declared task.");
    if (report.knowledge.dirtySourceFileCount !== dirtySourceCount(current.dirtyStatus) || report.knowledge.inheritedDirtySourceFileCount !== dirtySourceCount(baseline.dirtyStatus)) failures.push("Knowledge dirty-source counts are not current Git observations.");
    if (JSON.stringify(report.knowledge.betaDiagnosticScore) !== JSON.stringify(readBetaDiagnosticScore(root, current.currentHead, nowMs))) failures.push("Knowledge beta diagnostic-score freshness/value is not current evidence.");
    if (report.knowledge.openPrStatus.status !== "not_requested" || report.knowledge.openPrStatus.count !== null || !report.knowledge.openPrStatus.reason || report.knowledge.releaseReadiness !== "not_assessed") failures.push("Unobserved PR/release evidence must remain explicit.");
  }
  if (check === "bloat" || check === "all") {
    if (failures.some((failure) => failure.startsWith("Output scope violation"))) return failures;
    const measured = measureSourceChanges(root, input, changedFiles);
    if (report.bloat.netAdditions !== measured.netAdditions || report.bloat.netDeletions !== measured.netDeletions) failures.push("Bloat counts differ from the retained source baseline.");
    if (JSON.stringify(report.bloat.binaryAssetAdditions ?? []) !== JSON.stringify(measured.binaryAssetAdditions) || (report.bloat.binaryBytesAdded ?? 0) !== measured.binaryBytesAdded) failures.push("Binary asset budget differs from the current exact bytes and immutable classification.");
    failures.push(...validateBloatGuard(report.bloat));
  }
  return failures;
}

export function recordTakeoverEvidence(inputPath: string, root = process.cwd(), nowMs = Date.now()) {
  const duplicates = RETIRED_TAKEOVER_SNAPSHOTS.filter((file) => existsSync(path.join(root, file)));
  if (duplicates.length) throw new Error(`Retired takeover projections are still active: ${duplicates.join(", ")}`);
  const { input, inputHash } = loadInput(root, inputPath);
  const baseline = loadBaseline(root, input, inputHash);
  const current = captureTakeoverSourceState(root);
  const changedFiles = changedSourceFiles(baseline, current);
  const scopeFailures = validateOutputAuditScope(changedFiles, input);
  if (scopeFailures.length) throw new Error(scopeFailures.join("\n"));
  const createdFiles = changedFiles.filter((file) => !baseline.entries.some((entry) => entry.path === file && entry.hash !== null));
  const report: TakeoverEvidenceReport = {
    schemaVersion: 2, taskKey: input.taskKey, generatedAtUtc: new Date(nowMs).toISOString(), currentHead: current.currentHead, sourceCommit: current.currentHead, sourceFingerprint: current.sourceFingerprint, inputHash,
    takeoverStatus: "verified_safe", evidenceScope: "local_task_source_and_review_declarations",
    knowledge: { dirtySourceFileCount: dirtySourceCount(current.dirtyStatus), inheritedDirtySourceFileCount: dirtySourceCount(baseline.dirtyStatus), unknowns: input.unknowns, betaDiagnosticScore: readBetaDiagnosticScore(root, current.currentHead, nowMs), openPrStatus: { status: "not_requested", count: null, reason: "No PR operation is in this local task; no remote count is claimed." }, releaseReadiness: "not_assessed" },
    output: { changedFiles, preservedInheritedWork: true },
    bloat: { ...measureSourceChanges(root, input, changedFiles), measurementScope: "declared_non_generated_source_paths_against_retained_baseline", justificationForNetAdditions: input.justificationForNetAdditions, isGutConsolidationTask: false,
      newResolversCreated: createdFiles.filter((file) => /(?:resolver|registry|service).*\.[cm]?[jt]sx?$/iu.test(file)),
      newValidatorsCreated: createdFiles.filter((file) => /(?:^|\/)(?:check|validate)-.*\.ts$/u.test(file)).map((name) => ({ name, owner: "", packageScript: "", hasUnitTest: false, hasRetirementRule: false })),
      newMemoryRules: input.memoryWriteback.required ? [{ rule: input.memoryWriteback.reason, associatedMistakePattern: "Historical onboarding snapshots and a missing local producer were treated as current truth or an external blocker." }] : [],
    },
  };
  const failures = validateTakeoverEvidence(report, input, baseline, current, "all", nowMs, root);
  if (failures.length) throw new Error(failures.join("\n"));
  report.bloat.generatedArtifactLinesCount = { [TAKEOVER_REPORT_PATH]: 0 };
  const artifact = { ...report, ...buildGeneratedReportCompleteness({ totalFindingCount: changedFiles.length }), sourceFileDiscovery: "git", gitStatus: "available", currentHeadSource: "git", toolingDegraded: false, degradationReason: null, freshness: "fresh", baselineStatus: "current", owner: "scripts/agent/validate-agent-takeover-safety-check.ts", safetyClass: "source_safe", costClass: "local_free", cleanupPolicy: "regenerate", cleanupCommand: `npm run check:agent-takeover-safety-check -- --record output/${input.taskKey}/input.json`, sourceTruthRole: "generated_snapshot", rollback: `Retained baseline and exact allowed-file copies under output/${input.taskKey}/before.` };
  const destination = path.join(root, TAKEOVER_REPORT_PATH);
  const temporary = `${destination}.tmp`;
  report.bloat.generatedArtifactLinesCount[TAKEOVER_REPORT_PATH] = (JSON.stringify(artifact, null, 2) + "\n").split(/\r?\n/u).length;
  const artifactBudgetFailures = validateBloatGuard(report.bloat);
  if (artifactBudgetFailures.length) throw new Error(artifactBudgetFailures.join("\n"));
  mkdirSync(path.dirname(destination), { recursive: true });
  try {
    writeFileSync(temporary, JSON.stringify(artifact, null, 2) + "\n");
    renameSync(temporary, destination);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  return report;
}

export function checkCurrentTakeoverEvidence(check: TakeoverCheck = "all", root = process.cwd(), nowMs = Date.now()) {
  try {
    const duplicates = RETIRED_TAKEOVER_SNAPSHOTS.filter((file) => existsSync(path.join(root, file)));
    if (duplicates.length) return [`Retired takeover projections are still active: ${duplicates.join(", ")}`];
    const value = readJson(path.join(root, TAKEOVER_REPORT_PATH));
    if (!isRecord(value) || value.schemaVersion !== 2 || typeof value.taskKey !== "string") return ["Historical takeover schema is not current task evidence; use --start and --record."];
    const report = value as TakeoverEvidenceReport;
    const { input, inputHash } = loadInput(root, path.join("output", report.taskKey, "input.json"));
    const failures = validateTakeoverEvidence(report, input, loadBaseline(root, input, inputHash), captureTakeoverSourceState(root), check, nowMs, root);
    if ((check === "bloat" || check === "all") && report.bloat.generatedArtifactLinesCount?.[TAKEOVER_REPORT_PATH] !== readFileSync(path.join(root, TAKEOVER_REPORT_PATH), "utf8").split(/\r?\n/u).length) failures.push("Generated takeover artifact line count differs from its measured budget.");
    return failures;
  } catch (error) {
    return [`Takeover evidence unavailable: ${error instanceof Error ? error.message : String(error)}`];
  }
}

export function runValidation(check: TakeoverCheck = "safety") {
  try {
    const args = process.argv.slice(2);
    if (check === "safety" && args[0] === "--start" && args[1]) {
      startTakeoverEvidence(args[1]);
      console.log("Immutable takeover baseline captured; record current evidence after the declared work.");
      return;
    }
    if (check === "safety" && args[0] === "--record" && args[1]) recordTakeoverEvidence(args[1]);
    const failures = checkCurrentTakeoverEvidence(check);
    if (failures.length) throw new Error(failures.join("\n"));
    console.log(`Takeover ${check} check OK for current task input, Git HEAD and working tree.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (require.main === module) runValidation();
