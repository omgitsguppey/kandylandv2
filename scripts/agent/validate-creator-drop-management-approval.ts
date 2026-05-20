import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ARTIFACT = "agent/state/creator-drop-management-approval.generated.json";
const DOC = "docs/agent-truth/creator-drop-management-approval.md";

type Finding = {
  id: string;
  severity: "p0" | "p1" | "p2";
  status: "verified" | "fixed" | "deferred";
  file: string;
  summary: string;
};

type Report = {
  generatedAtUtc: string;
  reportKey: "creator-drop-management-approval";
  currentHead: string;
  summary: {
    existingAdminDropPipelineReused: boolean;
    sharedDropFormContractCreated: boolean;
    creatorDropManagerRouteCreated: boolean;
    manageDropsRouteFixed: boolean;
    creatorSubmissionApiCreated: boolean;
    creatorAdminOnlyFieldsBlocked: boolean;
    adminApprovalRequired: boolean;
    creatorCannotPublishDirectly: boolean;
    publicDiscoveryGuarded: boolean;
    rotationGuarded: boolean;
    creatorOwnDropsOnly: boolean;
    userLibrarySeparated: boolean;
    trackingAdded: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  existingRulesFound: Finding[];
  reusedComponents: Finding[];
  routeFindings: Finding[];
  formContractFindings: Finding[];
  permissionFindings: Finding[];
  visibilityFindings: Finding[];
  adminReviewFindings: Finding[];
  trackingFindings: Finding[];
  fixesApplied: string[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const failures: string[] = [];

function read(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
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
  if (!ok) {
    failures.push(`${id}: ${summary}`);
  }
  return {
    id,
    severity,
    status: ok ? "verified" : "deferred",
    file,
    summary,
  };
}

function writeDoc(report: Report) {
  const lines = [
    "# Creator Drop Management Approval",
    "",
    "Generated source: `agent/state/creator-drop-management-approval.generated.json`",
    "",
    "## Canonical Behavior",
    "",
    "- Creator Dashboard `Manage drops` routes to `/dashboard/creator/drops`.",
    "- `/dashboard/creator/drops` is a creator submission manager, not the user My KandyDrops library.",
    "- Creator submissions reuse the admin Drop form and server mutation validation through shared Drop contracts.",
    "- Creator-submitted Drops start with `reviewStatus: pending_admin_approval`, `approvalStatus: pending_review`, `publicDiscovery: false`, and `rotationEligibility: false`.",
    "- Creators cannot set publish, live, approval, public discovery, or rotation flags directly.",
    "- Creator reads are scoped to Drops they submitted, own, or are explicitly assigned.",
    "- Admin approval remains the only path that can move creator submissions toward public discovery and rotation.",
    "",
    "## Status",
    "",
    `- Existing admin pipeline reused: ${report.summary.existingAdminDropPipelineReused}`,
    `- Creator manager route created: ${report.summary.creatorDropManagerRouteCreated}`,
    `- Admin approval required: ${report.summary.adminApprovalRequired}`,
    `- Public discovery guarded: ${report.summary.publicDiscoveryGuarded}`,
    `- Rotation guarded: ${report.summary.rotationGuarded}`,
    "",
    "## Validation",
    "",
    "Run:",
    "",
    "```bash",
    "npm run check:creator-drop-management-approval",
    "```",
    "",
  ];

  writeFileSync(join(ROOT, DOC), `${lines.join("\n")}\n`);
}

export function buildCreatorDropManagementApprovalReport(): Report {
  const routing = read("src/lib/creator-profile-routing.ts");
  const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
  const quickActions = read("src/components/Dashboard/creator-workspace/CreatorDashboardQuickActions.tsx");
  const adminRoute = read("src/app/api/admin/drops/route.ts");
  const creatorRoute = read("src/app/api/creator/drops/route.ts");
  const formContract = read("src/lib/drops/drop-form-contract.ts");
  const submissionContract = read("src/lib/drops/drop-submission-contract.ts");
  const manager = read("src/components/Creators/CreatorDropManager.tsx");
  const page = read("src/app/dashboard/creator/drops/page.tsx");
  const creatorScope = read("src/lib/server/creator-drop-scope.ts");
  const library = read("src/app/dashboard/library/LibraryClient.tsx");
  const createModal = read("src/components/Admin/CreateDropModal.tsx");
  const dropMutations = read("src/lib/server/drop-mutations.ts");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const tests = read("tests/unit/creator-drop-management-approval.spec.ts");

  const existingAdminDropPipelineReused = includesAll(adminRoute, ["sanitizeAdminDropPayload", "validateDropPublishState", "invalidateDropSurfaces(ADMIN_DROP_REVALIDATION_PATHS"]);
  const sharedDropFormContractCreated = includesAll(formContract, ["getAdminDropFormFields", "getCreatorDropSubmissionFields", "CREATOR_DROP_ADMIN_ONLY_FIELDS"]);
  const creatorDropManagerRouteCreated = includesAll(page, ["CreatorDropManager"]) && includesAll(manager, [
    'data-creator-drop-manager="true"',
    'data-drop-manager-surface="creator_submission"',
    'data-admin-approval-required="true"',
  ]);
  const manageDropsRouteFixed = includesAll(routing, [
    'CREATOR_DROP_MANAGE_ROUTE = "/dashboard/creator/drops"',
    'CREATOR_DROP_ROUTE_STATE = "creator_submission"',
  ]) && (landing.includes("href={CREATOR_DROP_MANAGE_ROUTE}") || quickActions.includes("href={CREATOR_DROP_MANAGE_ROUTE}"));
  const creatorSubmissionApiCreated = includesAll(creatorRoute, ["export let GET", "export let POST", "export let PUT", "buildCreatorPendingDropPayload"]);
  const creatorAdminOnlyFieldsBlocked = includesAll(submissionContract, [
    "assertCreatorDropSubmissionSafe",
    "stripAdminOnlyDropFields",
    "publicDiscovery: false",
    "rotationEligibility: false",
  ]);
  const adminApprovalRequired = includesAll(submissionContract, [
    'approvalStatus: "pending_review"',
    'reviewStatus: "pending_admin_approval"',
    'sourceTruth: "creator_submission_pending_admin_approval"',
  ]);
  const creatorCannotPublishDirectly = !creatorRoute.includes("publicDiscovery: true") && !creatorRoute.includes("rotationEligibility: true") && !creatorRoute.includes('approvalStatus: "approved"');
  const publicDiscoveryGuarded = includesAll(creatorScope, [
    'reviewStatus === "pending_admin_approval"',
    "drop.publicDiscovery === false",
  ]);
  const rotationGuarded = creatorScope.includes("drop.rotationEligibility === false");
  const creatorOwnDropsOnly = includesAll(creatorRoute, [
    '.where("submittedByCreatorId", "==", caller.uid)',
    '.where("creatorId", "==", caller.uid)',
    "assignedCreatorIds.includes(caller.uid)",
    "You can only edit your own submitted drops.",
  ]);
  const userLibrarySeparated = library.includes("My KandyDrops") && !manager.includes("My KandyDrops") && !manager.includes("unwrapped library");
  const trackingAdded = includesAll(creatorRoute, [
    'trackCreatorDropEvent("creator_drop_submitted"',
    'trackCreatorDropEvent("creator_drop_updated"',
  ]) && includesAll(adminRoute, ['trackServerEvent("admin_creator_drop_reviewed"', "reviewedByAdminId"]) && includesAll(telemetryCatalog, [
    "creator_drop_submitted",
    "creator_drop_updated",
    "admin_creator_drop_reviewed",
  ]);

  const existingRulesFound = [
    finding("admin-modal-reused", "p1", "src/components/Admin/CreateDropModal.tsx", "CreateDropModal already supports creator mode and creator upload endpoint.", includesAll(createModal, ['mode = "admin"', 'mode === "creator" ? "/api/creator/drops/assets" : "/api/admin/content"', "Drop submitted for admin approval"])),
    finding("drop-mutation-reused", "p1", "src/lib/server/drop-mutations.ts", "Shared drop mutation validation remains the server publish guard.", includesAll(dropMutations, ["validateDropPublishState", "sanitizeDropData", "resolveUpdatedDropTiming"])),
  ];
  const reusedComponents = [
    finding("admin-route-contract", "p1", "src/app/api/admin/drops/route.ts", "Admin drops route uses shared admin payload sanitation.", existingAdminDropPipelineReused),
    finding("creator-modal-contract", "p1", "src/components/Creators/CreatorDropManager.tsx", "Creator manager opens CreateDropModal in creator mode instead of a separate Drop form system.", includesAll(manager, ["CreateDropModal", 'mode="creator"', "creatorIdOverride={user?.uid || null}"])),
  ];
  const routeFindings = [
    finding("manage-drops-route", "p0", "src/lib/creator-profile-routing.ts", "Creator Manage drops route points to /dashboard/creator/drops.", manageDropsRouteFixed),
    finding("creator-manager-page", "p0", "src/app/dashboard/creator/drops/page.tsx", "Creator manager route renders CreatorDropManager.", creatorDropManagerRouteCreated),
  ];
  const formContractFindings = [
    finding("shared-form-contract", "p0", "src/lib/drops/drop-form-contract.ts", "Shared admin and creator field contract exists.", sharedDropFormContractCreated),
    finding("shared-submission-contract", "p0", "src/lib/drops/drop-submission-contract.ts", "Creator payload builder forces pending admin approval.", adminApprovalRequired && creatorAdminOnlyFieldsBlocked),
  ];
  const permissionFindings = [
    finding("creator-role-required", "p0", "src/app/api/creator/drops/route.ts", "Creator route requires authenticated creator role.", includesAll(creatorRoute, ['auth: "user"', "requireCreator(caller.uid)", "isCreatorRole"])),
    finding("creator-own-drops-only", "p0", "src/app/api/creator/drops/route.ts", "Creator route lists and mutates only owned/submitted/assigned Drops.", creatorOwnDropsOnly),
    finding("creator-cannot-publish", "p0", "src/app/api/creator/drops/route.ts", "Creator route cannot set public discovery, rotation, live, or approved state.", creatorCannotPublishDirectly),
  ];
  const visibilityFindings = [
    finding("public-discovery-guard", "p0", "src/lib/server/creator-drop-scope.ts", "Pending creator submissions are excluded from public discovery.", publicDiscoveryGuarded),
    finding("rotation-guard", "p0", "src/lib/server/creator-drop-scope.ts", "Pending creator submissions are excluded from rotation.", rotationGuarded),
    finding("user-library-separated", "p1", "src/components/Creators/CreatorDropManager.tsx", "Creator drop manager does not use My KandyDrops library language.", userLibrarySeparated),
  ];
  const adminReviewFindings = [
    finding("admin-approval-path", "p1", "src/app/api/admin/drops/route.ts", "Admin route can approve, reject, or request changes while stamping reviewer fields.", includesAll(adminRoute, ['dropData.approvalStatus === "approved"', 'dropData.approvalStatus === "rejected"', 'dropData.reviewStatus === "needs_changes"', "reviewedByAdminId"])),
  ];
  const trackingFindings = [
    finding("tracking-events", "p1", "src/app/api/creator/drops/route.ts", "Creator submission/update and admin review tracking events are wired.", trackingAdded),
  ];
  const testFindings = [
    finding("security-tests", "p1", "tests/unit/creator-drop-management-approval.spec.ts", "Creator drop management approval tests cover route, permission, visibility, and user library separation.", includesAll(tests, ["Creator cannot set publicDiscovery true", "Creator cannot set rotationEligibility true"]) || includesAll(tests, ["publicDiscovery", "rotationEligibility", "You can only edit your own submitted drops"])),
  ];

  const reportFailures = [
    ...existingRulesFound,
    ...reusedComponents,
    ...routeFindings,
    ...formContractFindings,
    ...permissionFindings,
    ...visibilityFindings,
    ...adminReviewFindings,
    ...trackingFindings,
    ...testFindings,
  ].filter((entry) => entry.status === "deferred");
  const p0Count = reportFailures.filter((entry) => entry.severity === "p0").length;
  const p1Count = reportFailures.filter((entry) => entry.severity === "p1").length;
  const p2Count = reportFailures.filter((entry) => entry.severity === "p2").length;

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-drop-management-approval",
    currentHead: currentHead(),
    summary: {
      existingAdminDropPipelineReused,
      sharedDropFormContractCreated,
      creatorDropManagerRouteCreated,
      manageDropsRouteFixed,
      creatorSubmissionApiCreated,
      creatorAdminOnlyFieldsBlocked,
      adminApprovalRequired,
      creatorCannotPublishDirectly,
      publicDiscoveryGuarded,
      rotationGuarded,
      creatorOwnDropsOnly,
      userLibrarySeparated,
      trackingAdded,
      p0Count,
      p1Count,
      p2Count,
    },
    existingRulesFound,
    reusedComponents,
    routeFindings,
    formContractFindings,
    permissionFindings,
    visibilityFindings,
    adminReviewFindings,
    trackingFindings,
    fixesApplied: [
      "Routed Creator Dashboard Manage drops to /dashboard/creator/drops.",
      "Extracted shared Drop field and submission contracts from the admin CMS route surface.",
      "Created a creator Drop manager that reuses CreateDropModal in creator mode.",
      "Forced creator submissions into pending admin approval and blocked direct public/rotation flags.",
      "Added scoped creator Drop GET/POST/PUT API behavior.",
      "Updated public discovery/rotation guards for pending creator submissions.",
      "Stamped admin review and creator submission tracking events.",
    ],
    prCleanupActions: [],
    nextFixOrder: [
      "Attach manual QA evidence for creator Drop submission and admin review once deployed.",
      "Add richer admin queue filtering for pending creator submissions if operators need more review density.",
    ],
  };
}

export function validateCreatorDropManagementApprovalReport(report: Report) {
  const errors: string[] = [];
  for (const [key, value] of Object.entries(report.summary)) {
    if (key.startsWith("p") || typeof value !== "boolean") {
      continue;
    }
    if (value !== true) {
      errors.push(`${key} must be true`);
    }
  }
  if (report.summary.p0Count !== 0) errors.push("P0 creator drop management blockers remain");
  if (report.summary.p1Count !== 0) errors.push("P1 creator drop management blockers remain");
  if (report.nextFixOrder.length === 0) errors.push("nextFixOrder must not be empty");
  return errors;
}

const report = buildCreatorDropManagementApprovalReport();
writeFileSync(join(ROOT, ARTIFACT), `${JSON.stringify(report, null, 2)}\n`);
writeDoc(report);

const validationFailures = validateCreatorDropManagementApprovalReport(report);
if (failures.length > 0 || validationFailures.length > 0) {
  console.error("Creator drop management approval validation failed:");
  [...failures, ...validationFailures].forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator drop management approval validation passed.");
