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

function requireExcludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const discoveryTelemetry = readRequired("src/lib/discovery-telemetry.ts");
const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const dropGrid = readRequired("src/components/DropGrid.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const dropImpressionHook = readRequired("src/hooks/useDropCardImpression.ts");
const featuredCarousel = readRequired("src/components/FeaturedCarousel.tsx");
const creatorRail = readRequired("src/components/CreatorDiscoveryRail.tsx");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const telemetrySafety = readRequired("src/lib/analytics/telemetry-safety.ts");
const behavioralNormalizer = readRequired("src/lib/behavioral/normalize-event-fact.ts");
const telemetryContracts = readRequired("tests/contracts/telemetry-contracts.spec.ts");
const discoveryTests = readRequired("tests/unit/discovery-telemetry.spec.ts");

if (packageJson.scripts?.["check:discovery-tracking-truth"] !== "tsx scripts/agent/validate-discovery-tracking-truth.ts") {
  failures.push("package.json must expose check:discovery-tracking-truth.");
}

requireIncludes(discoveryTelemetry, "DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD = 0.6", "Discovery telemetry helper");
requireIncludes(discoveryTelemetry, "sanitizeDiscoveryQuery", "Discovery telemetry helper");
requireIncludes(discoveryTelemetry, "buildDiscoveryImpressionKey", "Discovery telemetry helper");
requireIncludes(discoveryTelemetry, "[redacted_email]", "Discovery telemetry helper query sanitizer");
requireIncludes(discoveryTelemetry, "[redacted_phone]", "Discovery telemetry helper query sanitizer");

requireIncludes(dropImpressionHook, "IntersectionObserver", "Drop card impression hook");
requireIncludes(dropImpressionHook, "DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD", "Drop card impression hook");
requireIncludes(dropImpressionHook, "buildDiscoveryImpressionKey", "Drop card impression hook");
requireIncludes(dropImpressionHook, 'trackEvent("drop_card_impression"', "Drop card impression hook");
requireIncludes(dropImpressionHook, "impression_session_id", "Drop card impression hook");
requireIncludes(dropImpressionHook, "surface: impressionTrackingSurface", "Drop card impression hook");
requireIncludes(dropImpressionHook, "position: impressionTrackingPosition", "Drop card impression hook");
requireIncludes(dropCard, "impressionTrackingPosition", "DropCard");
requireIncludes(dropGrid, "impressionTrackingPosition={index + 1}", "DropGrid");

requireIncludes(dropsClient, "sanitizeDiscoveryQuery", "DropsClient");
requireIncludes(dropsClient, "resolveDropsDiscoverySort", "DropsClient");
requireIncludes(dropsClient, 'trackEvent("drops_searched"', "DropsClient");
requireIncludes(dropsClient, "query_sanitized", "DropsClient");
requireIncludes(dropsClient, "category: selectedCategory", "DropsClient search telemetry");
requireIncludes(dropsClient, "sort: discoverySort", "DropsClient search telemetry");
requireIncludes(dropsClient, 'trackEvent("drops_category_selected"', "DropsClient category telemetry");

requireIncludes(featuredCarousel, "isCarouselVisible", "Featured carousel viewport gating");
requireIncludes(featuredCarousel, 'trackEvent("featured_slide_viewed"', "Featured carousel view telemetry");
requireIncludes(featuredCarousel, 'trackEvent("featured_slide_clicked"', "Featured carousel click telemetry");
requireIncludes(featuredCarousel, "position", "Featured carousel position telemetry");
requireIncludes(featuredCarousel, "impression_session_id", "Featured carousel session telemetry");
requireIncludes(featuredCarousel, "buildDiscoveryImpressionKey", "Featured carousel dedupe");
requireExcludes(featuredCarousel, 'trackEvent("featured_drop_viewed"', "Featured carousel legacy view telemetry");
requireExcludes(featuredCarousel, 'trackEvent("featured_drop_clicked"', "Featured carousel legacy click telemetry");

requireIncludes(creatorRail, "IntersectionObserver", "Creator rail viewport gating");
requireIncludes(creatorRail, 'trackEvent("creator_rail_impression"', "Creator rail impression telemetry");
requireIncludes(creatorRail, "creator_id: creatorId", "Creator rail creator id telemetry");
requireIncludes(creatorRail, "target_creator_id: creatorId", "Creator rail target creator telemetry");
requireIncludes(creatorRail, "data-creator-rail-position", "Creator rail position marker");
requireIncludes(creatorRail, "buildDiscoveryImpressionKey", "Creator rail dedupe");
requireExcludes(creatorRail, 'trackEvent("creator_spotlight_viewed"', "Creator rail legacy render telemetry");

requireIncludes(telemetryCatalog, 'eventName: "featured_slide_viewed"', "Telemetry catalog featured slide viewed");
requireIncludes(telemetryCatalog, 'aliases: ["featured_drop_viewed"]', "Telemetry catalog featured viewed alias");
requireIncludes(telemetryCatalog, 'eventName: "featured_slide_clicked"', "Telemetry catalog featured slide clicked");
requireIncludes(telemetryCatalog, 'aliases: ["featured_drop_clicked"]', "Telemetry catalog featured clicked alias");
requireIncludes(telemetryCatalog, 'eventName: "creator_rail_impression"', "Telemetry catalog creator rail impression");
requireIncludes(telemetryCatalog, 'aliases: ["creator_spotlight_viewed"]', "Telemetry catalog creator rail alias");
requireIncludes(telemetryCatalog, 'eventName === "drops_searched" || eventName === "drops_category_selected"', "Telemetry catalog discovery filter contract");
requireIncludes(telemetrySafety, '"impression_session_id"', "Telemetry safety discovery priority fields");
requireIncludes(telemetrySafety, '"position"', "Telemetry safety discovery priority fields");
requireIncludes(telemetrySafety, '"query"', "Telemetry safety discovery priority fields");
requireIncludes(telemetrySafety, '"sort"', "Telemetry safety discovery priority fields");

requireIncludes(behavioralNormalizer, 'featured_slide_clicked: { normalizedAction: "drop_card_viewed"', "Behavioral normalizer featured click");
requireIncludes(behavioralNormalizer, 'creator_rail_impression: { normalizedAction: "creator_spotlight_viewed"', "Behavioral normalizer creator rail");
requireIncludes(telemetryContracts, 'normalizeTelemetryEventName("featured_drop_clicked")).toBe("featured_slide_clicked")', "Telemetry contract featured alias");
requireIncludes(discoveryTests, "sanitizeDiscoveryQuery", "Discovery helper tests");

if (failures.length > 0) {
  console.error("Discovery tracking truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Discovery tracking truth validator passed.");
