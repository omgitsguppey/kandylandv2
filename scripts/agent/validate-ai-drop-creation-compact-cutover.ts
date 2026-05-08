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

const aiPage = read("src/app/admin/ai/page.tsx");
if (!aiPage.includes("data-ai-dashboard-density=\"compact-v2\"")) failures.push("Admin AI page must expose compact dashboard marker.");

const coverPanel = read("src/components/Admin/AiDropCoverGeneratorPanel.tsx");
if (!coverPanel.includes("data-cover-prompt-source=\"deterministic-compiler\"")) failures.push("Cover panel must expose deterministic prompt source marker.");
if (!coverPanel.includes("data-cover-title-source=\"title-prefix\"")) failures.push("Cover panel must expose title-prefix source marker.");

const descPanel = read("src/components/Admin/AiDropDescriptionGeneratorPanel.tsx");
if (!descPanel.includes("data-description-source=\"deterministic-patterns\"")) failures.push("Description panel must expose deterministic source marker.");
if (!descPanel.includes("data-description-ai-polish=\"optional\"")) failures.push("Description panel must expose optional AI polish marker.");

const uploader = read("src/components/Admin/AssetUploader.tsx");
if (uploader.includes("{asset.kind}")) failures.push("Asset uploader should not render redundant text kind badge in thumbnail chip.");

for (const file of [
  "src/components/Admin/CompactAiModuleCard.tsx",
  "src/components/Admin/CompactAiActionButton.tsx",
  "src/components/Admin/CompactAiStatusChip.tsx",
  "src/components/Admin/CollapsibleDropSection.tsx",
]) {
  if (!existsSync(path.join(repoRoot, file))) failures.push(`Missing compact primitive: ${file}`);
}

if (failures.length > 0) {
  console.error("AI drop creation compact cutover validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("AI drop creation compact cutover validation passed.");
