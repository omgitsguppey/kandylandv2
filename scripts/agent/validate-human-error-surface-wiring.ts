import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ARTIFACT = "agent/state/human-error-surface-wiring.generated.json";
const DOC = "docs/agent-truth/human-error-surface-wiring.md";

const wiredSurfaces = [
  "src/components/Creators/CreatorExperiencesPanel.tsx",
  "src/components/Creators/CreatorRequestsManager.tsx",
  "src/components/Creators/CreatorBookingsManager.tsx",
  "src/components/Creators/CreatorFanPassManager.tsx",
  "src/components/Creators/CreatorBroadcastManager.tsx",
  "src/components/PurchaseModal.tsx",
];

const deferredSurfaces = [
  "src/components/Drops/**",
  "src/app/drops/**",
  "src/components/Chat/ChatExperience.tsx",
  "src/app/creators/[username]/CreatorProfileClient.tsx",
];

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function fail(message: string): never {
  console.error(`[human-error-surface-wiring] ${message}`);
  process.exit(1);
}

function gitOutput(command: string) {
  return execSync(command, { cwd: ROOT, encoding: "utf8" }).trim();
}

if (!existsSync(join(ROOT, ARTIFACT))) fail(`missing ${ARTIFACT}`);
if (!existsSync(join(ROOT, DOC))) fail(`missing ${DOC}`);

const report = JSON.parse(read(ARTIFACT)) as {
  currentHead?: string;
  summary?: Record<string, unknown>;
  surfaces?: Array<{ path?: string; status?: string }>;
  deferredFindings?: unknown[];
  nextFixOrder?: unknown[];
};

if (typeof report.currentHead !== "string" || !/^[0-9a-f]{40}$/u.test(report.currentHead)) {
  fail(`artifact currentHead ${report.currentHead ?? "(missing)"} must be a full git SHA`);
}

for (const path of wiredSurfaces) {
  const source = read(path);
  if (!source.includes("HumanErrorNotice")) fail(`${path} does not use HumanErrorNotice`);
  if (!source.includes("resolveClientActionError")) fail(`${path} does not use resolveClientActionError`);
  if (/toast\.error\([^)]*error\.message/u.test(source)) fail(`${path} can toast raw error.message`);
  if (/>\s*\{\s*[^}]*error\.message[^}]*\}\s*</u.test(source)) fail(`${path} can render raw error.message`);
  if (source.includes("String(error)")) fail(`${path} can render String(error)`);
  if (/Internal server error|Something went wrong|Unknown error/u.test(source)) {
    fail(`${path} contains raw generic error copy`);
  }
}

const noticeSource = read("src/components/errors/HumanErrorNotice.tsx");
if (!noticeSource.includes("reward GumDrops added")) fail("bug reward copy must say reward GumDrops");
if (noticeSource.includes("purchased GumDrops added")) fail("bug reward copy must not say purchased GumDrops");

const changed = gitOutput("git diff --name-only HEAD").split(/\r?\n/u).filter(Boolean);
const phaseFiveAllowedAdminDebugFiles = new Set([
  "src/app/api/admin/debug/bug-reports/route.ts",
  "src/app/admin/debug/components/DebugBugReportSummary.tsx",
  "src/app/admin/debug/components/DebugTabAdvanced.tsx",
]);
const forbiddenChanged = changed.filter((path) => (
  !phaseFiveAllowedAdminDebugFiles.has(path) && (path.startsWith("src/app/api/admin/")
  || path.startsWith("src/app/admin/")
  || path.startsWith("src/components/Admin/")
  || path.startsWith("src/lib/server/admin-")
  || path.startsWith("src/lib/admin-")
  || path === "src/lib/gumdrop-source-of-funds.ts"
  || path === "src/lib/gumdrop-ledger.ts"
  || path.startsWith("src/app/api/paypal/")
  || path.includes("firebase.rules")
  || path.includes("firestore.rules")
  || path.startsWith("functions/")
  || path.startsWith("bigquery/"))
));
if (forbiddenChanged.length > 0) fail(`forbidden files changed: ${forbiddenChanged.join(", ")}`);

const surfacedPaths = new Set((report.surfaces ?? []).map((entry) => entry.path));
for (const path of wiredSurfaces) {
  if (!surfacedPaths.has(path)) fail(`artifact missing wired surface ${path}`);
}
for (const path of deferredSurfaces) {
  if (!JSON.stringify(report.deferredFindings ?? []).includes(path)) {
    fail(`artifact missing deferred surface ${path}`);
  }
}
if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) {
  fail("nextFixOrder must not be empty");
}

console.log("[human-error-surface-wiring] PASS");
