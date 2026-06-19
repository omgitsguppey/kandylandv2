import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ARTIFACT = "agent/state/creator-drop-manager-mobile-refinement.generated.json";
const DOC = "docs/agent-truth/creator-drop-manager-mobile-refinement.md";

type Finding = {
  id: string;
  severity: "p0" | "p1" | "p2";
  status: "verified" | "blocked";
  file: string;
  summary: string;
};

type Report = {
  generatedAtUtc: string;
  reportKey: "creator-drop-manager-mobile-refinement";
  currentHead: string;
  summary: {
    dependencyPresent: boolean;
    mobilePrimaryActionClear: boolean;
    formUsesSharedContract: boolean;
    adminOnlyFieldsHidden: boolean;
    approvalCopyClear: boolean;
    compactListEnabled: boolean;
    emptyStateCompact: boolean;
    bottomNavSafe: boolean;
    noUserLibraryLanguage: boolean;
    noComponentDuplication: boolean;
    trackingBounded: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  dependencyFindings: Finding[];
  uiFindings: Finding[];
  componentReuseFindings: Finding[];
  permissionFindings: Finding[];
  trackingFindings: Finding[];
  fixesApplied: string[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const readFailures: string[] = [];

function read(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) {
    readFailures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function currentHead() {
  return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function finding(id: string, severity: "p0" | "p1" | "p2", file: string, summary: string, ok: boolean): Finding {
  return {
    id,
    severity,
    status: ok ? "verified" : "blocked",
    file,
    summary,
  };
}

function writeDoc(report: Report) {
  const lines = [
    "# Creator Drop Manager Mobile Refinement",
    "",
    "Generated source: `agent/state/creator-drop-manager-mobile-refinement.generated.json`",
    "",
    "## Canonical Behavior",
    "",
    "- `/dashboard/creator/drops` remains the creator drop submission manager.",
    "- Creator Drop Manager uses the shared admin/creator Drop form contract and `CreateDropModal` in creator mode.",
    "- The mobile screen has one primary action: `Submit drop`.",
    "- Creator copy says `Submit for review`, not publish.",
    "- Creator submissions remain separated from My KandyDrops and require admin approval before public discovery or rotation.",
    "",
    "## Status",
    "",
    `- Dependency present: ${report.summary.dependencyPresent}`,
    `- Mobile primary action clear: ${report.summary.mobilePrimaryActionClear}`,
    `- Compact list enabled: ${report.summary.compactListEnabled}`,
    `- Admin-only fields hidden: ${report.summary.adminOnlyFieldsHidden}`,
    `- Bottom nav safe: ${report.summary.bottomNavSafe}`,
    "",
    "## Validation",
    "",
    "Run:",
    "",
    "```bash",
    "npm run check:creator-drop-manager-mobile-refinement",
    "```",
  ];

  writeFileSync(join(ROOT, DOC), `${lines.join("\n")}\n`);
}

export function buildCreatorDropManagerMobileRefinementReport(): Report {
  const page = read("src/app/dashboard/creator/drops/page.tsx");
  const manager = read("src/components/Creators/CreatorDropManager.tsx");
  const modal = read("src/components/Admin/CreateDropModal.tsx");
  const formContract = read("src/lib/drops/drop-form-contract.ts");
  const submissionContract = read("src/lib/drops/drop-submission-contract.ts");
  const creatorRoute = read("src/app/api/creator/drops/route.ts");
  const approvalValidator = read("scripts/agent/validate-creator-drop-management-approval.ts");
  const userLibrary = read("src/app/dashboard/library/LibraryClient.tsx");
  const testFile = read("tests/unit/creator-drop-manager-mobile-refinement.spec.ts");

  const dependencyPresent = includesAll(page, ["CreatorDropManager"])
    && includesAll(manager, ['data-creator-drop-manager="true"', "CreateDropModal", 'mode="creator"'])
    && includesAll(creatorRoute, ["buildCreatorPendingDropPayload", "sanitizeCreatorDropSubmission"])
    && includesAll(formContract, ["getCreatorDropSubmissionFields"])
    && includesAll(submissionContract, ["buildCreatorPendingDropPayload"])
    && approvalValidator.length > 0;
  const mobilePrimaryActionClear = includesAll(manager, [
    'data-mobile-primary-action="submit_drop"',
    "Submit drop",
    "Submit drops for review before they go live.",
  ]);
  const formUsesSharedContract = includesAll(manager, ["CreateDropModal", 'mode="creator"', "creatorIdOverride={user?.uid || null}"])
    && includesAll(formContract, ["getAdminDropFormFields", "getCreatorDropSubmissionFields"]);
  const adminOnlyFieldsHidden = includesAll(modal, ['mode === "admin" ? (', "Auto queue when expired"])
    && !modal.includes("publicDiscovery")
    && !modal.includes("rotationEligibility")
    && !modal.match(/Publish|Go live/u);
  const approvalCopyClear = includesAll(manager, ["Waiting on admin review", "Needs changes", "Approved", "Not approved"])
    && includesAll(modal, ["Submit drop for review", "Submit for review"])
    && !modal.includes("Submit For Approval");
  const compactListEnabled = includesAll(manager, [
    'data-creator-drop-status-filter="all"',
    'data-creator-drop-list-density="compact_rows"',
    "min-h-11",
    "h-14 w-14",
  ]);
  const emptyStateCompact = includesAll(manager, [
    'data-empty-state-density="compact"',
    "No drops submitted yet",
    "Create your first drop for review.",
    "py-6",
  ]) && !manager.includes("No creator drops submitted yet.");
  const bottomNavSafe = includesAll(manager, [
    'data-bottom-nav-safe="true"',
    "pb-[calc(env(safe-area-inset-bottom)+6rem)]",
  ]) && includesAll(modal, [
    'data-creator-drop-form-footer="mobile_safe"',
    "pb-[calc(env(safe-area-inset-bottom)+1rem)]",
  ]);
  const noUserLibraryLanguage = userLibrary.includes("My KandyDrops")
    && !manager.includes("My KandyDrops")
    && !manager.includes("unwrapped library");
  const noComponentDuplication = !existsSync(join(ROOT, "src/components/Creators/CreatorDropManagerMobile.tsx"))
    && !existsSync(join(ROOT, "src/components/Creators/CreatorCreateDropModal.tsx"))
    && !existsSync(join(ROOT, "src/components/Creators/CreateDropModal.tsx"));
  const trackingBounded = includesAll(manager, [
    'trackEvent("creator_drop_manager_opened"',
    'trackEvent("creator_drop_submission_started"',
  ]) && modal.includes('trackEvent("creator_drop_submit_failed"')
    && !manager.includes("setInterval(")
    && !manager.includes("setTimeout(");

  const dependencyFindings = [
    finding("dependency-present", "p0", "src/components/Creators/CreatorDropManager.tsx", "Creator drop manager dependency exists and still uses shared creator route/API/contracts.", dependencyPresent),
  ];
  const uiFindings = [
    finding("primary-action", "p1", "src/components/Creators/CreatorDropManager.tsx", "Mobile screen has one clear Submit drop action and concise review copy.", mobilePrimaryActionClear),
    finding("compact-list", "p1", "src/components/Creators/CreatorDropManager.tsx", "Status filters and drop rows use compact mobile density.", compactListEnabled),
    finding("compact-empty-state", "p2", "src/components/Creators/CreatorDropManager.tsx", "Empty state is compact and actionable.", emptyStateCompact),
    finding("bottom-nav-safe", "p1", "src/components/Creators/CreatorDropManager.tsx", "Manager and form footer include bottom safe-area spacing.", bottomNavSafe),
    finding("user-library-separated", "p0", "src/components/Creators/CreatorDropManager.tsx", "Creator drop manager does not render My KandyDrops or unwrapped library copy.", noUserLibraryLanguage),
  ];
  const componentReuseFindings = [
    finding("shared-contract", "p0", "src/components/Creators/CreatorDropManager.tsx", "Creator manager reuses CreateDropModal and shared Drop contracts.", formUsesSharedContract),
    finding("no-duplicate-manager", "p1", "src/components/Creators/CreatorDropManager.tsx", "No duplicate creator drop manager or cloned creator modal was introduced.", noComponentDuplication),
  ];
  const permissionFindings = [
    finding("creator-safe-copy", "p0", "src/components/Admin/CreateDropModal.tsx", "Creator form says submit for review and not publish.", approvalCopyClear),
    finding("admin-only-hidden", "p0", "src/components/Admin/CreateDropModal.tsx", "Creator mode does not expose admin queue/public rotation controls.", adminOnlyFieldsHidden),
  ];
  const trackingFindings = [
    finding("bounded-tracking", "p1", "src/components/Creators/CreatorDropManager.tsx", "Tracking is tied to screen open, form open, and submit failure without polling.", trackingBounded),
    finding("mobile-tests", "p1", "tests/unit/creator-drop-manager-mobile-refinement.spec.ts", "Focused mobile refinement tests cover CTA, compact rows, shared contract, admin-only hiding, and tracking.", includesAll(testFile, ["Submit for review", "data-creator-drop-list-density", "trackEvent"])),
  ];

  const blocked = [
    ...dependencyFindings,
    ...uiFindings,
    ...componentReuseFindings,
    ...permissionFindings,
    ...trackingFindings,
  ].filter((entry) => entry.status === "blocked");

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-drop-manager-mobile-refinement",
    currentHead: currentHead(),
    summary: {
      dependencyPresent,
      mobilePrimaryActionClear,
      formUsesSharedContract,
      adminOnlyFieldsHidden,
      approvalCopyClear,
      compactListEnabled,
      emptyStateCompact,
      bottomNavSafe,
      noUserLibraryLanguage,
      noComponentDuplication,
      trackingBounded,
      p0Count: blocked.filter((entry) => entry.severity === "p0").length,
      p1Count: blocked.filter((entry) => entry.severity === "p1").length,
      p2Count: blocked.filter((entry) => entry.severity === "p2").length,
    },
    dependencyFindings,
    uiFindings,
    componentReuseFindings,
    permissionFindings,
    trackingFindings,
    fixesApplied: [
      "Converted the creator drop manager header into a compact mobile-first command area.",
      "Added All/Drafts/Pending/Approved/Needs changes/Rejected compact filters.",
      "Reduced list rows and empty state spacing for mobile density.",
      "Changed creator form copy to Submit for review while preserving admin Create Drop behavior.",
      "Hid admin queue controls from creator mode.",
      "Added bounded user-action tracking for manager open, submission start, and submission failure.",
    ],
    prCleanupActions: [],
    nextFixOrder: [
      "Run deterministic UI source coverage for /dashboard/creator/drops; use browser reproduction only if it reports a concrete mobile drop-manager issue.",
      "Consider admin queue density refinements if pending creator submissions increase.",
    ],
  };
}

export function validateCreatorDropManagerMobileRefinementReport(report: Report) {
  const errors: string[] = [];
  for (const [key, value] of Object.entries(report.summary)) {
    if (key.startsWith("p") || typeof value !== "boolean") continue;
    if (!value) errors.push(`${key} must be true`);
  }
  if (report.summary.p0Count > 0) errors.push("P0 creator drop manager mobile blockers remain");
  if (report.summary.p1Count > 0) errors.push("P1 creator drop manager mobile blockers remain");
  if (report.nextFixOrder.length === 0) errors.push("nextFixOrder must not be empty");
  return errors;
}

const report = buildCreatorDropManagerMobileRefinementReport();
writeFileSync(join(ROOT, ARTIFACT), `${JSON.stringify(report, null, 2)}\n`);
writeDoc(report);

const validationFailures = validateCreatorDropManagerMobileRefinementReport(report);
if (readFailures.length > 0 || validationFailures.length > 0) {
  console.error("Creator drop manager mobile refinement validation failed:");
  [...readFailures, ...validationFailures].forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator drop manager mobile refinement validation passed.");
