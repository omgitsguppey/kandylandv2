import { existsSync, readFileSync } from "node:fs";

const failures: string[] = [];
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

const ui = read("src/app/admin/debug/components/DebugAdvancedDataValidation.tsx");
expect(ui.includes("Required modules") && ui.includes("Optional modules"), "required/optional modules not separated.");
expect(ui.includes("Accepted sources"), "accepted substitutes hidden.");
expect(ui.includes("Canonical gaps"), "empty module canonical gaps hidden.");
expect(ui.includes("External optional gaps"), "external GA4/optional gaps not separated.");
expect(ui.includes("data-module-coverage-tier"), "module coverage tier marker missing.");
expect(ui.includes("data-raw-validation-rows-default-open=\"false\""), "raw validation rows open by default.");
expect(read("agent/state/module-coverage-ui-cleanup.generated.json").includes("raw_rows_collapsed"), "UI cleanup artifact missing raw row status.");
expect(read("docs/agent-truth/module-coverage-ui-cleanup.md").includes("Required modules"), "UI cleanup doc missing required modules section.");

if (failures.length) {
  console.error("module-coverage-ui-cleanup failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("module-coverage-ui-cleanup: pass");
