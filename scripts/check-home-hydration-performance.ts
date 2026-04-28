import { readFileSync } from "node:fs";
import { join } from "node:path";

type Guard = {
    id: string;
    file: string;
    pattern: RegExp;
    description: string;
};

const repoRoot = process.cwd();

const guards: Guard[] = [
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
    { id: "layout-homepage-idle-telemetry", file: "src/components/CoreLayoutWrapper.tsx", pattern: /telemetryReady = isHomeRoute \? homepageIdleReady : afterPaintReady/, description: "homepage deep telemetry waits for idle" },
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
    { id: "carousel-image-sizing", file: "src/components/Landing/HomeActiveDropsCarousel.tsx", pattern: /360px/, description: "carousel images use card-sized responsive sizing" },
    { id: "carousel-route-transition", file: "src/components/Landing/HomeActiveDropsCarousel.tsx", pattern: /startTransition[\s\S]*router\.push/, description: "carousel navigation is scheduled as a transition" },
    { id: "rail-split-auth-identity", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /useAuthIdentity/, description: "creator rail avoids full auth context" },
    { id: "rail-actions-context", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /useUIActions/, description: "creator rail avoids modal-state subscription" },
    { id: "rail-transition-state", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /startCreatorsTransition/, description: "creator rail bulk updates are transitions" },
    { id: "rail-abort-controller", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /AbortController/, description: "creator rail public fetch is abortable" },
    { id: "rail-idle-home-relationships", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /HOME_RELATIONSHIP_IDLE_DELAY_MS/, description: "home relationship enrichment is deferred" },
    { id: "rail-seeded-guest-short-circuit", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /hasSeededCreators[\s\S]*setFollowedCreators\(EMPTY_CREATORS\)/, description: "seeded guest rail skips duplicate discovery load" },
    { id: "rail-content-visibility", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /\[content-visibility:auto\]/, description: "creator rail paint is contained" },
    { id: "rail-motion-reduce-skeleton", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /motion-reduce:animate-none/, description: "creator skeleton respects reduced motion" },
    { id: "rail-image-sizing", file: "src/components/CreatorDiscoveryRail.tsx", pattern: /sizes="72px"/, description: "creator avatars use fixed responsive image sizing" },
    { id: "title-marquee-raf", file: "src/components/ui/TitleMarquee.tsx", pattern: /requestAnimationFrame/, description: "title marquee measurements are RAF scheduled" },
    { id: "title-marquee-state-dedupe", file: "src/components/ui/TitleMarquee.tsx", pattern: /overflowRef\.current !== normalizedOverflow/, description: "title marquee avoids same-overflow state updates" },
    { id: "title-marquee-single-observer", file: "src/components/ui/TitleMarquee.tsx", pattern: /observer\.observe\(frameRef\.current\)/, description: "title marquee observes the frame instead of every text node" },
    { id: "compact-number-memo", file: "src/components/ui/CompactNumber.tsx", pattern: /export const CompactNumber = memo/, description: "compact number cards are memoized" },
    { id: "compact-number-stable-handlers", file: "src/components/ui/CompactNumber.tsx", pattern: /useCallback/, description: "compact number pointer handlers are stable" },
    { id: "auth-profile-pathname-detached", file: "src/context/AuthContext.tsx", pattern: /\}, \[authStateResolved, router, user\]\);/, description: "profile listener does not reconnect on pathname changes" },
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
    if (!guard.pattern.test(source)) {
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

console.log(`Homepage hydration/performance guard passed (${guards.length} checks).`);
