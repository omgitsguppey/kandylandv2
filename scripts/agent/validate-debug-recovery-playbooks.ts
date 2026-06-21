import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildDebugRecoveryPlaybooks,
  validateDebugRecoveryPlaybooks,
  type DebugRecoveryPlaybook,
} from "../../src/lib/debug/recovery-playbooks";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/debug-recovery-playbooks.generated.json";
const DOC_PATH = "docs/agent-truth/debug-recovery-playbooks.md";

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function renderPlaybook(playbook: DebugRecoveryPlaybook) {
  return [
    `### ${playbook.title}`,
    "",
    `- ID: \`${playbook.id}\``,
    `- Trigger patterns: ${playbook.triggerPatterns.map((entry) => `\`${entry}\``).join(", ")}`,
    `- Source files: ${playbook.sourceFiles.map((entry) => `\`${entry}\``).join(", ")}`,
    "",
    "Commands:",
    ...playbook.commands.map((command) => `- \`${command}\``),
    "",
    "Validators:",
    ...playbook.validators.map((command) => `- \`${command}\``),
    "",
    "Fixes:",
    ...playbook.fixes.map((fix) => `- ${fix}`),
    "",
    "Forbidden actions:",
    ...playbook.forbiddenActions.map((action) => `- ${action}`),
    "",
    `Evidence outcome: ${playbook.evidenceOutcome}`,
    `Scoring impact: ${playbook.scoringImpactEstimate.dimensions.join(", ")}; estimated ${playbook.scoringImpactEstimate.estimatedPointImpact} point(s); typed evidence gates clear=${!playbook.scoringImpactEstimate.doesNotClearFormalGates}`,
    "",
  ].join("\n");
}

function renderDoc(playbooks: DebugRecoveryPlaybook[]) {
  return [
    "# Debug Recovery Playbooks",
    "",
    "Status: source-only executable recovery map for high-impact debug categories. These playbooks do not authorize production reads, deploys, payment/GumDrop math changes, chat/nav edits, or provider-backed site activity, deployed route, or admin source activity sample clearance without artifacts.",
    "",
    "## Summary",
    "",
    `- Playbooks: ${playbooks.length}`,
    "- Typed evidence gates: remain separate from source-only recovery.",
    "- Default forbidden actions: no production reads, no deploy, no payment/GumDrop math changes, no chat/nav edits.",
    "",
    "## Playbooks",
    "",
    ...playbooks.map(renderPlaybook),
  ].join("\n");
}

const playbooks = buildDebugRecoveryPlaybooks();
const validationFailures = validateDebugRecoveryPlaybooks(playbooks);
const report = {
  generatedAtUtc: new Date().toISOString(),
  reportKey: "debug-recovery-playbooks",
  currentHead: git(["rev-parse", "HEAD"]),
  sourceCommit: git(["rev-parse", "HEAD"]),
  overallStatus: validationFailures.length === 0 ? "pass" : "fail",
  playbookCount: playbooks.length,
  validationFailures,
  playbooks,
  limits: [
    "no_production_reads",
    "no_deploy",
    "no_payment_gumdrop_math_changes",
    "no_chat_nav_edits",
    "no_formal_gate_clear_without_artifact",
  ],
};

write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
write(DOC_PATH, renderDoc(playbooks));

if (validationFailures.length > 0) {
  console.error("Debug recovery playbooks validation failed:");
  for (const failure of validationFailures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Debug recovery playbooks OK: ${playbooks.length} playbooks.`);
