import { readFileSync } from "node:fs";
import { join } from "node:path";

type Guard = {
    id: string;
    file: string;
    pattern: RegExp;
    forbidden?: boolean;
    legacy?: boolean;
    description: string;
};

const repoRoot = process.cwd();

// These components have no current route entrypoint. Keep their existing
// safeguards while other compatibility validators still consume them;
// their checks do not establish coverage of the actual homepage runtime.
const legacyComponentFiles = new Set([
    "src/components/Hero.tsx",
    "src/components/HomeDropTicker.tsx",
    "src/components/Landing/HowItWorks.tsx",
    "src/components/Landing/HomeActiveDropsCarousel.tsx",
]);

const guards: Guard[] = [
    { id: "home-route-current-composition", file: "src/app/page.tsx", pattern: /PublicHomeExperience/, description: "homepage route uses its actual public composition owner" },
    { id: "public-home-server-composition", file: "src/components/Landing/PublicHomeExperience.tsx", pattern: /["']use client["']/, forbidden: true, description: "homepage composition remains server rendered" },
    { id: "public-home-critical-action", file: "src/components/Landing/PublicHomeExperience.tsx", pattern: /PublicHomeActions/, description: "homepage primary action stays in the critical composition" },
    { id: "public-home-single-style-owner", file: "src/components/Landing/PublicHomeExperience.tsx", pattern: /<style\b/, forbidden: true, description: "homepage does not override shared controls through descendant styles" },
    { id: "public-home-actions-identity", file: "src/components/Landing/PublicHomeActions.tsx", pattern: /useAuthIdentity/, description: "actual homepage action reads split identity" },
    { id: "public-home-actions-loading", file: "src/components/Landing/PublicHomeActions.tsx", pattern: /useAuthLoading/, description: "actual homepage action reads account loading truth" },
    { id: "public-home-actions-context", file: "src/components/Landing/PublicHomeActions.tsx", pattern: /useUIActions/, description: "actual homepage action avoids modal-state subscriptions" },
    { id: "public-home-actions-canonical-cta", file: "src/components/Landing/PublicHomeActions.tsx", pattern: /trackEvent\("hero_cta_clicked"/, description: "actual homepage action retains its canonical CTA telemetry owner" },
    { id: "homeclient-split-auth-identity", file: "src/app/HomeClient.tsx", pattern: /useAuthIdentity/, description: "homepage redirect reads identity from split auth context" },
    { id: "homeclient-split-auth-loading", file: "src/app/HomeClient.tsx", pattern: /useAuthLoading/, description: "homepage redirect reads loading from split auth context" },
    { id: "homeclient-split-profile", file: "src/app/HomeClient.tsx", pattern: /useUserProfile/, description: "homepage redirect reads profile from split profile context" },
    { id: "homeclient-page-view-idempotent", file: "src/app/HomeClient.tsx", pattern: /trackedHomeViewRef/, description: "homepage page-view event is emitted once per mount" },
    { id: "homeclient-redirect-idempotent", file: "src/app/HomeClient.tsx", pattern: /redirectPathRef/, description: "signed-in redirect is idempotent" },
    { id: "homeclient-transition-redirect", file: "src/app/HomeClient.tsx", pattern: /startTransition[\s\S]*router\.replace/, description: "signed-in redirect is scheduled as a transition" },
    { id: "ui-actions-context-export", file: "src/context/UIContext.tsx", pattern: /export function useUIActions/, description: "modal actions are available without subscribing to modal state" },
    { id: "ui-actions-stable-open-auth", file: "src/context/UIContext.tsx", pattern: /const openAuthModal = useCallback/, description: "auth modal action identity is stable" },
    { id: "ui-actions-provider", file: "src/context/UIContext.tsx", pattern: /UIActionsContext\.Provider/, description: "UI action context provider is mounted" },
    { id: "layout-split-auth-identity", file: "src/components/CoreLayoutWrapper.tsx", pattern: /useAuthIdentity/, description: "core shell avoids full auth context for identity" },
    { id: "layout-split-auth-profile", file: "src/components/CoreLayoutWrapper.tsx", pattern: /useUserProfile/, description: "core shell avoids full auth context for profile" },
    { id: "layout-homepage-idle-telemetry", file: "src/components/CoreLayoutWrapper.tsx", pattern: /const homepageIdleLaneReady = useDeferredClientReady\(\{[^}]*enabled: isHomeRoute[^}]*idle: true[^}]*\}\);[\s\S]*telemetryReady = isHomeRoute \? homepageIdleLaneReady : afterPaintLaneReady/, description: "homepage deep telemetry uses the enabled idle lane" },
    { id: "deeptracker-batched-persist", file: "src/components/Analytics/DeepTracker.tsx", pattern: /persistQueueSoon/, description: "deep telemetry batches sessionStorage writes" },
    { id: "deeptracker-visible-interval", file: "src/components/Analytics/DeepTracker.tsx", pattern: /document\.visibilityState !== "visible"/, description: "deep telemetry interval pauses while hidden" },
    { id: "diagnostics-idle-schedule", file: "src/components/HomepageRuntimeDiagnostics.tsx", pattern: /scheduleHomepageIdle/, description: "homepage runtime observers start after idle" },
    { id: "diagnostics-section-raf", file: "src/components/HomepageRuntimeDiagnostics.tsx", pattern: /requestAnimationFrame\(flushEntries\)/, description: "section collapse observer batches with RAF" },
    { id: "diagnostics-layout-dedupe", file: "src/components/HomepageRuntimeDiagnostics.tsx", pattern: /let cumulativeShift = 0/, description: "layout-shift diagnostics accumulate and dedupe" },
    { id: "diagnostics-longtask", file: "src/components/HomepageRuntimeDiagnostics.tsx", pattern: /observeHomepageLongTasks/, description: "homepage long tasks are tracked" },
    { id: "diagnostics-input-delay", file: "src/components/HomepageRuntimeDiagnostics.tsx", pattern: /observeHomepageInputDelay/, description: "homepage input delay is tracked" },
    { id: "diagnostics-unavailable-visible", file: "src/components/HomepageRuntimeDiagnostics.tsx", pattern: /Homepage runtime observer unavailable/, description: "unsupported diagnostics are visible as partial" },
    { id: "carousel-actions-context", file: "src/components/Landing/HomeActiveDropsCarousel.tsx", pattern: /useUIActions/, description: "carousel auth CTA avoids modal-state subscription" },
    { id: "carousel-intersection-pause", file: "src/components/Landing/HomeActiveDropsCarousel.tsx", pattern: /IntersectionObserver/, description: "carousel autoplay pauses offscreen" },
    { id: "carousel-visibility-pause", file: "src/components/Landing/HomeActiveDropsCarousel.tsx", pattern: /visibilitychange/, description: "carousel autoplay pauses while document is hidden" },
    { id: "carousel-reduced-motion", file: "src/components/Landing/HomeActiveDropsCarousel.tsx", pattern: /prefers-reduced-motion: reduce/, description: "carousel autoplay respects reduced motion" },
    { id: "carousel-selected-dedupe", file: "src/components/Landing/HomeActiveDropsCarousel.tsx", pattern: /currentIndex === nextIndex/, description: "carousel select events avoid same-index rerenders" },
    { id: "carousel-content-visibility", file: "src/components/Landing/HomeActiveDropsCarousel.tsx", pattern: /\[content-visibility:auto\]/, description: "below-fold carousel paint is contained" },
    { id: "carousel-image-policy-binding", file: "src/components/Landing/HomeActiveDropsCarousel.tsx", pattern: /getImageLoadingPolicy\("home_active_drops"\)[\s\S]*sizes=\{imagePolicy\.sizes\}/, description: "legacy carousel renders the canonical responsive image policy" },
    { id: "carousel-image-sizing", file: "src/lib/image-loading-policy.ts", pattern: /home_active_drops: \{[^}]*loading: "lazy"[^}]*sizes: "\(max-width: 600px\) 46vw, \(max-width: 960px\) 38vw, 360px"/, legacy: true, description: "legacy carousel policy retains bounded card-sized responsive sizing" },
    { id: "carousel-route-transition", file: "src/components/Landing/HomeActiveDropsCarousel.tsx", pattern: /startTransition[\s\S]*router\.push/, description: "carousel navigation is scheduled as a transition" },
    { id: "rail-split-auth-identity", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /useAuthIdentity/, description: "creator rail avoids full auth context" },
    { id: "rail-actions-context", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /useUIActions/, description: "creator rail avoids modal-state subscription" },
    { id: "rail-transition-state", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /startCreatorsTransition/, description: "creator rail bulk updates are transitions" },
    { id: "rail-abort-controller", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /AbortController/, description: "creator rail public fetch is abortable" },
    { id: "rail-idle-home-relationships", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /HOME_RELATIONSHIP_IDLE_DELAY_MS/, description: "home relationship enrichment is deferred" },
    { id: "rail-seeded-guest-short-circuit", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /hasSeededCreators[\s\S]*setFollowedCreators\(EMPTY_CREATORS\)/, description: "seeded guest rail skips duplicate discovery load" },
    { id: "rail-presentation-owner-binding", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /return <KandyCreatorDiscoverySkeleton[\s\S]*return <KandyCreatorDiscoveryEmpty[\s\S]*<KandyCreatorDiscoveryView[\s\S]*<KandyCreatorDiscoveryCard/, description: "creator rail delegates its rendered states to the current presentation owner" },
    { id: "rail-content-visibility", file: "src/components/creative-tim/kandydrops/creator-discovery/CreatorDiscoveryPresentation.tsx", pattern: /\[content-visibility:auto\]/, description: "current creator rail presentation contains below-fold paint" },
    { id: "rail-motion-reduce-skeleton", file: "src/components/creative-tim/kandydrops/creator-discovery/CreatorDiscoveryPresentation.tsx", pattern: /motion-reduce:animate-none/, description: "current creator skeleton respects reduced motion" },
    { id: "rail-image-sizing", file: "src/components/creative-tim/kandydrops/creator-discovery/CreatorDiscoveryPresentation.tsx", pattern: /const avatarPixels = isHomeSpotlight \? 112 : 72;[\s\S]*getImageLoadingPolicy\("home_creator_rail"\)[\s\S]*width=\{avatarPixels\}[\s\S]*height=\{avatarPixels\}[\s\S]*sizes=\{isHomeSpotlight \? avatarPixels \+ "px" : imagePolicy\.sizes\}/, description: "creator avatars retain fixed home sizing and the shared non-home policy" },
    { id: "rail-image-policy-sizing", file: "src/lib/image-loading-policy.ts", pattern: /home_creator_rail: \{[^}]*loading: "lazy"[^}]*sizes: "72px"/, description: "shared creator rail avatar policy remains lazy and fixed-size" },
    { id: "title-marquee-shared-owner-binding", file: "src/components/ui/TitleMarquee.tsx", pattern: /import \{ MarqueeText \} from "@\/components\/ui\/MarqueeText";[\s\S]*<MarqueeText/, description: "title adapter renders the canonical marquee owner" },
    { id: "title-marquee-raf", file: "src/components/ui/MarqueeText.tsx", pattern: /requestAnimationFrame/, description: "shared title marquee measurements are RAF scheduled" },
    { id: "title-marquee-state-dedupe", file: "src/components/ui/MarqueeText.tsx", pattern: /overflowRef\.current !== normalizedOverflow/, description: "shared title marquee avoids same-overflow state updates" },
    { id: "title-marquee-single-observer", file: "src/components/ui/MarqueeText.tsx", pattern: /observer\.observe\(frameRef\.current\)/, description: "shared title marquee observes the frame instead of every text node" },
    { id: "compact-number-memo", file: "src/components/ui/CompactNumber.tsx", pattern: /export const CompactNumber = memo/, description: "compact number cards are memoized" },
    { id: "compact-number-stable-handlers", file: "src/components/ui/CompactNumber.tsx", pattern: /useCallback/, description: "compact number pointer handlers are stable" },
    { id: "auth-profile-pathname-detached", file: "src/context/AuthContext.tsx", pattern: /observerControl\.cleanup\(\);\s*\};\s*\},\s*\[(?=[^\]]*\bauthStateResolved\b)(?=[^\]]*\buser\b)(?![^\]]*\bpathname\b)[^\]]*\]\);/, description: "normal pathname changes do not reconnect the profile listener; maintenance boundary may be deliberate" },
    { id: "auth-init-debug", file: "src/context/AuthContext.tsx", pattern: /auth initialization failed/, description: "auth initialization failures are reported" },
    { id: "auth-navigation-debug", file: "src/context/AuthContext.tsx", pattern: /auth navigation session sync failed/, description: "navigation session failures are reported" },
    { id: "hero-no-pulse-blobs", file: "src/components/Hero.tsx", pattern: /motion-reduce:hidden/, description: "hero background paint respects reduced motion" },
    { id: "hero-activity-reduced-motion", file: "src/components/Hero.tsx", pattern: /motion-reduce:animate-none/, description: "hero activity ticker respects reduced motion" },
    { id: "ticker-memo-duplicates", file: "src/components/HomeDropTicker.tsx", pattern: /duplicatedTickerDrops/, description: "home drop ticker duplicate track is memoized" },
    { id: "ticker-content-visibility", file: "src/components/HomeDropTicker.tsx", pattern: /\[content-visibility:auto\]/, description: "home drop ticker paint is contained" },
    { id: "howitworks-hoisted-features", file: "src/components/Landing/HowItWorks.tsx", pattern: /HOW_IT_WORKS_FEATURES/, description: "how-it-works feature config is stable" },
    { id: "howitworks-content-visibility", file: "src/components/Landing/HowItWorks.tsx", pattern: /\[content-visibility:auto\]/, description: "below-fold how-it-works paint is contained" },
    { id: "howitworks-overscroll-contain", file: "src/components/Landing/HowItWorks.tsx", pattern: /overscroll-x-contain/, description: "mobile horizontal steps avoid cross-axis scroll bleed" },
    { id: "server-discovery-candidate-limit", file: "src/lib/server/creator-discovery.ts", pattern: /CREATOR_DISCOVERY_RELATIONSHIP_COUNT_LIMIT/, description: "server discovery relationship count fan-out is bounded" },
    { id: "server-discovery-limit-warning", file: "src/lib/server/creator-discovery.ts", pattern: /relationship counts were candidate-limited/, description: "server discovery count limiting is diagnostically visible" },
    { id: "framework-request-header-safe", file: "src/lib/server/framework-request-diagnostics.ts", pattern: /function readHeader/, description: "framework request diagnostics tolerate non-Headers request metadata" },
];

const failures: string[] = [];

for (const guard of guards) {
    const source = readFileSync(join(repoRoot, guard.file), "utf8");
    const matches = guard.pattern.test(source);
    if (guard.forbidden ? matches : !matches) {
        failures.push(`${guard.id}: ${guard.description} (${guard.file})`);
    }
}

if (failures.length > 0) {
    console.error("Homepage hydration/performance guard failed:");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

const legacyChecks = guards.filter((guard) => guard.legacy || legacyComponentFiles.has(guard.file)).length;
console.log(`Homepage hydration/performance guard passed (${guards.length - legacyChecks} current/shared source checks; ${legacyChecks} legacy component checks).`);
