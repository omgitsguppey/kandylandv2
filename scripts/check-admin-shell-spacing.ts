import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-shell-spacing] ${message}`);
  process.exitCode = 1;
}

function assertIncludes(file: string, source: string, expected: string) {
  if (!source.includes(expected)) {
    fail(`${file} is missing ${expected}`);
  }
}

function assertNotIncludes(file: string, source: string, unexpected: string) {
  if (source.includes(unexpected)) {
    fail(`${file} still contains ${unexpected}`);
  }
}

const adminLayout = read("src/app/admin/layout.tsx");
const rootLayout = read("src/app/layout.tsx");
const coreLayout = read("src/components/CoreLayoutWrapper.tsx");
const spacing = read("src/lib/admin-shell-spacing.ts");
const globals = read("src/app/globals.css");
const adminAnalytics = read("src/app/admin/analytics/page.tsx");
const adminOverview = read("src/app/admin/page.tsx");
const adminAi = read("src/app/admin/ai/page.tsx");
const debugRoute = read("src/app/api/admin/debug/route.ts");

assertIncludes("src/lib/admin-shell-spacing.ts", spacing, "ADMIN_SHELL_ROUTE_CLASS");
assertIncludes("src/lib/admin-shell-spacing.ts", spacing, "ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS");
assertIncludes("src/lib/admin-shell-spacing.ts", spacing, "buildAdminShellLayoutDebugMetadata");
assertIncludes("src/app/globals.css", globals, "--admin-shell-gap: 1rem");
assertIncludes("src/app/globals.css", globals, "--admin-shell-gap-md: 1.25rem");
assertIncludes("src/app/globals.css", globals, ".admin-shell-route");
assertNotIncludes("src/app/globals.css", globals, "--admin-top-spacing");
assertIncludes("src/app/layout.tsx", rootLayout, "pt-[var(--root-shell-top-spacing,6rem)]");
assertIncludes("src/components/CoreLayoutWrapper.tsx", coreLayout, "ADMIN_SHELL_ROUTE_CLASS");
assertIncludes("src/components/CoreLayoutWrapper.tsx", coreLayout, 'data-admin-shell-route="true"');
assertIncludes("src/app/admin/layout.tsx", adminLayout, "ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS");
assertIncludes("src/app/admin/layout.tsx", adminLayout, "ADMIN_CONSOLE_STICKY_TOP_CLASS");
assertIncludes("src/app/admin/layout.tsx", adminLayout, 'data-admin-shell-spacing="shared"');
assertIncludes("src/app/admin/layout.tsx", adminLayout, 'data-admin-console-nav="true"');
assertIncludes("src/app/admin/layout.tsx", adminLayout, "grid grid-cols-3 gap-2 md:hidden");
assertIncludes("src/app/admin/layout.tsx", adminLayout, "hidden overflow-x-auto md:block");
assertIncludes("src/app/api/admin/debug/route.ts", debugRoute, "adminShellLayout");
assertIncludes("src/app/api/admin/debug/route.ts", debugRoute, "buildAdminShellLayoutDebugMetadata");

assertNotIncludes("src/app/admin/layout.tsx", adminLayout, "mt-[-");
assertNotIncludes("src/app/admin/layout.tsx", adminLayout, "--admin-top-spacing");
assertNotIncludes("src/app/admin/layout.tsx", adminLayout, "md:mb-6");
assertNotIncludes("src/app/admin/ai/page.tsx", adminAi, " pt-4 ");
assertNotIncludes("src/app/admin/analytics/page.tsx", adminAnalytics, "mt-[-");
assertNotIncludes("src/app/admin/page.tsx", adminOverview, "mt-[-");

const shellFiles = [
  ["src/app/layout.tsx", rootLayout],
  ["src/components/CoreLayoutWrapper.tsx", coreLayout],
  ["src/app/admin/layout.tsx", adminLayout],
];
const safeAreaTopPaddingLayers = shellFiles.filter(([, source]) => /paddingTop:.*safe-area-inset-top|pt-\[calc\([^"\]]*safe-area-inset-top/.test(source));
if (safeAreaTopPaddingLayers.length > 1) {
  fail(`duplicate safe-area top padding detected in ${safeAreaTopPaddingLayers.map(([file]) => file).join(", ")}`);
}

const compensatingTopSpacingPattern = /className="[^"]*(?:\bmt-\[(?:-[^\]]+|[3-9]rem|[4-9][0-9]px)|\b-mt-\d|\bpt-(?:8|9|10|11|12|14|16|20|24)\b)[^"]*"/;
for (const [file, source] of [
  ["src/app/admin/page.tsx", adminOverview],
  ["src/app/admin/analytics/page.tsx", adminAnalytics],
]) {
  if (compensatingTopSpacingPattern.test(source)) {
    fail(`${file} contains a compensating hero/title top spacing class`);
  }
}

const changedShellSources = [
  ["src/app/admin/layout.tsx", adminLayout],
  ["src/lib/admin-shell-spacing.ts", spacing],
];
for (const [file, source] of changedShellSources) {
  if (source.includes("AdminStatusBadge") || source.includes("truthState")) {
    fail(`${file} added visible truth/status UI to the shell spacing fix`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin shell spacing contract check passed.");
