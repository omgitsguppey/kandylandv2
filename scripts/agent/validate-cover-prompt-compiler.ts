import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const failures: string[] = [];
const requiredFiles = [
  "src/lib/ai-cover/cover-title-parser.ts",
  "src/lib/ai-cover/creator-brand-resolver.ts",
  "src/lib/ai-cover/flavor-ontology.ts",
  "src/lib/ai-cover/cover-layout-dna.ts",
  "src/lib/ai-cover/cover-prompt-compiler.ts",
  "src/lib/ai-cover/model-prompt-adapters.ts",
  "src/lib/ai-cover/cover-feedback-weights.ts",
];

function read(relativePath: string) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

for (const file of requiredFiles) read(file);

const compiler = read("src/lib/ai-cover/cover-prompt-compiler.ts");
if (!compiler.includes("coverTitleSource") || !compiler.includes("deterministic-compiler")) {
  failures.push("Cover compiler must expose deterministic debug markers.");
}
if (!compiler.includes("Do not add profile/display name unless it appears in the title")) {
  failures.push("Cover compiler must enforce title-prefix creator naming.");
}

const route = read("src/app/api/admin/ai/drop-covers/prompt-policy/route.ts");
if (!route.includes("cover_prompt_refinement_blocked")) {
  failures.push("Prompt refinement route must be blocked/deprecated.");
}

if (failures.length > 0) {
  console.error("Cover prompt compiler validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Cover prompt compiler validation passed.");
