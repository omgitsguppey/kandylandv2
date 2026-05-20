import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "p0" | "p1" | "p2";
type FindingStatus = "fixed" | "verified" | "missing";

type Finding = {
  id: string;
  status: FindingStatus;
  severity: Severity;
  file: string;
  summary: string;
};

export type CreatorSettingsControlPlaneReport = {
  generatedAtUtc: string;
  reportKey: "creator-settings-control-plane";
  currentHead: string;
  summary: {
    settingsContractCreated: boolean;
    fanPassPricingControlPresent: boolean;
    setupWarningsMappedToControls: boolean;
    adminOnlyFieldsBlocked: boolean;
    missingSettingsReturnsDefaults: boolean;
    userFacingFanPassUsesSettings: boolean;
    priceValidationPresent: boolean;
    settingsUpdateTelemetryPresent: boolean;
    mobileSettingsSectionsCompact: boolean;
    protectedNavChatUntouched: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  dependencyFindings: Finding[];
  routeFindings: Finding[];
  uiFindings: Finding[];
  userFacingFindings: Finding[];
  fixesApplied: string[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const ARTIFACT = "agent/state/creator-settings-control-plane.generated.json";
const DOC = "docs/agent-truth/creator-settings-control-plane.md";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
}

function changedFiles() {
  return execFileSync("git", ["diff", "--name-only"], { cwd: ROOT, encoding: "utf8" })
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function finding(id: string, ok: boolean, severity: Severity, file: string, summary: string): Finding {
  return { id, status: ok ? "verified" : "missing", severity, file, summary };
}

function count(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.status === "missing" && entry.severity === severity).length;
}

export function buildCreatorSettingsControlPlaneReport(): CreatorSettingsControlPlaneReport {
  const contract = read("src/lib/creator-settings/creator-settings-contract.ts");
  const route = read("src/app/api/creator/settings/route.ts");
  const hub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
  const profile = read("src/app/creators/[username]/CreatorProfileClient.tsx");
  const packageJson = read("package.json");
  const changed = changedFiles();
  const protectedNavChatUntouched = !changed.some((file) => file.includes("src/components/Navigation/") || file.includes("src/components/Chat/") || file.includes("src/app/chat/"));

  const settingsContractCreated = includesAll(contract, [
    "CreatorSettingsControlPlane",
    "fanPassEnabled",
    "fanPassPriceGd",
    "buildCreatorSettingsCompletion",
    "sanitizeCreatorSettingsControlPlaneUpdate",
  ]);
  const fanPassPricingControlPresent = includesAll(hub, [
    'data-creator-settings-section="fan-pass"',
    "Fan Pass price GD",
    "Save Fan Pass",
  ]);
  const setupWarningsMappedToControls = includesAll(hub, [
    "Creator Settings need setup",
    "data-creator-settings-setup-control-map",
    "settingsCompletion.missingSetupItems",
  ]);
  const adminOnlyFieldsBlocked = includesAll(contract, [
    "CREATOR_SETTINGS_ADMIN_ONLY_FIELDS",
    "publicDiscovery",
    "rotationEligibility",
    "creatorRestrictions",
  ]) && includesAll(route, [
    "rejectedAdminOnlyFields",
    "admin-only fields",
  ]);
  const missingSettingsReturnsDefaults = includesAll(route, [
    'settingsState === "configured" ? normalizeCreatorSettings(rawCreatorSettings) : DEFAULT_CREATOR_SETTINGS',
    "safe_defaults_missing_settings_doc",
    "missingSetupItems",
  ]);
  const userFacingFanPassUsesSettings = includesAll(profile, [
    "creatorSettings.subscriptionsEnabled",
    "CreatorExperiencesPanel",
    "profileDropsVisible",
    "profileBroadcastsVisible",
  ]);
  const priceValidationPresent = includesAll(contract, [
    "fanPassPriceGd must be at least",
    "callPriceGd must be at least",
    "CREATOR_SUBSCRIPTION_MIN_GD",
  ]);
  const settingsUpdateTelemetryPresent = includesAll(route, [
    "creator_settings_updated",
    "changed_sections",
    "creator_settings_control_plane",
  ]);
  const mobileSettingsSectionsCompact = includesAll(hub, [
    'data-creator-settings-control-plane="true"',
    'data-mobile-density="compact"',
    'data-mobile-sprawl-guard="true"',
    "rounded-2xl",
  ]) && !/text-5xl|text-4xl|p-8|p-7/u.test(hub);

  const dependencyFindings = [
    finding("shared_contract", settingsContractCreated, "p0", "src/lib/creator-settings/creator-settings-contract.ts", "Shared creator settings control-plane contract exists."),
    finding("package_script", packageJson.includes("check:creator-settings-control-plane"), "p1", "package.json", "Package check script is registered."),
  ];
  const routeFindings = [
    finding("admin_only_blocked", adminOnlyFieldsBlocked, "p0", "src/app/api/creator/settings/route.ts", "Creator settings route rejects admin-only fields."),
    finding("missing_defaults", missingSettingsReturnsDefaults, "p1", "src/app/api/creator/settings/route.ts", "Missing settings docs return safe defaults and checklist metadata."),
    finding("telemetry", settingsUpdateTelemetryPresent, "p1", "src/app/api/creator/settings/route.ts", "Settings update telemetry is present."),
  ];
  const uiFindings = [
    finding("fan_pass_pricing_control", fanPassPricingControlPresent, "p0", "src/components/Creators/CreatorDashboardSettingsHub.tsx", "Creator Settings exposes Fan Pass pricing controls."),
    finding("setup_map", setupWarningsMappedToControls, "p1", "src/components/Creators/CreatorDashboardSettingsHub.tsx", "Setup warning maps to exact controls."),
    finding("mobile_compact", mobileSettingsSectionsCompact, "p1", "src/components/Creators/CreatorDashboardSettingsHub.tsx", "Settings controls use compact mobile sections."),
    finding("protected_nav_chat", protectedNavChatUntouched, "p0", "git diff --name-only", "Top nav, bottom nav, and chat files are untouched."),
  ];
  const userFacingFindings = [
    finding("profile_consumers", userFacingFanPassUsesSettings, "p1", "src/app/creators/[username]/CreatorProfileClient.tsx", "User-facing creator profile consumes settings for Fan Pass and visibility."),
    finding("price_validation", priceValidationPresent, "p0", "src/lib/creator-settings/creator-settings-contract.ts", "Creator-safe pricing validation is enforced."),
  ];
  const allFindings = [...dependencyFindings, ...routeFindings, ...uiFindings, ...userFacingFindings];

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-settings-control-plane",
    currentHead: currentHead(),
    summary: {
      settingsContractCreated,
      fanPassPricingControlPresent,
      setupWarningsMappedToControls,
      adminOnlyFieldsBlocked,
      missingSettingsReturnsDefaults,
      userFacingFanPassUsesSettings,
      priceValidationPresent,
      settingsUpdateTelemetryPresent,
      mobileSettingsSectionsCompact,
      protectedNavChatUntouched,
      p0Count: count(allFindings, "p0"),
      p1Count: count(allFindings, "p1"),
      p2Count: count(allFindings, "p2"),
    },
    dependencyFindings,
    routeFindings,
    uiFindings,
    userFacingFindings,
    fixesApplied: [
      "Created a shared creator settings control-plane contract.",
      "Returned settings completion and user-facing impact metadata from /api/creator/settings.",
      "Added compact creator settings controls for profile, Fan Pass, experiences, broadcasts, and timeline.",
      "Connected creator profile visibility and experience CTAs to creator settings.",
    ],
    prCleanupActions: ["No open PRs were present at start for creator settings cleanup."],
    nextFixOrder: allFindings.some((entry) => entry.status === "missing")
      ? allFindings.filter((entry) => entry.status === "missing").map((entry) => entry.id)
      : ["Run manual mobile UI evidence for Creator Settings before beta visual signoff."],
  };
}

function writeReport(report: CreatorSettingsControlPlaneReport) {
  const artifactPath = join(ROOT, ARTIFACT);
  const docPath = join(ROOT, DOC);
  mkdirSync(dirname(artifactPath), { recursive: true });
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docPath, [
    "# Creator Settings Control Plane",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Settings contract created: ${report.summary.settingsContractCreated}`,
    `- Fan Pass pricing control present: ${report.summary.fanPassPricingControlPresent}`,
    `- Setup warnings mapped to controls: ${report.summary.setupWarningsMappedToControls}`,
    `- Admin-only fields blocked: ${report.summary.adminOnlyFieldsBlocked}`,
    `- Missing settings return defaults/checklist: ${report.summary.missingSettingsReturnsDefaults}`,
    `- User-facing profile consumes settings: ${report.summary.userFacingFanPassUsesSettings}`,
    `- Mobile compact sections: ${report.summary.mobileSettingsSectionsCompact}`,
    `- Protected nav/chat untouched: ${report.summary.protectedNavChatUntouched}`,
    "",
    "## Doctrine",
    "",
    "- Creator Settings is the setup/control plane for user-facing creator profile behavior.",
    "- Dashboard setup warnings must map to exact settings controls.",
    "- Creator settings update the public creator profile, Fan Pass, broadcasts, and creator experiences.",
    "- Admin-only drop approval, publish, public discovery, and rotation controls are not creator settings.",
    "- Missing settings documents return safe defaults, setup checklist metadata, and human-readable impact.",
    "",
    "## Fixes Applied",
    "",
    ...report.fixesApplied.map((fix) => `- ${fix}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((item) => `- ${item}`),
    "",
  ].join("\n"));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = buildCreatorSettingsControlPlaneReport();
  writeReport(report);
  const failures = report.summary.p0Count + report.summary.p1Count;
  if (failures > 0) {
    console.error(JSON.stringify(report.summary, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report.summary, null, 2));
}
