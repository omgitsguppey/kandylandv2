import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

for (const file of [
  "src/lib/drop-descriptions/drop-description-patterns.ts",
  "src/lib/drop-descriptions/drop-description-compiler.ts",
  "src/lib/drop-descriptions/drop-description-memory.ts",
  "src/lib/drop-descriptions/drop-description-feedback.ts",
]) {
  read(file);
}

const compiler = read("src/lib/drop-descriptions/drop-description-compiler.ts");
if (!compiler.includes("options: [string, string, string]")) failures.push("Description compiler must return exactly 3 options.");
if (!compiler.includes("source: \"deterministic-patterns\"")) failures.push("Description compiler must be deterministic-source.");

const generateRoute = read("src/app/api/admin/ai/drop-descriptions/generate/route.ts");
if (!generateRoute.includes("dataDescriptionSource")) failures.push("Description route must emit deterministic source marker.");
if (!generateRoute.includes("descriptionOptions")) failures.push("Description route must include deterministic options fallback.");

if (failures.length > 0) {
  console.error("Drop description compiler validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Drop description compiler validation passed.");
