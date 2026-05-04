import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath: string) {
    return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function fail(message: string): never {
    console.error(`Sitewide image optimization validation failed: ${message}`);
    process.exit(1);
}

function assertIncludes(file: string, needle: string, message: string) {
    if (!read(file).includes(needle)) {
        fail(`${message} (${file})`);
    }
}

function assertNotIncludes(file: string, needle: string, message: string) {
    if (read(file).includes(needle)) {
        fail(`${message} (${file})`);
    }
}

function walkSourceFiles(dir: string): string[] {
    const entries = fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const relativePath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkSourceFiles(relativePath));
        } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
            files.push(relativePath.replace(/\\/g, "/"));
        }
    }
    return files;
}

function assertNoFillImageMissingSizes() {
    const imageTagPattern = /<(?:NextImage|Image)\b[\s\S]*?\/?>/g;
    for (const file of walkSourceFiles("src")) {
        const source = read(file);
        for (const match of source.matchAll(imageTagPattern)) {
            const tag = match[0];
            if (/\bfill\b/.test(tag) && !/\bsizes=/.test(tag)) {
                const line = source.slice(0, match.index).split(/\r?\n/).length;
                fail(`NextImage/Image with fill is missing sizes at ${file}:${line}`);
            }
        }
    }
}

function assertNoDeprecatedImagePriorityProp() {
    const priorityImagePattern = /<(?:NextImage|Image)\b[\s\S]*?\bpriority\b[\s\S]*?\/?>/;
    for (const file of walkSourceFiles("src")) {
        const source = read(file);
        if (priorityImagePattern.test(source)) {
            fail(`deprecated next/image priority prop remains in ${file}`);
        }
    }
}

function assertNoRawImgInCriticalFiles() {
    const criticalFiles = [
        "src/components/Hero.tsx",
        "src/components/HomeDropTicker.tsx",
        "src/components/CreatorDiscoveryRail.tsx",
        "src/components/DropCardLayout.tsx",
        "src/components/FeaturedCarousel.tsx",
        "src/components/DropPreviewModal.tsx",
        "src/components/Drops/LockedDropPreviewView.tsx",
        "src/components/Creators/CreatorProfileHeader.tsx",
        "src/components/Creators/CreatorUpdatesFeed.tsx",
        "src/components/Dashboard/OwnedDropGalleryCard.tsx",
        "src/components/Dashboard/LiveDropsForYouCarousel.tsx",
        "src/app/dashboard/viewer/components/MediaViewer.tsx",
        "src/app/dashboard/viewer/components/DropInfoOverlay.tsx",
        "src/app/dashboard/viewer/components/ThumbnailsSlider.tsx",
    ];

    for (const file of criticalFiles) {
        if (read(file).includes("<img")) {
            fail(`raw <img> is not allowed in critical image surface ${file}`);
        }
    }
}

function validatePolicyHelper() {
    const helper = "src/lib/image-loading-policy.ts";
    const source = read(helper);
    const requiredSurfaces = [
        "home_hero",
        "home_creator_rail",
        "drops_grid",
        "featured_carousel",
        "drop_preview",
        "creator_profile_header",
        "creator_updates",
        "my_kandydrops_library",
        "dashboard_collection",
        "viewer_content",
    ];
    for (const surface of requiredSurfaces) {
        if (!source.includes(`"${surface}"`)) {
            fail(`image policy missing required surface ${surface}`);
        }
    }

    for (const required of [
        "data-image-surface",
        "data-image-loading-policy",
        "data-image-preload-allowed",
        "data-image-lcp-candidate",
        "data-image-sizes-policy",
    ]) {
        if (!source.includes(required)) {
            fail(`image policy missing debug attribute ${required}`);
        }
    }

    if (!/drops_grid:[\s\S]*?loading: "lazy"[\s\S]*?preload: false[\s\S]*?fetchPriority: "low"/.test(source)) {
        fail("drops_grid policy must be lazy, non-preloaded, and low priority");
    }
    if (!/drop_preview:[\s\S]*?loading: "eager"[\s\S]*?preload: true[\s\S]*?fetchPriority: "high"/.test(source)) {
        fail("drop_preview policy must be the LCP eager/preload/high candidate");
    }
    if (!/surface === "viewer_content"[\s\S]*?mediaIndex === 0[\s\S]*?fetchPriority: lcpCandidate \? "high" : "low"/.test(source)) {
        fail("viewer_content policy must prioritize only mediaIndex 0");
    }
    if (/DROP_GRID_STANDARD_SIZES\s*=\s*"[^"]*100vw/.test(source)) {
        fail("standard drop grid sizes must not use 100vw");
    }
}

function validateCriticalComponents() {
    const policyComponents = [
        "src/components/DropCardLayout.tsx",
        "src/components/FeaturedCarousel.tsx",
        "src/components/Drops/LockedDropPreviewView.tsx",
        "src/components/DropPreviewModal.tsx",
        "src/components/HomeDropTicker.tsx",
        "src/components/CreatorDiscoveryRail.tsx",
        "src/components/Creators/CreatorProfileHeader.tsx",
        "src/components/Dashboard/OwnedDropGalleryCard.tsx",
        "src/components/Dashboard/LiveDropsForYouCarousel.tsx",
        "src/components/Landing/HomeActiveDropsCarousel.tsx",
        "src/components/PromoCard.tsx",
        "src/app/dashboard/viewer/components/MediaViewer.tsx",
        "src/app/dashboard/viewer/components/DropInfoOverlay.tsx",
        "src/app/dashboard/viewer/components/ThumbnailsSlider.tsx",
    ];
    for (const file of policyComponents) {
        assertIncludes(file, "getImageLoadingPolicy", "critical image component must use shared policy");
        assertIncludes(file, "getImagePolicyDataAttributes", "critical image component must expose debug image attributes");
    }

    assertNotIncludes("src/components/DropGrid.tsx", "priority={index < 4}", "drop grid must not preload/high-priority repeated cards");
    assertNotIncludes("src/components/DropCardLayout.tsx", "priority=", "drop card layout must not use deprecated priority");
    assertNotIncludes("src/components/DropCardLayout.tsx", "100vw, 720px", "drop card grid sizing must not use old full-viewport card sizing");
    assertIncludes("src/components/FeaturedCarousel.tsx", "mediaIndex: index", "featured carousel must make image priority index-aware");
    assertNotIncludes("src/components/FeaturedCarousel.tsx", "preload={true}", "featured carousel must not preload all slides");
    assertIncludes("src/app/dashboard/viewer/components/MediaViewer.tsx", "mediaIndex: activeIndex", "viewer image policy must use active media index");
}

function validateLockedPreviewSafety() {
    const lockedFiles = [
        "src/components/Drops/LockedDropPreviewView.tsx",
        "src/components/DropPreviewModal.tsx",
        "src/app/drops/[id]/preview/page.tsx",
    ];
    for (const file of lockedFiles) {
        const source = read(file);
        if (/\bcontentUrls\b|\bcontentUrl\b/.test(source)) {
            fail(`locked preview surface must not render internal content URLs in ${file}`);
        }
    }
    assertIncludes("src/lib/locked-drop-preview-truth.ts", "toLockedDropPreviewSafeDrop", "locked preview safe-drop helper must remain canonical");
    assertNotIncludes("src/lib/locked-drop-preview-truth.ts", "contentUrls:", "safe preview helper must not expose contentUrls");
    assertNotIncludes("src/lib/locked-drop-preview-truth.ts", "contentUrl:", "safe preview helper must not expose contentUrl");
}

function validateProductBlurSeparation() {
    const dropCardLayout = read("src/components/DropCardLayout.tsx");
    if (!dropCardLayout.includes("hasProductCoverBlur") || !dropCardLayout.includes("imageLoaded && hasProductCoverBlur")) {
        fail("drop card product blur must remain explicit and separate from loading blur");
    }
}

assertNoFillImageMissingSizes();
assertNoDeprecatedImagePriorityProp();
assertNoRawImgInCriticalFiles();
validatePolicyHelper();
validateCriticalComponents();
validateLockedPreviewSafety();
validateProductBlurSeparation();

console.log("Sitewide image optimization validator passed.");
