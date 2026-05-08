import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

const page = readRequired("src/app/page.tsx");
const rail = readRequired("src/components/CreatorDiscoveryRail.tsx");
const how = readRequired("src/components/Landing/HowItWorks.tsx");

requireIncludes(page, "data-home-section=\"secondary\"", "Homepage secondary wrapper");
requireIncludes(page, "data-home-section=\"third\"", "Homepage third wrapper");
requireIncludes(page, "data-home-density=\"compact-mobile-v1\"", "Homepage density markers");
requireIncludes(rail, "data-home-density={surface === \"home\" ? \"compact-mobile-v1\" : undefined}", "Creator rail density marker");
requireIncludes(how, "data-home-density=\"compact-mobile-v1\"", "How it works density marker");

const changedFilesRaw = execSync("git diff --name-only", { cwd: root, encoding: "utf8" }).trim();
const changedFiles = changedFilesRaw.length > 0 ? changedFilesRaw.split(/\r?\n/).filter(Boolean) : [];

if (changedFiles.includes("src/components/Hero.tsx")) {
  failures.push("Hero component was modified, which is forbidden.");
}

const forbiddenPathPatterns = [
  /^src\/app\/admin\//,
  /^src\/app\/dashboard\//,
  /^src\/app\/creator\//,
  /^src\/app\/drops\//,
  /^src\/components\/Chat\//,
  /^src\/components\/Navigation\/MobileBottomBar\.tsx$/,
  /^src\/components\/Navbar\.tsx$/,
  /^src\/components\/Wallet/i,
  /^src\/lib\/user-mobile-shell\.ts$/,
  /^src\/lib\/device-layout-contract\.ts$/,
];

for (const file of changedFiles) {
  if (forbiddenPathPatterns.some((pattern) => pattern.test(file))) {
    failures.push(`Forbidden non-homepage surface changed: ${file}`);
  }
}

const allowedPathPatterns = [
  /^src\/app\/page\.tsx$/,
  /^src\/components\/CreatorDiscoveryRail\.tsx$/,
  /^src\/components\/Landing\/HowItWorks\.tsx$/,
  /^scripts\/agent\/validate-homepage-mobile-density\.ts$/,
  /^docs\/agent-truth\/homepage-mobile-density\.md$/,
  /^docs\/agent-truth\/user-critical-path-lock\.md$/,
  /^package\.json$/,
];

for (const file of changedFiles) {
  if (!allowedPathPatterns.some((pattern) => pattern.test(file))) {
    failures.push(`Unexpected file changed for homepage-only density task: ${file}`);
  }
}

if (failures.length > 0) {
  console.error("validate-homepage-mobile-density failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("validate-homepage-mobile-density passed.");
