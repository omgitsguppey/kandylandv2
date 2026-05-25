import { existsSync, readFileSync } from "node:fs";

const failures: string[] = [];
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

const server = read("src/lib/server/admin-analytics-historical-validation.ts");
expect(server.includes("requiredModules") && server.includes("optionalModules"), "required/optional module counts missing.");
expect(server.includes("requiredGapModules") && server.includes("optionalGapModules"), "required/optional gap modules missing.");
expect(server.includes("parityScoreFormula"), "parity score formula missing from validation model.");
expect(server.includes("module evidence samples"), "samples label remains ambiguous.");
expect(server.includes("module_empty:") || server.includes("moduleCoverageMap.blockedReason"), "blocked reason does not name empty modules.");
expect(read("agent/state/module-coverage-validator-semantics.generated.json").includes("optional_gap_nonblocking"), "validator semantics artifact missing optional nonblocking status.");
expect(read("docs/agent-truth/module-coverage-validator-semantics.md").includes("Required verified = 1.0"), "validator semantics doc missing formula.");

if (failures.length) {
  console.error("module-coverage-validator-semantics failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("module-coverage-validator-semantics: pass");
