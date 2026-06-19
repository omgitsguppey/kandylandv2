import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "p0" | "p1" | "p2";
type Finding = {
  id: string;
  status: "verified" | "missing";
  severity: Severity;
  file: string;
  summary: string;
};

export type CreatorPricingWiringReport = {
  generatedAtUtc: string;
  reportKey: "creator-pricing-wiring";
  currentHead: string;
  summary: {
    controlPlaneDependencyPresent: boolean;
    pricingResolverCreated: boolean;
    fanPassUsesResolver: boolean;
    requestsUseResolver: boolean;
    bookingsUseResolver: boolean;
    userFacingPanelUsesResolver: boolean;
    dashboardShowsPriceSource: boolean;
    paidOnlyPolicyPreserved: boolean;
    disabledFeaturesBlocked: boolean;
    protectedNavChatUntouched: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  dependencyFindings: Finding[];
  routeFindings: Finding[];
  uiFindings: Finding[];
  economyFindings: Finding[];
  fixesApplied: string[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const ARTIFACT = "agent/state/creator-pricing-wiring.generated.json";
const DOC = "docs/agent-truth/creator-pricing-wiring.md";

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

export function buildCreatorPricingWiringReport(): CreatorPricingWiringReport {
  const contract = read("src/lib/creator-settings/creator-settings-contract.ts");
  const resolver = read("src/lib/creator-settings/creator-pricing-resolver.ts");
  const subscriptionsRoute = read("src/app/api/creator/subscriptions/route.ts");
  const requestsRoute = read("src/app/api/creator/requests/route.ts");
  const bookingsRoute = read("src/app/api/creator/bookings/route.ts");
  const panel = read("src/components/Creators/CreatorExperiencesPanel.tsx");
  const dashboard = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
  const serverHelpers = read("src/lib/server/creator-experiences.ts");
  const packageJson = read("package.json");
  const changed = changedFiles();

  const controlPlaneDependencyPresent = includesAll(contract, ["CreatorSettingsControlPlane", "fanPassPriceGd", "callPriceGd"]);
  const pricingResolverCreated = includesAll(resolver, [
    "resolveCreatorFanPassPricing",
    "resolveCreatorRequestPricing",
    "resolveCreatorBookingPricing",
    "paidOnly: true",
    "legacy_default",
  ]);
  const fanPassUsesResolver = includesAll(subscriptionsRoute, ["resolveCreatorFanPassPricing", "fanPassPricing.priceGd", "priceSource: fanPassPricing.source"]);
  const requestsUseResolver = includesAll(requestsRoute, ["resolveCreatorRequestPricing", "requestPricing?.priceGd", "priceSource: requestPricing?.source"]);
  const bookingsUseResolver = includesAll(bookingsRoute, ["resolveCreatorBookingPricing", "bookingPricing.priceGd", "ratePerMinuteGd: bookingPricing.ratePerMinuteGd"]);
  const userFacingPanelUsesResolver = includesAll(panel, [
    "resolveCreatorPricing",
    "fanPassPriceGd",
    "data-fan-pass-price-source",
    "data-creator-experience-paid-only=\"true\"",
  ]) && !panel.includes("@ {CREATOR_BOOKING_RATES.phone} GD/min");
  const dashboardShowsPriceSource = includesAll(dashboard, ["resolveCreatorPricing", "data-creator-price-source", "Custom", "Default"]);
  const paidOnlyPolicyPreserved = includesAll(serverHelpers, ["purchasedOnly: true", "spendCreatorExperienceGumdrops"]) && [
    subscriptionsRoute,
    requestsRoute,
    bookingsRoute,
  ].every((source) => source.includes("spendCreatorExperienceGumdrops"));
  const disabledFeaturesBlocked = includesAll(resolver, ["fan_pass_disabled", "requests_disabled", "bookings_disabled"]) && includesAll(subscriptionsRoute, ["subscriptions_unavailable"]) && includesAll(requestsRoute, ["requests_unavailable"]) && includesAll(bookingsRoute, ["bookings_unavailable"]);
  const protectedNavChatUntouched = !changed.some((file) => file.includes("src/components/Navigation/") || file.includes("src/components/Chat/") || file.includes("src/app/chat/"));

  const dependencyFindings = [
    finding("control_plane_dependency", controlPlaneDependencyPresent, "p0", "src/lib/creator-settings/creator-settings-contract.ts", "Creator settings control plane dependency is present."),
    finding("package_script", packageJson.includes("check:creator-pricing-wiring"), "p1", "package.json", "Pricing wiring check script is registered."),
  ];
  const routeFindings = [
    finding("fan_pass_route", fanPassUsesResolver, "p0", "src/app/api/creator/subscriptions/route.ts", "Fan Pass purchase route uses creator pricing resolver."),
    finding("request_route", requestsUseResolver, "p0", "src/app/api/creator/requests/route.ts", "Request route uses creator pricing resolver."),
    finding("booking_route", bookingsUseResolver, "p0", "src/app/api/creator/bookings/route.ts", "Booking route uses creator pricing resolver."),
    finding("disabled_blocked", disabledFeaturesBlocked, "p0", "src/app/api/creator", "Disabled creator features stay blocked."),
  ];
  const uiFindings = [
    finding("resolver", pricingResolverCreated, "p0", "src/lib/creator-settings/creator-pricing-resolver.ts", "Canonical creator pricing resolver exists."),
    finding("public_panel", userFacingPanelUsesResolver, "p1", "src/components/Creators/CreatorExperiencesPanel.tsx", "Public creator experience panel uses resolver and source markers."),
    finding("dashboard_source", dashboardShowsPriceSource, "p1", "src/components/Creators/CreatorDashboardSettingsHub.tsx", "Creator dashboard shows custom/default price source."),
    finding("protected_nav_chat", protectedNavChatUntouched, "p0", "git diff --name-only", "Protected nav/chat surfaces are untouched."),
  ];
  const economyFindings = [
    finding("paid_only_policy", paidOnlyPolicyPreserved, "p0", "src/lib/server/creator-experiences.ts", "Paid creator experiences remain purchased-GumDrop only."),
  ];
  const allFindings = [...dependencyFindings, ...routeFindings, ...uiFindings, ...economyFindings];

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-pricing-wiring",
    currentHead: currentHead(),
    summary: {
      controlPlaneDependencyPresent,
      pricingResolverCreated,
      fanPassUsesResolver,
      requestsUseResolver,
      bookingsUseResolver,
      userFacingPanelUsesResolver,
      dashboardShowsPriceSource,
      paidOnlyPolicyPreserved,
      disabledFeaturesBlocked,
      protectedNavChatUntouched,
      p0Count: count(allFindings, "p0"),
      p1Count: count(allFindings, "p1"),
      p2Count: count(allFindings, "p2"),
    },
    dependencyFindings,
    routeFindings,
    uiFindings,
    economyFindings,
    fixesApplied: [
      "Added a shared creator pricing resolver for Fan Pass, request, booking, and broadcast lanes.",
      "Wired subscription, request, and booking routes through resolver-backed creator settings prices.",
      "Updated the public creator experiences panel to display resolver-backed price and source markers.",
      "Marked creator dashboard pricing as custom/default while preserving paid-GumDrop-only spend helpers.",
    ],
    prCleanupActions: ["No open PRs were present for creator pricing wiring."],
    nextFixOrder: allFindings.some((entry) => entry.status === "missing")
      ? allFindings.filter((entry) => entry.status === "missing").map((entry) => entry.id)
    : ["Run deterministic UI source coverage for Fan Pass/request/booking price surfaces; use browser reproduction only for concrete source-reported issues."],
  };
}

function writeReport(report: CreatorPricingWiringReport) {
  const artifactPath = join(ROOT, ARTIFACT);
  const docPath = join(ROOT, DOC);
  mkdirSync(dirname(artifactPath), { recursive: true });
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docPath, [
    "# Creator Pricing Wiring",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Control-plane dependency present: ${report.summary.controlPlaneDependencyPresent}`,
    `- Pricing resolver created: ${report.summary.pricingResolverCreated}`,
    `- Fan Pass route uses resolver: ${report.summary.fanPassUsesResolver}`,
    `- Request route uses resolver: ${report.summary.requestsUseResolver}`,
    `- Booking route uses resolver: ${report.summary.bookingsUseResolver}`,
    `- Public panel uses resolver: ${report.summary.userFacingPanelUsesResolver}`,
    `- Dashboard price source visible: ${report.summary.dashboardShowsPriceSource}`,
    `- Paid-only policy preserved: ${report.summary.paidOnlyPolicyPreserved}`,
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
  const report = buildCreatorPricingWiringReport();
  writeReport(report);
  const failures = report.summary.p0Count + report.summary.p1Count;
  if (failures > 0) {
    console.error(JSON.stringify(report.summary, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report.summary, null, 2));
}
