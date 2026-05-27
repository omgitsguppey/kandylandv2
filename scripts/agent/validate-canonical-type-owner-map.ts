import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { CANONICAL_TYPE_OWNER_MAP, validateCanonicalTypeOwnerMap } from "@/lib/type-hardening/canonical-type-owner-map";
import { currentGitHead } from "@/lib/type-hardening/type-hardening-shared";

const ROOT = process.cwd();

function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

const validation = validateCanonicalTypeOwnerMap(CANONICAL_TYPE_OWNER_MAP);
const generatedAtUtc = new Date().toISOString();
const report = {
  reportKey: "canonical-type-owner-map",
  generatedAtUtc,
  currentHead: currentGitHead(),
  owners: CANONICAL_TYPE_OWNER_MAP,
  validationFailures: validation.failures,
};

write("agent/state/canonical-type-owner-map.generated.json", JSON.stringify(report));
write("docs/agent-truth/canonical-type-owner-map.md", [
  "# Canonical Type Owner Map",
  "",
  `Generated: ${generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  `Owners: ${CANONICAL_TYPE_OWNER_MAP.length}`,
  "",
  "## Owners",
  "",
  ...CANONICAL_TYPE_OWNER_MAP.map((entry) => `- ${entry.label}: ${entry.canonicalFiles.join(", ")}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Canonical type owner map passed: owners=${CANONICAL_TYPE_OWNER_MAP.length}`);
