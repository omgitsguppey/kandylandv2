import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { planAffectedAudits } from "../../src/lib/agent-audit/affected-surface-router";
import { AFFECTED_AUDIT_DOC_PATH, AFFECTED_AUDIT_PLAN_PATH, type AffectedAuditPlan } from "../../src/lib/agent-audit/verification-command-budget";

const root = process.cwd();
const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function readRequired(filePath: string) {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${filePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    fail(`${label} must include "${expected}".`);
  }
}

function parseJsonObject(filePath: string) {
  const source = readRequired(filePath);
  if (!source) return null;
  try {
    const parsed = JSON.parse(source) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail(`${filePath} must be a JSON object.`);
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    fail(`${filePath} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as { scripts?: Record<string, string> };
const packageScripts = packageJson.scripts ?? {};
const contract = readRequired("src/lib/agent-audit/affected-surface-router.ts");
const budget = readRequired("src/lib/agent-audit/verification-command-budget.ts");
const planner = readRequired("scripts/agent/plan-affected-audits.ts");
const validator = readRequired("scripts/agent/validate-affected-audit-router.ts");
const auditRunner = readRequired("scripts/agent/run-audit-with-ledger.ts");
const docs = readRequired(AFFECTED_AUDIT_DOC_PATH);
const generatedPlan = parseJsonObject(AFFECTED_AUDIT_PLAN_PATH);

for (const [scriptName, command] of Object.entries({
  "plan:affected-audits": "tsx scripts/agent/plan-affected-audits.ts",
  "check:affected-audit-router": "tsx scripts/agent/validate-affected-audit-router.ts",
})) {
  if (packageScripts[scriptName] !== command) {
    fail(`package.json must expose "${scriptName}": "${command}".`);
  }
}

for (const field of [
  "changedFiles",
  "affectedSurfaces",
  "requiredStaticScans",
  "requiredTargetedTests",
  "optionalChecks",
  "forbiddenByDefault",
  "terminalRunJustification",
  "maxCommandBudget",
  "skipReasons",
  "whyNotFullCheck",
]) {
  requireIncludes(budget, field, "affected audit plan contract");
  if (generatedPlan && !Object.prototype.hasOwnProperty.call(generatedPlan, field)) {
    fail(`${AFFECTED_AUDIT_PLAN_PATH} must include ${field}.`);
  }
}

for (const expected of [
  "src/components/PurchaseModal.tsx",
  "src/app/api/paypal/",
  "src/components/Chat/",
  "src/app/dashboard/viewer/",
  "src/app/admin/users/",
  "firestore.rules",
  "docs/agent-truth/",
  "scripts/agent/",
  "agent/index/surface-map.json",
  "agent/index/dependency-graph.summary.json",
]) {
  requireIncludes(contract, expected, "affected surface router rules");
}

for (const expected of [
  "git diff",
  "--base",
  "--head",
  "--files",
  "--changed-script",
  "writePlan(plan)",
]) {
  requireIncludes(planner, expected, "affected audit planner");
}

for (const expected of [
  "Nx-style affected planning",
  "Git changed files",
  "surface map",
  "dependency",
  "whyThisCommand",
  "whyNotFullCheck",
  "safe skip",
  "full-suite",
  "does not require adopting Nx",
]) {
  requireIncludes(docs, expected, "affected audit router docs");
}

for (const expected of ["explainTerminalGate", "AFFECTED_AUDIT_PLAN_PATH", "terminal_gate"]) {
  requireIncludes(auditRunner, expected, "audit runtime terminal gate");
}

assertPlan("wallet file", ["src/components/PurchaseModal.tsx"], {
  commands: ["npm run check:wallet-density", "npm run check:gumdrop-economy", "npm run check:purchase-telemetry-truth"],
  forbidden: ["npm run check"],
  absent: ["npm run check:ui:audits"],
  maxBudget: 4,
});

assertPlan("docs only", ["docs/agent-truth/audit-runtime-ledger.md"], {
  commands: ["npm run check:generated-artifacts"],
  absent: ["npm run typecheck", "npm run check:ui:audits"],
  maxBudget: 1,
});

assertPlan("PayPal API", ["src/app/api/paypal/capture/route.ts"], {
  commands: ["npm run check:purchase-telemetry-truth", "npm run check:gumdrop-economy", "npm run check:speed-security", "npm run agent:test -- src/app/api/paypal/capture/route.ts"],
  maxBudget: 4,
});

assertPlan("chat component", ["src/components/Chat/ChatExperience.tsx"], {
  commands: ["npm run check:user-chat-shell-routing", "npm run check:event-catalog-telemetry", "npm run check:device-ui"],
  maxBudget: 3,
});

assertPlan("viewer route", ["src/app/dashboard/viewer/ViewerClient.tsx"], {
  commands: ["npm run check:watch-time-truth", "npm run check:content-protection", "npm run check:viewer-file-tracking"],
  maxBudget: 3,
});

assertPlan("admin users", ["src/app/admin/users/page.tsx"], {
  commands: ["npm run check:admin-user-behavior-truth", "npm run check:telemetry-identified-parity"],
  maxBudget: 3,
});

assertPlan("firestore rules", ["firestore.rules"], {
  commands: ["npm run test:rules:firestore"],
  absent: ["npm run check:firebase:rules", "npm run typecheck"],
  maxBudget: 4,
});

assertPlan("agent tooling only", ["scripts/agent/validate-audit-runtime-ledger.ts"], {
  commands: ["npm run check:affected-audit-router", "npm run check:audit-runtime-ledger"],
  absent: ["npm run agent:test", "npm run check:ui:audits"],
  maxBudget: 3,
});

requireIncludes(validator, "assertPlan(\"wallet file\"", "affected audit validator examples");

function assertPlan(
  label: string,
  changedFiles: string[],
  expected: { commands: string[]; absent?: string[]; forbidden?: string[]; maxBudget: number },
) {
  const plan = planAffectedAudits({
    changedFiles,
    taskSummary: label,
    packageScripts,
    surfaceMap: { domains: [] },
    dependencyGraph: {},
  });
  const commands = allRequiredCommands(plan);
  for (const command of expected.commands) {
    if (!commands.includes(command)) {
      fail(`${label} plan must require ${command}. Actual: ${commands.join(", ")}`);
    }
    const justification = plan.terminalRunJustification.find((entry) => entry.command === command);
    if (!justification?.whyThisCommand) {
      fail(`${label} plan must include whyThisCommand for ${command}.`);
    }
  }
  for (const command of expected.absent ?? []) {
    if (commands.some((entry) => entry.startsWith(command))) {
      fail(`${label} plan must not require ${command}. Actual: ${commands.join(", ")}`);
    }
  }
  for (const command of expected.forbidden ?? []) {
    if (!plan.forbiddenByDefault.some((entry) => entry.command === command)) {
      fail(`${label} plan must list ${command} as forbiddenByDefault.`);
    }
  }
  if (plan.maxCommandBudget !== expected.maxBudget) {
    fail(`${label} plan maxCommandBudget should be ${expected.maxBudget}, got ${plan.maxCommandBudget}.`);
  }
  if (!plan.whyNotFullCheck) {
    fail(`${label} plan must include whyNotFullCheck.`);
  }
  if (plan.skipReasons.length === 0) {
    fail(`${label} plan must include safe skip explanations.`);
  }
}

function allRequiredCommands(plan: AffectedAuditPlan) {
  return [...plan.requiredStaticScans, ...plan.requiredTargetedTests].map((entry) => entry.command);
}

if (failures.length > 0) {
  console.error("Affected audit router validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Affected audit router validation passed.");
