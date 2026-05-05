import { existsSync, readFileSync, statSync } from "node:fs";

import {
  DOCTRINE_CARDS_PATH,
  DOCTRINE_INDEX_PATH,
  FILE_SIZE_BUDGET_PATH,
  FILE_SIZE_BUDGETS,
  LEGACY_REGISTRY_CONTEXT_PATH,
  REQUIRED_COMPACT_SURFACES,
  SURFACE_CONTRACTS_PATH,
  TASK_PACK_PATH,
  VALIDATOR_MAP_PATH,
  type DoctrineCard,
} from "./build-compact-agent-context";
import { getPackageScripts, listRepoFiles, readJsonFile, readText, toAbsoluteRepoPath } from "./shared";

type SurfaceContract = {
  id: string;
  surface: string;
  title: string;
  sourceDocs: string[];
  canonicalFiles: string[];
  requiredValidators: string[];
};

type ValidatorMap = {
  validators: Record<string, string>;
  unmappedPackageScripts: string[];
};

type TaskPack = {
  changedFiles: string[];
  affectedSurfaces: string[];
  loadPlan: string[];
  relevantCards: DoctrineCard[];
  validators: string[];
  validatorSurfaces?: Record<string, string>;
  legacyWarnings: unknown[];
};

function assert(condition: unknown, message: string, failures: string[]) {
  if (!condition) {
    failures.push(message);
  }
}

function warn(message: string, warnings: string[]) {
  warnings.push(message);
}

function fileExists(repoPath: string) {
  return existsSync(toAbsoluteRepoPath(repoPath));
}

function parseJsonl<T>(repoPath: string) {
  const source = readText(repoPath).trim();
  if (!source) return [] as T[];
  return source.split(/\r?\n/u).map((line, index) => {
    try {
      return JSON.parse(line) as T;
    } catch (error) {
      throw new Error(`${repoPath}:${index + 1} is not valid JSONL: ${(error as Error).message}`);
    }
  });
}

function lineCount(repoPath: string) {
  try {
    return readText(repoPath).split(/\r?\n/u).length;
  } catch {
    return 0;
  }
}

function isValidatorScript(scriptName: string) {
  return scriptName.startsWith("check:") || scriptName.startsWith("score:") || scriptName.startsWith("validate:");
}

function validateCardShape(card: DoctrineCard, failures: string[]) {
  const label = `card ${card.id || card.surface}`;
  assert(typeof card.id === "string" && card.id.length > 0, `${label}: missing id`, failures);
  assert(typeof card.title === "string" && card.title.length > 0, `${label}: missing title`, failures);
  assert(typeof card.surface === "string" && card.surface.length > 0, `${label}: missing surface`, failures);
  assert(Array.isArray(card.scope), `${label}: scope must be array`, failures);
  assert(Array.isArray(card.canonicalFiles), `${label}: canonicalFiles must be array`, failures);
  assert(Array.isArray(card.rules), `${label}: rules must be array`, failures);
  assert(Array.isArray(card.blockedPatterns), `${label}: blockedPatterns must be array`, failures);
  assert(Array.isArray(card.requiredValidators), `${label}: requiredValidators must be array`, failures);
  assert(typeof card.sourceDoc === "string" && card.sourceDoc.length > 0, `${label}: missing sourceDoc`, failures);
  assert(["critical", "high", "normal", "low"].includes(card.priority), `${label}: invalid priority`, failures);
  assert(Number.isFinite(card.tokenEstimate), `${label}: tokenEstimate must be finite`, failures);
  const chars = JSON.stringify(card).length;
  assert(chars <= FILE_SIZE_BUDGETS.agentCardMaxChars, `${label}: ${chars} chars exceeds card max ${FILE_SIZE_BUDGETS.agentCardMaxChars}`, failures);
}

function validateRequiredSurfaces(cards: DoctrineCard[], contracts: SurfaceContract[], failures: string[]) {
  const cardSurfaces = new Set(cards.map((card) => card.surface));
  const contractSurfaces = new Set(contracts.map((contract) => contract.surface));
  for (const surface of REQUIRED_COMPACT_SURFACES) {
    assert(cardSurfaces.has(surface), `Missing compact doctrine card for critical surface ${surface}`, failures);
    assert(contractSurfaces.has(surface), `Missing surface contract for critical surface ${surface}`, failures);
  }
}

function validateMarkdownCoverage(cards: DoctrineCard[], contracts: SurfaceContract[], warnings: string[]) {
  const coveredDocs = new Set<string>();
  for (const card of cards) coveredDocs.add(card.sourceDoc);
  for (const contract of contracts) {
    for (const sourceDoc of contract.sourceDocs ?? []) coveredDocs.add(sourceDoc);
  }

  const markdownDocs = listRepoFiles().filter((repoPath) =>
    repoPath.endsWith(".md") && (repoPath.startsWith("docs/doctrine/") || repoPath.startsWith("docs/agent-truth/")),
  );
  const uncovered = markdownDocs.filter((repoPath) => !coveredDocs.has(repoPath));
  if (uncovered.length > 0) {
    warn(
      `Markdown docs without a direct compact card source mapping: ${uncovered.length}; sample: ${uncovered.slice(0, 12).join(", ")}`,
      warnings,
    );
  }

  const overBudget = markdownDocs
    .map((repoPath) => ({ repoPath, lines: lineCount(repoPath) }))
    .filter((entry) => entry.lines > FILE_SIZE_BUDGETS.markdownDoctrineMaxRecommendedLines);
  if (overBudget.length > 0) {
    warn(
      `Markdown doctrine/docs over ${FILE_SIZE_BUDGETS.markdownDoctrineMaxRecommendedLines} lines should be loaded through compact cards first: ${overBudget.slice(0, 12).map((entry) => `${entry.repoPath} (${entry.lines})`).join(", ")}`,
      warnings,
    );
  }
}

function validateGeneratedJsonBudget(warnings: string[]) {
  const generatedJson = listRepoFiles().filter((repoPath) =>
    repoPath.endsWith(".json") && (repoPath.startsWith("agent/state/") || repoPath.startsWith("agent/index/") || repoPath.startsWith("agent/context/")),
  );
  const overBudget = generatedJson
    .map((repoPath) => ({ repoPath, lines: lineCount(repoPath) }))
    .filter((entry) => entry.lines > FILE_SIZE_BUDGETS.generatedJsonReportMaxRecommendedLines);
  if (overBudget.length > 0) {
    warn(
      `Generated JSON files over ${FILE_SIZE_BUDGETS.generatedJsonReportMaxRecommendedLines} lines should be sharded or JSONL when append-only: ${overBudget.slice(0, 12).map((entry) => `${entry.repoPath} (${entry.lines})`).join(", ")}`,
      warnings,
    );
  }
}

function validateValidatorMap(validatorMap: ValidatorMap, failures: string[]) {
  const scripts = getPackageScripts("package.json");
  const validators = Object.keys(scripts).filter(isValidatorScript);
  const mapped = new Set(Object.keys(validatorMap.validators ?? {}));
  for (const scriptName of validators) {
    assert(mapped.has(scriptName), `Package validator script ${scriptName} is not mapped to a compact surface`, failures);
    const surface = validatorMap.validators?.[scriptName];
    assert(typeof surface === "string" && surface.length > 0, `Package validator script ${scriptName} has no surface`, failures);
  }
  assert((validatorMap.unmappedPackageScripts ?? []).length === 0, "validator-map reports unmappedPackageScripts", failures);
}

function validateTaskPack(taskPack: TaskPack, allCards: DoctrineCard[], validatorMap: ValidatorMap, failures: string[]) {
  assert(Array.isArray(taskPack.changedFiles), "task pack changedFiles must be array", failures);
  assert(Array.isArray(taskPack.affectedSurfaces), "task pack affectedSurfaces must be array", failures);
  assert(Array.isArray(taskPack.relevantCards), "task pack relevantCards must be array", failures);
  assert(Array.isArray(taskPack.validators), "task pack validators must be array", failures);
  assert(Array.isArray(taskPack.legacyWarnings), "task pack legacyWarnings must be array", failures);
  assert(taskPack.loadPlan?.[0] === DOCTRINE_INDEX_PATH, `task pack load plan must start with ${DOCTRINE_INDEX_PATH}`, failures);

  const allowedSurfaces = new Set(taskPack.affectedSurfaces);
  for (const card of taskPack.relevantCards ?? []) {
    assert(allowedSurfaces.has(card.surface), `task pack includes unrelated card ${card.surface}`, failures);
  }

  if (taskPack.affectedSurfaces.length > 0 && allCards.length > taskPack.relevantCards.length) {
    assert(
      taskPack.relevantCards.length < allCards.length,
      "task pack should not include every compact card when only a subset of surfaces changed",
      failures,
    );
  }

  const knownValidatorScripts = new Set(Object.keys(validatorMap.validators ?? {}));
  for (const command of taskPack.validators ?? []) {
    const scriptName = command.replace(/^npm run /u, "");
    const surface = taskPack.validatorSurfaces?.[scriptName] ?? validatorMap.validators?.[scriptName];
    assert(knownValidatorScripts.has(scriptName), `task pack includes unknown validator ${scriptName}`, failures);
    assert(allowedSurfaces.has(surface), `task pack includes validator for unrelated surface ${surface}`, failures);
  }
}

function validateArtifactFreshness(repoPath: string, sourcePaths: string[], warnings: string[]) {
  if (!fileExists(repoPath)) return;
  const artifactMtime = statSync(toAbsoluteRepoPath(repoPath)).mtimeMs;
  const staleSources = sourcePaths
    .filter(fileExists)
    .filter((sourcePath) => statSync(toAbsoluteRepoPath(sourcePath)).mtimeMs > artifactMtime + 1000);
  if (staleSources.length > 0) {
    warn(`${repoPath} may be stale behind source changes: ${staleSources.slice(0, 8).join(", ")}`, warnings);
  }
}

export function validateCompactAgentContext() {
  const failures: string[] = [];
  const warnings: string[] = [];
  const requiredArtifacts = [
    DOCTRINE_INDEX_PATH,
    DOCTRINE_CARDS_PATH,
    SURFACE_CONTRACTS_PATH,
    VALIDATOR_MAP_PATH,
    LEGACY_REGISTRY_CONTEXT_PATH,
    FILE_SIZE_BUDGET_PATH,
    TASK_PACK_PATH,
    "docs/agent-truth/compact-agent-context.md",
  ];

  for (const repoPath of requiredArtifacts) {
    assert(fileExists(repoPath), `Missing compact context artifact ${repoPath}`, failures);
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }

  const index = readJsonFile<{ loadPlan?: string[]; requiredSurfaces?: string[]; warnings?: string[] }>(DOCTRINE_INDEX_PATH);
  const cards = parseJsonl<DoctrineCard>(DOCTRINE_CARDS_PATH);
  const contracts = parseJsonl<SurfaceContract>(SURFACE_CONTRACTS_PATH);
  const validatorMap = readJsonFile<ValidatorMap>(VALIDATOR_MAP_PATH);
  const taskPack = readJsonFile<TaskPack>(TASK_PACK_PATH);
  readJsonFile(FILE_SIZE_BUDGET_PATH);
  readJsonFile(LEGACY_REGISTRY_CONTEXT_PATH);

  assert(Array.isArray(index.loadPlan), "doctrine.index.json must include loadPlan", failures);
  assert(index.loadPlan?.[0]?.includes(DOCTRINE_INDEX_PATH), "doctrine.index.json loadPlan must start with itself", failures);
  for (const surface of REQUIRED_COMPACT_SURFACES) {
    assert(index.requiredSurfaces?.includes(surface), `doctrine.index.json missing required surface ${surface}`, failures);
  }

  cards.forEach((card) => validateCardShape(card, failures));
  validateRequiredSurfaces(cards, contracts, failures);
  validateMarkdownCoverage(cards, contracts, warnings);
  validateGeneratedJsonBudget(warnings);
  validateValidatorMap(validatorMap, failures);
  validateTaskPack(taskPack, cards, validatorMap, failures);
  validateArtifactFreshness(DOCTRINE_INDEX_PATH, ["scripts/agent/build-compact-agent-context.ts"], warnings);

  const docs = readFileSync(toAbsoluteRepoPath("docs/agent-truth/compact-agent-context.md"), "utf8");
  assert(docs.includes(DOCTRINE_INDEX_PATH), "compact-agent-context docs must document doctrine.index.json first-load plan", failures);
  assert(docs.includes(DOCTRINE_CARDS_PATH), "compact-agent-context docs must document JSONL doctrine cards", failures);

  if (warnings.length > 0) {
    console.warn("Compact agent context warnings:");
    warnings.slice(0, 20).forEach((entry) => console.warn(`- ${entry}`));
    if (warnings.length > 20) {
      console.warn(`- ${warnings.length - 20} additional warnings suppressed`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Compact agent context validation failed:\n${failures.join("\n")}`);
  }

  console.log("Compact agent context load plan:");
  console.log(`1. ${DOCTRINE_INDEX_PATH}`);
  console.log(`2. ${DOCTRINE_CARDS_PATH} filtered by task surfaces`);
  console.log(`3. ${SURFACE_CONTRACTS_PATH} filtered by task surfaces`);
  console.log(`4. ${VALIDATOR_MAP_PATH}`);
  console.log(`5. ${TASK_PACK_PATH}`);
  console.log(`Validated ${cards.length} cards across ${contracts.length} surface contracts.`);
}

if (require.main === module) {
  validateCompactAgentContext();
}
