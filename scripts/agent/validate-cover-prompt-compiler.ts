import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { compileCoverPrompt } from "../../src/lib/ai-cover/cover-prompt-compiler";

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
if (!compiler.includes("Lock the core object category")) {
  failures.push("Cover compiler must lock the core object category.");
}
if (!compiler.includes("Within that locked category, intelligently enrich")) {
  failures.push("Cover compiler must allow category-safe enrichment.");
}
if (!compiler.includes("Category-safe enrichment may add supporting props")) {
  failures.push("Cover compiler must mention supporting props enrichment.");
}

const blueberryMuffins = compileCoverPrompt({
  title: "Blueberry Muffins",
  imageModel: "image_3_pro_preview",
});
if (blueberryMuffins.debugBrief.primaryFlavorCategory !== "muffin_bakery") {
  failures.push("Blueberry Muffins must remain in the muffin/bakery category.");
}
if (!String(blueberryMuffins.prompt).includes("Lock the core object category to muffin_bakery")) {
  failures.push("Compiled prompt must keep the category-lock guidance visible.");
}

const chocolateBar = compileCoverPrompt({
  title: "Chocolate Bar",
  imageModel: "image_3_pro_preview",
});
if (chocolateBar.debugBrief.primaryFlavorCategory !== "candy_bar") {
  failures.push("Chocolate Bar must remain in the candy/bar category.");
}
if (String(chocolateBar.prompt).includes("cherry drink") || String(chocolateBar.prompt).includes("soda")) {
  failures.push("Chocolate Bar prompt must not drift into drink/soda categories.");
}
if (!String(chocolateBar.prompt).includes("Within that locked category, intelligently enrich")) {
  failures.push("Compiled prompt must permit safe category enrichment.");
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
