import { readText, type ValidationResult } from "./config-hardening-shared";

export type ConfigInfraMemoryLesson = {
  date: string;
  domain: "config_infra_consolidation";
  mistakePattern: string;
  rootCause: string;
  doNextTime: string;
  doNotDo: string;
  affectedFiles: string[];
  preventingValidator: string;
};

export type ConfigInfraMemoryWritebackReport = {
  generatedAtUtc: string;
  memorySource: string;
  requiredLessons: ConfigInfraMemoryLesson[];
  entriesAdded: number;
  missingLessonPatterns: string[];
  memoryFilesChecked: string[];
};

const REQUIRED_PATTERNS = [
  "Do not treat passing source tests as deployment readiness.",
  "Do not add package scripts, validators, or generated artifacts without checking for existing scripts",
  "Every config or deployment change must declare owner, environment, expected command, safety class, cost class, and rollback behavior.",
  "Never touch payment runtime, GumDrop math, provider callbacks, Firebase/security rules, middleware, or deployment configs casually.",
  "Before editing config, deployment, env, CI, package scripts, middleware, Firebase rules, or dependency tooling",
  "Config and deployment changes are release-risk changes.",
  "Dependency PRs are not cleanup.",
  "Generated artifacts must be compact by default.",
] as const;

function lesson(pattern: string): ConfigInfraMemoryLesson {
  return {
    date: "2026-05-27",
    domain: "config_infra_consolidation",
    mistakePattern: pattern,
    rootCause: "Config, CI, env, release, and dependency changes can look source-only while altering release safety, cost posture, or operator evidence requirements.",
    doNextTime: "Classify the lane, reuse existing validators, update compact policy artifacts, refresh current-head release evidence, and keep provider/deploy operations separated.",
    doNotDo: "Do not grow scripts, workflows, generated artifacts, deployment commands, or provider evidence claims without owner, validator, cost, and rollback classification.",
    affectedFiles: ["package.json", ".github/workflows/**", "firebase.json", "firestore.rules", "storage.rules", "next.config.ts", "middleware.ts", ".env.example"],
    preventingValidator: "check:config-infra-memory-writeback",
  };
}

export function getRequiredConfigInfraMemoryLessons() {
  return REQUIRED_PATTERNS.map(lesson);
}

export function buildConfigInfraMemoryWritebackReport(options: { generatedAtUtc?: string } = {}): ConfigInfraMemoryWritebackReport {
  const files = ["AGENTS.md", "REPO_MEMORY_LEDGER.md", "agent/index/known-pitfalls.json"];
  const combined = files.map(readText).join("\n");
  const missingLessonPatterns = REQUIRED_PATTERNS.filter((pattern) => !combined.includes(pattern));
  return {
    generatedAtUtc: options.generatedAtUtc || new Date().toISOString(),
    memorySource: "AGENTS.md + REPO_MEMORY_LEDGER.md + agent/index/known-pitfalls.json + Codex ad_hoc note",
    requiredLessons: getRequiredConfigInfraMemoryLessons(),
    entriesAdded: REQUIRED_PATTERNS.length - missingLessonPatterns.length,
    missingLessonPatterns,
    memoryFilesChecked: files,
  };
}

export function validateConfigInfraMemoryWritebackReport(report: ConfigInfraMemoryWritebackReport): ValidationResult {
  const failures = report.missingLessonPatterns.map((pattern) => `memory writeback missing: ${pattern}`);
  return { ok: failures.length === 0, failures, warnings: [] };
}
