import fs from "node:fs";

function expect(condition: unknown, message: string, failures: string[]) {
  if (!condition) failures.push(message);
}

const source = fs.readFileSync("src/lib/debug/source-window-zero-shell-classifier.ts", "utf8");
const tests = fs.readFileSync("tests/unit/source-window-zero-shell-classifier.spec.ts", "utf8");
const failures: string[] = [];

[
  "loaded_with_data",
  "loaded_empty_with_source_window",
  "source_ready_no_sample_loaded",
  "source_missing_actionable",
  "stale_rebuild_required",
  "formula_missing_actionable",
  "registry_missing_actionable",
  "failed",
].forEach((status) => expect(source.includes(status), `missing status ${status}`, failures));
expect(source.includes("nextAction"), "nextAction is required.", failures);
expect(source.includes("sourceWindowStartUtc"), "source window start is required.", failures);
expect(source.includes("generatedAtUtc"), "generatedAtUtc is required.", failures);
expect(tests.includes("does not allow loaded zero rows"), "zero-shell regression test missing.", failures);

if (failures.length) {
  console.error("Source-window zero-shell classifier validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Source-window zero-shell classifier validator passed.");
