import { existsSync, readFileSync } from "node:fs";

const failures: string[] = [];
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");
const server = read("src/lib/server/admin-analytics-historical-validation.ts");

expect(server.includes("setEvidence(evidence, \"daily_tasks\", \"task_lifecycle\""), "Daily Tasks ignores task lifecycle.");
expect(server.includes("setEvidence(evidence, \"task_guidance\", \"task_pipeline\""), "Task Guidance ignores task pipeline.");
expect(server.includes("setEvidence(evidence, \"unlock_watch\", \"watch_sessions\"") && server.includes("setEvidence(evidence, \"unlock_watch\", \"session_facts\""), "Engagement/unlock-watch ignores watch or session facts.");
expect(server.includes("setEvidence(evidence, \"admin\", \"admin_truth_snapshot\""), "Admin remains empty despite admin truth evidence.");
expect(server.includes("setEvidence(evidence, \"runtime\", \"route_runtime\""), "Runtime remains empty despite route/runtime evidence.");
expect(read("agent/state/module-specific-mapping-repair.generated.json").includes("daily_tasks"), "module-specific repair artifact missing Daily Tasks.");
expect(read("docs/agent-truth/module-specific-mapping-repair.md").includes("Navigation remains"), "module-specific repair doc missing navigation gap.");

if (failures.length) {
  console.error("module-specific-mapping-repair failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("module-specific-mapping-repair: pass");
