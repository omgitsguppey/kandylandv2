import {
  classifyTestDomain,
  currentGitHead,
  listFiles,
  packageScriptForCommand,
  readPackageScripts,
  readText,
  TEST_HARDENING_GENERATED_AT_UTC,
  unique,
  validation,
  type SharedTypeDomain,
  type ValidationResult,
} from "./test-hardening-shared";

export type ValidatorAction = "keep" | "consolidate" | "retire" | "legacy_alias" | "unsafe_unknown";

export type ValidatorOwnershipEntry = {
  validatorName: string;
  file: string;
  ownerLane: Exclude<SharedTypeDomain, "unknown"> | "governance";
  packageScript: string | null;
  generatedArtifact: string | null;
  docsArtifact: string | null;
  unitTest: string | null;
  supersededBy: string | null;
  activeInFastLoop: boolean;
  releaseGateImpact: "none" | "score" | "release" | "beta_exit";
  duplicateCandidates: string[];
  action: ValidatorAction;
};

export type ValidatorOwnershipMapReport = {
  reportKey: "validator-ownership-map";
  generatedAtUtc: string;
  currentHead: string;
  validatorsAudited: number;
  validatorsRetired: number;
  validatorsConsolidated: number;
  unclassifiedValidators: number;
  entries: ValidatorOwnershipEntry[];
  remainingGaps: string[];
  nextExactSteps: string[];
  validationFailures: string[];
};

function stem(file: string) {
  return file.split("/").pop()?.replace(/^validate-/u, "").replace(/\.ts$/u, "") ?? file;
}

function ownerFor(file: string, text: string): ValidatorOwnershipEntry["ownerLane"] {
  const domain = classifyTestDomain(file, text.slice(0, 800));
  return domain === "unknown" ? "governance" : domain;
}

function artifactFor(name: string) {
  return `agent/state/${name}.generated.json`;
}

function docFor(name: string) {
  return `docs/agent-truth/${name}.md`;
}

function testFor(name: string) {
  return `tests/unit/${name}.spec.ts`;
}

export function buildValidatorOwnershipMapReport(): ValidatorOwnershipMapReport {
  const validators = listFiles(["scripts/agent"], [".ts"]).filter((file) => /\/validate-[^/]+\.ts$/u.test(file));
  const packageScripts = readPackageScripts();
  const commands = Object.values(packageScripts).join("\n");
  const stems = validators.map(stem);
  const duplicateStems = stems.filter((name, index) => stems.indexOf(name) !== index);

  const entries: ValidatorOwnershipEntry[] = validators.map((file) => {
    const text = readText(file);
    const name = stem(file);
    const command = `tsx ${file}`;
    const packageScript = packageScriptForCommand(command);
    const duplicateCandidates = duplicateStems.includes(name) ? validators.filter((candidate) => stem(candidate) === name && candidate !== file) : [];
    const generatedArtifactMatch = text.match(/agent\/state\/[a-z0-9-]+\.generated\.json/iu);
    const docsArtifactMatch = text.match(/docs\/agent-truth\/[a-z0-9-]+\.md/iu);
    const activeInFastLoop = packageScript !== null && new RegExp(`check:${name}|${name}`, "iu").test(commands);
    const releaseGateImpact: ValidatorOwnershipEntry["releaseGateImpact"] = /release|beta|readiness|current-head|evidence/iu.test(name)
      ? "beta_exit"
      : /score/iu.test(name)
        ? "score"
        : "none";
    const action: ValidatorAction = duplicateCandidates.length > 0
      ? "consolidate"
      : packageScript === null
        ? "legacy_alias"
        : "keep";
    return {
      validatorName: file.split("/").pop() ?? file,
      file,
      ownerLane: ownerFor(file, text),
      packageScript,
      generatedArtifact: generatedArtifactMatch?.[0] ?? artifactFor(name),
      docsArtifact: docsArtifactMatch?.[0] ?? docFor(name),
      unitTest: testFor(name),
      supersededBy: /final-|lock|gut-consolidation/iu.test(name) ? null : null,
      activeInFastLoop,
      releaseGateImpact,
      duplicateCandidates,
      action,
    };
  });

  const report: ValidatorOwnershipMapReport = {
    reportKey: "validator-ownership-map",
    generatedAtUtc: TEST_HARDENING_GENERATED_AT_UTC,
    currentHead: currentGitHead(),
    validatorsAudited: entries.length,
    validatorsRetired: entries.filter((entry) => entry.action === "retire").length,
    validatorsConsolidated: entries.filter((entry) => entry.action === "consolidate").length,
    unclassifiedValidators: entries.filter((entry) => entry.action === "unsafe_unknown" || entry.ownerLane === "governance" && !entry.validatorName).length,
    entries,
    remainingGaps: unique(entries.filter((entry) => entry.packageScript === null).slice(0, 10).map((entry) => `${entry.validatorName}: legacy alias or package script owner should be decided when touched.`)),
    nextExactSteps: [
      "Add package script and unit test for every new validate-* script.",
      "Mark superseded validators legacy_alias or retire them instead of leaving duplicate active gates.",
      "Keep generated artifact and docs names aligned with validator names.",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateValidatorOwnershipMapReport(report).failures;
  return report;
}

export function validateValidatorOwnershipMapReport(report: ValidatorOwnershipMapReport): ValidationResult {
  const failures: string[] = [];
  const required = [
    "validate-test-fixture-inventory.ts",
    "validate-validator-ownership-map.ts",
    "validate-test-quality-guards.ts",
    "validate-generated-artifact-size-policy.ts",
    "validate-qa-harness-consolidation.ts",
    "validate-test-fixture-memory-writeback.ts",
  ];
  for (const validatorName of required) {
    const entry = report.entries.find((candidate) => candidate.validatorName === validatorName);
    if (!entry) failures.push(`${validatorName} missing from validator ownership map.`);
    if (entry && !entry.packageScript) failures.push(`${validatorName} lacks package script.`);
  }
  if (report.validatorsAudited === 0) failures.push("no validators audited.");
  if (report.unclassifiedValidators > 0) failures.push("validator ownership map has unclassified validators.");
  if (report.entries.some((entry) => entry.action === "unsafe_unknown")) failures.push("validator ownership map has unsafe_unknown action.");
  return validation(failures.length === 0, failures);
}
