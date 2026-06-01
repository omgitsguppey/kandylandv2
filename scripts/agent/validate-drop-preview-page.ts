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

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, banned: string, label: string) {
  if (source.includes(banned)) {
    failures.push(`${label} must not include "${banned}".`);
  }
}

const routePage = readRequired("src/app/drops/[id]/preview/page.tsx");
const routeLoading = readRequired("src/app/drops/[id]/preview/loading.tsx");
const previewClient = readRequired("src/components/Drops/LockedDropPreviewClient.tsx");
const previewView = readRequired("src/components/Drops/LockedDropPreviewView.tsx");
const previewTruth = readRequired("src/lib/locked-drop-preview-truth.ts");
const previewTelemetry = readRequired("src/lib/drop-preview-telemetry.ts");
const dropsPage = readRequired("src/app/drops/page.tsx");
const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const featuredCarousel = readRequired("src/components/FeaturedCarousel.tsx");
const libraryClient = readRequired("src/app/dashboard/library/LibraryClient.tsx");
const dropPreviewModal = readRequired("src/components/DropPreviewModal.tsx");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const mobileShellDoc = readRequired("docs/agent-truth/mobile-shell-safe-area.md");
const dropsDoc = readRequired("docs/agent-truth/drops-mobile-refinement.md");
const previewDoc = readRequired("docs/agent-truth/drop-preview-page.md");
const packageJson = readRequired("package.json");

requireIncludes(routePage, "toLockedDropPreviewSafeDrop", "Preview route safe field mapper");
requireIncludes(routePage, "getDrop(id)", "Preview route server drop read");
requireIncludes(routePage, "source_component", "Preview route source handoff");
requireIncludes(routeLoading + previewView, "100dvh", "Preview shell layout");
requireIncludes(previewView, "--user-mobile-bottom-nav-reserved-height", "Preview bottom-nav spacing");
requireIncludes(previewView, "data-drop-preview-page=\"true\"", "Preview debug marker");
requireIncludes(previewView, "data-drop-preview-urgency-tier", "Preview urgency marker");
requireIncludes(previewView, "data-drop-preview-cta-state", "Preview CTA marker");
requireIncludes(previewView, "data-drop-preview-social-proof-type", "Preview social proof marker");
requireIncludes(previewView, "data-safe-preview-fields-only=\"true\"", "Preview safe-fields marker");
requireIncludes(previewView, "bottom-[calc(var(--user-mobile-bottom-nav-reserved-height,0px)+0.75rem)]", "Preview sticky CTA clearance");

requireIncludes(previewTruth, "totalUnlocks > 10", "Preview social proof unwrap threshold");
requireIncludes(previewTruth, "getDropViewCount(drop)", "Preview social proof views fallback");
requireIncludes(previewTruth, "safePreviewFieldsOnly: true", "Preview truth safe-fields flag");
requireIncludes(previewTruth, "\"refill\"", "Preview insufficient-balance CTA state");
requireIncludes(previewTruth, "\"insufficient_softened\"", "Preview insufficient-balance cover state");
requireIncludes(previewTruth, "30 * DROP_COUNTDOWN_ONE_MINUTE_MS", "Preview critical urgency threshold");
requireIncludes(previewTruth, "4 * DROP_COUNTDOWN_ONE_HOUR_MS", "Preview urgent urgency threshold");
requireIncludes(previewTruth, "DROP_COUNTDOWN_ONE_DAY_MS", "Preview warm urgency threshold");

requireIncludes(previewClient, "drop_preview_page_viewed", "Preview page telemetry");
requireIncludes(previewClient, "drop_preview_cta_viewed", "Preview CTA telemetry");
requireIncludes(previewClient, "drop_preview_cta_clicked", "Preview CTA click telemetry");
requireIncludes(previewClient, "drop_preview_feedback_reacted", "Preview feedback telemetry");
requireIncludes(previewClient, "drop_preview_idle_reached", "Preview idle telemetry");
requireIncludes(previewClient, "drop_preview_closed_incomplete", "Preview incomplete close telemetry");
requireIncludes(previewClient, "drop_preview_unlock_success_state_viewed", "Preview success-state telemetry");
requireIncludes(previewClient, "drop_preview_open_library_clicked", "Preview library telemetry");
requireIncludes(previewClient, "drop_preview_keep_unwrapping_clicked", "Preview keep-unwrapping telemetry");
requireIncludes(previewTelemetry, "display_mode: getClientDisplayMode()", "Preview display-mode telemetry");

requireIncludes(previewView, "Refill to unwrap", "Preview shortfall CTA copy");
requireIncludes(previewClient, "openPurchaseModal(Math.max(1, truth.shortfallGd))", "Preview preferred refill amount");
requireIncludes(previewView, "Open in My KandyDrops", "Preview success primary CTA");
requireIncludes(previewView, "Keep Unwrapping", "Preview success secondary CTA");
requireIncludes(libraryClient, "useSearchParams", "Library query handoff");
requireIncludes(libraryClient, "router.replace(`/dashboard/viewer?id=${encodeURIComponent(targetDropId)}`)", "Library immediate deep-open");

requireIncludes(dropsPage, "normalizeLegacyPreviewDropId(params.drop)", "Legacy /drops?drop handoff");
requireIncludes(dropsPage, "redirect(`/drops/${encodeURIComponent(requestedDropId)}/preview?source_component=legacy_drop_query`)", "Legacy preview redirect");
requireIncludes(dropsClient, "router.push(`/drops/${encodeURIComponent(drop.id)}/preview?source_component=${encodeURIComponent(sourceComponent)}`)", "Drops client preview route navigation");
requireIncludes(dropCard, "onPreview(drop, \"compact_drop_card\")", "Drop card source handoff");
requireIncludes(featuredCarousel, "onSelectDrop(drop, \"compact_featured_carousel\")", "Featured source handoff");
requireNotIncludes(dropsClient, "DropPreviewModal", "Drops client modal ownership");
requireIncludes(dropPreviewModal, "Legacy fallback only", "DropPreviewModal deprecation marker");

for (const [source, label] of [
  [routePage + routeLoading + previewClient + previewView, "Preview page files"],
  [previewTruth, "Preview truth helper"],
] as const) {
  requireNotIncludes(source, "100vh", label);
  requireNotIncludes(source, "setInterval", label);
  requireNotIncludes(source, "onSnapshot", label);
  requireNotIncludes(source, "contentUrls", label);
  requireNotIncludes(source, "contentUrl", label);
  requireNotIncludes(source, "Thumbnails", label);
}

for (const eventName of [
  "drop_preview_page_viewed",
  "drop_preview_cta_viewed",
  "drop_preview_cta_clicked",
  "drop_preview_feedback_reacted",
  "drop_preview_idle_reached",
  "drop_preview_unlock_success_state_viewed",
  "drop_preview_open_library_clicked",
  "drop_preview_keep_unwrapping_clicked",
]) {
  requireIncludes(telemetryCatalog, eventName, "Telemetry catalog");
}

const doctrineNote = "Locked Drop preview is a dedicated full-page conversion surface, not a bottom sheet.";
requireIncludes(mobileShellDoc, doctrineNote, "Mobile shell doctrine");
requireIncludes(dropsDoc, doctrineNote, "Drops mobile doctrine");
requireIncludes(previewDoc, doctrineNote, "Drop preview doctrine");
requireIncludes(packageJson, "\"check:drop-preview-page\": \"tsx scripts/agent/validate-drop-preview-page.ts\"", "package.json");

if (failures.length > 0) {
  console.error("Drop preview page validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Drop preview page validation passed.");
