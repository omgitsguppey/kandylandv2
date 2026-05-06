import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include ${needle}`);
  }
}

function requireNotIncludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include ${needle}`);
  }
}

const page = read("src/app/admin/roster/page.tsx");
const panel = read("src/components/Admin/CreatorFanExperienceSettingsPanel.tsx");
const fields = read("src/components/Admin/CreatorFanExperienceSettingsFields.tsx");
const helper = read("src/lib/admin/creator-fan-experience-settings.ts");
const route = read("src/app/api/admin/creator-fan-experience-settings/route.ts");
const creatorExperiences = read("src/lib/creator-experiences.ts");
const fanPanel = read("src/components/Creators/CreatorExperiencesPanel.tsx");
const decisionQueue = read("src/app/admin/roster/decision-queue.ts");
const creatorOnboarding = read("src/lib/creator-onboarding.ts");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const routeRuntime = read("src/lib/route-runtime-health.ts");
const packageJson = read("package.json");
const docs = read("docs/agent-truth/creator-fan-experience-settings.md");
const accountDocs = read("docs/agent-truth/admin-creator-account-controls.md");
const routeTests = read("tests/unit/admin-creator-fan-experience-settings-route.spec.ts");
const experienceTests = read("tests/unit/creator-experiences.spec.ts");
const fanPanelTests = read("tests/unit/creator-experiences-panel.spec.tsx");
const rosterTests = read("tests/unit/admin-roster-decision-queue.spec.ts");
const fullAudit = read("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = read("REPO_MEMORY_LEDGER.md");
const checklist = read("EVERY_FILE_FUNCTION_CHECKLIST.md");

[
  "Fan experience settings",
  "CreatorFanExperienceSettingsPanel",
  "fan_experience_settings: false",
  "handleFanExperienceSettingsSubmit",
  "/api/admin/creator-fan-experience-settings",
  "creatorSettingsSource",
  "settingsNormalized",
  "settingsValidationWarnings",
  "lastSettingsUpdatedAt",
  "changedKeys",
].forEach((needle) => requireIncludes(page, needle, "admin roster page"));

[
  "CreatorFanExperienceSettingsFields",
  "Save fan experience settings",
  "min-h-11",
].forEach((needle) => requireIncludes(panel, needle, "fan experience settings panel"));

[
  "Access toggles",
  "Pricing",
  "Requests",
  "Availability",
  "Restrictions",
  "Fan Pass",
  "Private chat",
  "Custom requests",
  "Live time",
  "Payouts paused",
  "Confirm that one or more creator earning lanes may be paused.",
  "min-h-11",
].forEach((needle) => requireIncludes(fields, needle, "fan experience settings fields"));

[
  "messagingEnabled",
  "subscriptionPriceGd",
  "phoneRatePerMinuteGd",
  "bookingMinimumMinutes",
].forEach((needle) => requireNotIncludes(fields.replaceAll(`"${needle}"`, ""), `>${needle}<`, "fan settings visible labels"));

[
  "type CreatorFanExperienceSettingsCommand",
  "CreatorSettings",
  "CreatorRestrictions",
  "CREATOR_BOOKING_MIN_MINUTES",
  "CREATOR_BOOKING_RATES",
  "CREATOR_SUBSCRIPTION_MIN_GD",
  "parseCreatorFanExperienceSettingsCommand",
  "validateCreatorFanExperienceSettingsCommand",
  "Confirm revenue restrictions before saving.",
  "must end after it starts",
  "formatCreatorFanExperienceSettingLabel",
].forEach((needle) => requireIncludes(helper, needle, "fan settings helper"));

[
  "CreatorSettings",
  "CreatorRestrictions",
  "buildDefaultCreatorFanExperienceSettings",
  "CREATOR_FAN_EXPERIENCE_SETTINGS_SCHEMA_VERSION",
  "CREATOR_DEFAULT_BOOKING_UNAVAILABLE_REASON",
  "normalizeCreatorSettings",
  "normalizeCreatorRestrictions",
].forEach((needle) => requireIncludes(creatorExperiences, needle, "creator experiences canonical model"));

[
  "bookingsEnabled: false",
  "availabilityWindows: []",
  "schemaVersion",
  "normalizedBy",
  "defaultSettingsProvenance",
  "provenance",
  "creator_availability_not_configured",
  "doesNotChangeApproval: true",
].forEach((needle) => requireIncludes(creatorExperiences, needle, "creator default fan experience settings builder"));

[
  "auth: \"admin\"",
  "requireTrustedOrigin: true",
  "buildAdminOnBehalfMarker",
  "surface: \"creator_experiences\"",
  "performedAs: \"admin_on_behalf\"",
  "creatorSettings: command.creatorSettings",
  "creatorRestrictions: command.creatorRestrictions",
  "creator_experience_settings_updated",
  "creator_restrictions_updated",
].forEach((needle) => requireIncludes(route, needle, "fan settings route"));

[
  "admin_creator_experience_settings_opened",
  "admin_creator_experience_settings_saved",
  "admin_creator_experience_lane_toggled",
  "admin_creator_experience_pricing_updated",
  "admin_creator_experience_restriction_updated",
].forEach((eventName) => {
  requireIncludes(telemetryCatalog, eventName, "telemetry catalog");
});

requireIncludes(route, "trackServerEvent(\"admin_creator_experience_settings_saved\"", "fan settings saved telemetry");
requireIncludes(route, "trackServerEvent(\"admin_creator_experience_restriction_updated\"", "fan restriction telemetry");
requireIncludes(page, "admin_creator_experience_settings_opened", "fan settings opened telemetry");
requireIncludes(decisionQueue, "\"fan_experience_settings\"", "roster detail section registry");
requireIncludes(creatorOnboarding, "\"creator_experience_settings_updated\"", "creator onboarding history registry");
requireIncludes(creatorOnboarding, "\"creator_restrictions_updated\"", "creator onboarding history registry");
requireIncludes(fanPanel, "phoneRatePerMinute", "CreatorExperiencesPanel must read stored phone rate");
requireIncludes(fanPanel, "videoRatePerMinute", "CreatorExperiencesPanel must read stored video rate");
requireIncludes(routeRuntime, "admin/creator-fan-experience-settings:POST", "route runtime health");

requireNotIncludes(route, "clientBalance", "fan settings route");
requireNotIncludes(route, "parallelCreatorSettings", "fan settings route");
requireNotIncludes(helper, "ParallelCreatorSettings", "fan settings helper");

[
  "admin settings update persists valid settings",
  "invalid pricing rejected",
  "restriction update audited",
  "telemetry includes targetUserId",
].forEach((needle) => requireIncludes(routeTests, needle, "fan settings route tests"));
requireIncludes(experienceTests, "keeps creator settings at defaults and minimums", "creator experiences tests");
requireIncludes(fanPanelTests, "reflects updated creator settings", "fan panel tests");
requireIncludes(rosterTests, "fan_experience_settings", "roster decision queue tests");

requireIncludes(packageJson, "check:creator-fan-experience-settings", "package scripts");
requireIncludes(docs, "CreatorSettings", "fan settings docs");
requireIncludes(accountDocs, "Fan experience settings", "account controls docs");
requireIncludes(fullAudit, "Creator Fan Experience Settings Controls", "full audit ledger");
requireIncludes(repoLedger, "Creator fan experience settings", "repo memory ledger");
requireIncludes(checklist, "Creator Fan Experience Settings Coverage", "file checklist");

if (failures.length > 0) {
  console.error("Creator fan experience settings validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator fan experience settings validation passed.");
