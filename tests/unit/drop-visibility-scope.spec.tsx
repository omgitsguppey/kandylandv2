import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as ts from "typescript";
import { sourceRenderNodes, someSourceNode } from "../../scripts/agent/validate-behavioral-truth-source";
import { DropsDiscoveryExperience } from "@/components/creative-tim/kandydrops/drops/DropsDiscoveryExperience";

function readSource(path: string) {
    return readFileSync(join(process.cwd(), path), "utf8");
}

describe("drop visibility scope markers", () => {
    it("marks public creator profile drop sections and creator-owned drop list scope", () => {
        const source = readSource("src/app/creators/[username]/CreatorProfileClient.tsx");

        expect(source).toContain('data-drop-visibility-scope="creator_profile"');
        expect(source).toContain('data-drop-visibility-scope="own_creator_drops"');
    });

    it("keeps public drops discovery marked as public discovery", () => {
        const source = readSource("src/app/drops/DropsClient.tsx");

        expect(source).toContain('import { DropsDiscoveryExperience } from "@/components/creative-tim/kandydrops/drops/DropsDiscoveryExperience"');
        expect(source).toContain("<DropsDiscoveryExperience");
        const html = renderToStaticMarkup(<DropsDiscoveryExperience activeDropCount={1} visibleDropCount={1} selectedCategory="All" deferredSearchQuery="" accountOverview={null} featuredRelease={<div>Featured public cover</div>} creatorRail={null} filters={null} collection={<div>Known public collection</div>} pagination={null} />);
        expect(html).toContain('data-drop-visibility-scope="public_discovery"');
        expect(html).toContain("Known public collection");
    });
});


describe("drop affordability source reader", () => {
    const message = "DropCard affordability must use the matching ready profile through its rendered CTA.";
    const readerPath = "scripts/agent/validate-drop-cover-visibility-truth.ts";
    const cardPath = "src/components/DropCard.tsx";
    function runReader(cardSource: string) {
        const temporaryRoot = resolve(mkdtempSync(join(tmpdir(), "drop-cover-reader-")));
        if (dirname(temporaryRoot) !== resolve(tmpdir()) || !basename(temporaryRoot).startsWith("drop-cover-reader-")) throw new Error("Unexpected fixture root");
        try {
            const overrides = [[resolve(cardPath), cardSource], [resolve(readerPath), readSource(readerPath)]];
            const preload = join(temporaryRoot, "source-overlay.cjs");
            writeFileSync(preload, "const fs=require('node:fs'),path=require('node:path');const overlays=new Map(" + JSON.stringify(overrides) + ");const original=fs.readFileSync;fs.readFileSync=function(file,options){const source=overlays.get(path.resolve(String(file)));return source===undefined?original.apply(this,arguments):typeof options==='string'||options?.encoding?source:Buffer.from(source);};require('node:module').syncBuiltinESMExports();", { flag: "wx" });
            return spawnSync(process.execPath, ["--require", preload, "--import", "tsx", resolve(readerPath)], { cwd: process.cwd(), encoding: "utf8", timeout: 15000 });
        } finally {
            rmSync(temporaryRoot, { recursive: true, force: true });
        }
    }
    it("accepts the actual matching profile to visible CTA binding", () => {
        const result = runReader(readSource(cardPath));
        expect(result.error).toBeUndefined();
        expect(result.status, result.stdout + result.stderr).toBe(0);
    });
    it("accepts equivalent local alias names", () => {
        const source = readSource(cardPath).replace(/\bactiveProfile\b/g, "confirmedProfile").replace(/\bprofileReady\b/g, "accountReady").replace(/\bvisibilityState\b/g, "coverState");
        const result = runReader(source);
        expect(result.status, result.stdout + result.stderr).toBe(0);
    });
    it.each(["raw profile", "comment marker", "unused guarded resolver"])("rejects %s instead of the actual matching profile binding", (variant) => {
        let source = readSource(cardPath);
        expect(source).toMatch(/gumDropsBalance:\s*activeProfile\?\.gumDropsBalance/);
        source = source.replace(/gumDropsBalance:\s*activeProfile\?\.gumDropsBalance/, "gumDropsBalance: userProfile?.gumDropsBalance");
        if (variant === "comment marker") source += "\n// gumDropsBalance: activeProfile?.gumDropsBalance\n";
        if (variant === "unused guarded resolver") source = source.replace("    const visibilityState = useMemo(", "    const unusedVisibility = resolveDropCardVisibilityState({ drop, isAuthenticated: Boolean(user), isUnlocked: hasUnlockedDrop, gumDropsBalance: activeProfile?.gumDropsBalance, actorUserId: user?.uid ?? null, activeCreatorId });\n    const visibilityState = useMemo(");
        const result = runReader(source);
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(message);
    });
});

describe("connected preview and discovery source readers", () => {
    const routePath = "src/app/drops/[id]/preview/page.tsx";
    const clientPath = "src/app/drops/DropsClient.tsx";
    const hookPath = "src/hooks/useDropsSearchTelemetry.ts";
    const railPath = "src/components/CreatorDiscoveryRail.tsx";
    const cardPath = "src/components/creative-tim/kandydrops/creator-discovery/CreatorDiscoveryPresentation.tsx";
    const catalogPath = "src/lib/telemetry-catalog.ts";
    const previewReader = "scripts/agent/validate-drop-preview-legacy-handoff.ts";
    const discoveryReader = "scripts/agent/validate-discovery-tracking-truth.ts";
    function runReader(reader: string, overrides: Array<[string, string | null]> = []) {
        const temporaryRoot = resolve(mkdtempSync(join(tmpdir(), "drops-connected-reader-")));
        if (dirname(temporaryRoot) !== resolve(tmpdir()) || !basename(temporaryRoot).startsWith("drops-connected-reader-")) throw new Error("Unexpected fixture root");
        try {
            const values = overrides.map(([file, value]) => [resolve(file), value]);
            const preload = join(temporaryRoot, "source-overlay.cjs");
            writeFileSync(preload, "const fs=require('node:fs'),path=require('node:path');const overlays=new Map(" + JSON.stringify(values) + ");const original=fs.readFileSync,originalExists=fs.existsSync;fs.existsSync=function(file){const key=path.resolve(String(file));return overlays.has(key)?overlays.get(key)!==null:originalExists.apply(this,arguments);};fs.readFileSync=function(file,options){const key=path.resolve(String(file));if(!overlays.has(key))return original.apply(this,arguments);const source=overlays.get(key);if(source===null){const error=new Error('Removed fixture source: '+key);error.code='ENOENT';throw error;}return typeof options==='string'||options?.encoding?source:Buffer.from(source);};require('node:module').syncBuiltinESMExports();", { flag: "wx" });
            return spawnSync(process.execPath, ["--require", preload, "--import", "tsx", resolve(reader)], { cwd: process.cwd(), encoding: "utf8", timeout: 15000 });
        } finally {
            rmSync(temporaryRoot, { recursive: true, force: true });
        }
    }
    it.each([previewReader, discoveryReader])("accepts the actual consumed owners through %s", (reader) => {
        const result = runReader(reader);
        expect(result.error).toBeUndefined();
        expect(result.status, result.stdout + result.stderr).toBe(0);
    });
    it("accepts an equivalent safe DTO local alias", () => {
        const result = runReader(previewReader, [[routePath, readSource(routePath).replace(/\bpreviewDrop\b/g, "safePreview")]]);
        expect(result.status, result.stdout + result.stderr).toBe(0);
    });
    it.each(["comment URL", "unused URL", "raw projection"])("rejects %s instead of the returned safe canonical URL", (variant) => {
        let source = readSource(routePath);
        if (variant === "raw projection") source = source.replace("const previewDrop = toLockedDropPreviewSafeDrop(drop);", "const previewDrop = drop;");
        else source = source.replace("canonical: `/drops/${encodeURIComponent(previewDrop.id)}/preview`", "canonical: `/unrelated/${encodeURIComponent(previewDrop.id)}`");
        source += variant === "unused URL" ? "\nconst unused = { canonical: `/drops/${encodeURIComponent(previewDrop.id)}/preview` };\n" : "\n// canonical: `/drops/${encodeURIComponent(drop.id)}/preview`\n";
        const result = runReader(previewReader, [[routePath, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("returned from the imported safe Drop projection");
    });
    it("accepts an imported search hook alias and explicit argument fields", () => {
        const source = readSource(clientPath).replaceAll("\r\n", "\n").replace("import { useDropsSearchTelemetry }", "import { useDropsSearchTelemetry as useDiscoveryTracking }").replace("} = useDropsSearchTelemetry({", "} = useDiscoveryTracking({").replace("        deferredSearchQuery,\n", "        deferredSearchQuery: deferredSearchQuery,\n").replace("        filteredDrops,\n", "        filteredDrops: filteredDrops,\n").replace("        selectedCategory,\n", "        selectedCategory: selectedCategory,\n");
        const result = runReader(discoveryReader, [[clientPath, source]]);
        expect(result.status, result.stdout + result.stderr).toBe(0);
    });
    it.each(["hook call", "focus callback", "result callback", "category input"])("rejects disconnected %s despite comment markers", (variant) => {
        const original = readSource(clientPath).replaceAll("\r\n", "\n");
        let source = original;
        if (variant === "hook call") source = source.replace("} = useDropsSearchTelemetry({", "} = unusedTelemetryOwner({");
        if (variant === "focus callback") source = source.replace("onSearchFocus={trackSearchFocus}", "onSearchFocus={undefined}");
        if (variant === "result callback") source = source.replace("trackSearchResultClicked(drop.id, sourceComponent);", "void drop.id;");
        if (variant === "category input") source = source.replace("        selectedCategory,\n    });", "        selectedCategory: \"All\",\n    });");
        expect(source).not.toBe(original);
        source += "\n/* sanitizeDiscoveryQuery resolveDropsDiscoverySort trackEvent(\"drops_searched\" query_sanitized category: selectedCategory sort: discoverySort trackEvent(\"drops_category_selected\" */\n";
        const result = runReader(discoveryReader, [[clientPath, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("imported search hook and rendered");
    });
    it.each(["submission event", "unsanitized payload"])("rejects %s in the actual search effect", (variant) => {
        const original = readSource(hookPath);
        const source = variant === "submission event" ? original.replaceAll('"search_submitted"', '"drops_searched"')
            : original.replace(/(const commonSearchPayload = \{[\s\S]*?queryText: )sanitizedQuery/, "$1normalizedQuery");
        expect(source).not.toBe(original);
        const result = runReader(discoveryReader, [[hookPath, source + '\n// trackEvent("search_submitted", buildSearchTelemetryPayload({queryText:sanitizedQuery}))\n']]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("canonical sanitized redacted payload");
    });
    it("rejects an imported creator card that is no longer rendered", () => {
        const result = runReader(discoveryReader, [[railPath, readSource(railPath).replace("<KandyCreatorDiscoveryCard", "<div") + "\n// data-creator-rail-position\n"]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("imported rendered card marker");
    });
    it("rejects a missing consumed position marker even when a comment retains it", () => {
        const result = runReader(discoveryReader, [[cardPath, readSource(cardPath).replace("data-creator-rail-position={position}", "data-unused-position={position}") + "\n// data-creator-rail-position\n"]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("imported rendered card marker");
    });
    it("checks actual catalog fields rather than the obsolete combined predicate", () => {
        const original = readSource(catalogPath);
        const source = original.replace(/(if \(eventName === "drops_category_selected"\) \{\s*return \[\s*"category",\s*)"sort"/, '$1"wrong_sort"') + '\n// eventName === "drops_searched" || eventName === "drops_category_selected"\n';
        expect(source).not.toBe(original);
        const result = runReader(discoveryReader, [[catalogPath, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("drops_category_selected must retain its actual required discovery fields");
    });

    it("rejects a wrong category event even when the expected call survives in a comment", () => {
        const original = readSource(hookPath);
        const source = original.replace('trackEvent("drops_category_selected"', 'trackEvent("wrong_event"') + '\n// trackEvent("drops_category_selected", expectedPayload)\n';
        expect(source).not.toBe(original);
        const result = runReader(discoveryReader, [[hookPath, source]]);
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("returned canonical callback");
    });
    it("rejects a returned no-op instead of an unused correct category callback", () => {
        const original = readSource(hookPath).replaceAll("\r\n", "\n");
        const source = original.replace("    trackCategorySelected,\n", "    trackCategorySelected: () => undefined,\n");
        expect(source).not.toBe(original);
        const result = runReader(discoveryReader, [[hookPath, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("returned canonical callback");
    });
    it.each(["wrong category", "unused correct call"])("rejects %s instead of the selected category argument", (variant) => {
        const original = readSource(clientPath);
        let source = original.replace("trackCategorySelected(category);", 'trackCategorySelected("All");');
        source += "\n// trackCategorySelected(category);\n";
        if (variant === "unused correct call") source = source.replace("setSelectedCategory(category);", "setSelectedCategory(category); const unused = () => trackCategorySelected(category);");
        expect(source).not.toBe(original);
        const result = runReader(discoveryReader, [[clientPath, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("imported search hook and rendered");
    });
    it.each(["drop id", "source component"])("rejects the wrong %s in the consumed result callback", (variant) => {
        const original = readSource(clientPath);
        const source = original.replace("trackSearchResultClicked(drop.id, sourceComponent);", variant === "drop id"
            ? 'trackSearchResultClicked("other-drop", sourceComponent);' : 'trackSearchResultClicked(drop.id, "wrong-source");')
            + "\n// trackSearchResultClicked(drop.id, sourceComponent);\n";
        expect(source).not.toBe(original);
        const result = runReader(discoveryReader, [[clientPath, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("imported search hook and rendered");
    });
    it("requires the creator position marker on the observed card rather than a hidden child", () => {
        const original = readSource(cardPath);
        const source = original.replace("data-creator-rail-position={position}", "data-unused-position={position}")
            .replace("      {profileHref ? (", "      <span hidden data-creator-rail-position={position} />\n      {profileHref ? (");
        expect(source).not.toBe(original);
        const result = runReader(discoveryReader, [[cardPath, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("imported rendered card marker");
    });
    it.each(["raw query", "wrong sort"])("rejects %s in the returned category payload", (variant) => {
        const original = readSource(hookPath);
        const source = variant === "raw query" ? original.replace("queryText: sanitizeDiscoveryQuery(deferredSearchQuery)", "queryText: deferredSearchQuery")
            : original.replace("sort: resolveDropsDiscoverySort(category)", 'sort: resolveDropsDiscoverySort("All")');
        expect(source).not.toBe(original);
        const result = runReader(discoveryReader, [[hookPath, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("returned canonical callback");
    });
    it("accepts equivalent imported and returned category callback aliases", () => {
        const source = readSource(hookPath).replace(/\btrackCategorySelected\b/g, "recordCategory")
            .replace("    recordCategory,", "    trackCategorySelected: recordCategory,")
            .replace(/\bsafeSearchFields\b/g, "redactedFields")
            .replace(/\buseCallback\b/g, "useStableCallback")
            .replace("{ useStableCallback,", "{ useCallback as useStableCallback,");
        const result = runReader(discoveryReader, [[hookPath, source]]);
        expect(result.status, result.stdout + result.stderr).toBe(0);
    });
    it("accepts equivalent consumer callback aliases", () => {
        const source = readSource(clientPath).replaceAll("\r\n", "\n")
            .replace("        trackCategorySelected,\n", "        trackCategorySelected: recordCategory,\n")
            .replace("trackCategorySelected(category);", "recordCategory(category);")
            .replace("        trackSearchResultClicked,\n", "        trackSearchResultClicked: recordResult,\n")
            .replace("trackSearchResultClicked(drop.id, sourceComponent);", "recordResult(drop.id, sourceComponent);");
        const result = runReader(discoveryReader, [[clientPath, source]]);
        expect(result.status, result.stdout + result.stderr).toBe(0);
    });
    it("accepts equivalent observed-card prop aliases", () => {
        const source = readSource(cardPath).replace("surface, position, cardRef,", "surface, position: placement, cardRef: observeCard,")
            .replace("ref={cardRef}", "ref={observeCard}").replace("data-creator-rail-position={position}", "data-creator-rail-position={placement}");
        const result = runReader(discoveryReader, [[cardPath, source]]);
        expect(result.status, result.stdout + result.stderr).toBe(0);
    });

    it("rejects a physically present retired modal even when it has no caller", () => {
        const result = runReader(previewReader, [["src/components/DropPreviewModal.tsx", "export function DropPreviewModal() { return null; }\n"]]);
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("Retired DropPreviewModal must be physically absent");
    });
    it("retains the active entry-point ban after physical modal removal", () => {
        const source = readSource(clientPath) + '\nimport { DropPreviewModal } from "@/components/DropPreviewModal";\n';
        const result = runReader(previewReader, [[clientPath, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("must not depend on legacy DropPreviewModal as a canonical entry point");
    });
    it.each(["unencoded path", "native share URL", "clipboard URL"])("rejects the wrong %s in the returned Share callback despite comments", (variant) => {
        const path = "src/components/Drops/LockedDropPreviewClient.tsx";
        const original = readSource(path);
        const source = (variant === "unencoded path" ? original.replace("const sharePath = `/drops/${encodeURIComponent(drop.id)}/preview`;", "const sharePath = `/drops/${drop.id}/preview`;")
            : variant === "native share URL" ? original.replace("url: shareUrl,", "url: window.location.href,")
            : original.replace("navigator.clipboard.writeText(shareUrl)", "navigator.clipboard.writeText(window.location.href)"))
            + '\n// const sharePath = `/drops/${encodeURIComponent(drop.id)}/preview`; navigator.share({ url: shareUrl }); navigator.clipboard.writeText(shareUrl);\n';
        expect(source).not.toBe(original);
        const result = runReader(previewReader, [[path, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("Returned full-page Share callback must supply the encoded safe preview URL");
    });
    it("rejects an unused correct Share callback when the rendered action is a no-op", () => {
        const path = "src/components/Drops/LockedDropPreviewClient.tsx";
        const original = readSource(path);
        const source = original.replace("onShare={handleShare}", "onShare={() => undefined}");
        expect(source).not.toBe(original);
        const result = runReader(previewReader, [[path, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("Returned full-page Share callback must supply the encoded safe preview URL");
    });
    it("accepts equivalent bound Share callback and canonical URL variable aliases", () => {
        const path = "src/components/Drops/LockedDropPreviewClient.tsx";
        const source = readSource(path).replace(/\bhandleShare\b/g, "copyPreviewLink").replace(/\bsharePath\b/g, "previewPath").replace(/\bshareUrl\b/g, "canonicalLink");
        const result = runReader(previewReader, [[path, source]]);
        expect(result.status, result.stdout + result.stderr).toBe(0);
    });
    it.each(["wrong Badge source", "interactive Badge", "unused Badge"])("rejects %s in the actual full-page preview rather than the removed modal", (variant) => {
        const path = "src/components/Drops/LockedDropPreviewView.tsx";
        const original = readSource(path);
        const source = variant === "wrong Badge source" ? original.replace('@/components/creative-tim/ui/badge', '@/components/unrelated-badge') + '\n// from "@/components/creative-tim/ui/badge"\n'
            : variant === "interactive Badge" ? original.replaceAll("<Badge", "<Badge onClick={() => undefined}")
            : original.replaceAll("<Badge", "<span").replaceAll("</Badge>", "</span>") + '\nconst unusedBadge = () => <Badge>Unused</Badge>;\n';
        expect(source).not.toBe(original);
        const result = runReader("scripts/agent/validate-design-system-drift.ts", [[path, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("Full-page preview must consume its imported passive local Badge");
    });
    it("accepts equivalent imported local passive Badge aliases", () => {
        const path = "src/components/Drops/LockedDropPreviewView.tsx";
        const source = readSource(path).replace('import { Badge }', 'import { Badge as InfoBadge }').replaceAll("<Badge", "<InfoBadge").replaceAll("</Badge>", "</InfoBadge>");
        const result = runReader("scripts/agent/validate-design-system-drift.ts", [[path, source]]);
        expect(result.status, result.stdout + result.stderr).toBe(0);
    });

    it.each(["Share callback", "complete timer label"])("rejects missing rendered %s despite accessibility comments", (variant) => {
        const path = "src/components/Drops/LockedDropPreviewView.tsx";
        const original = readSource(path);
        const source = variant === "Share callback" ? original.replaceAll("onClick={onShare}", "onClick={undefined}") + "\n// onClick={onShare}\n"
            : original.replaceAll("aria-label={fullLabel}", 'aria-label="Countdown"').replaceAll("aria-label={timerFullLabel}", 'aria-label="Countdown"') + "\n// aria-label={fullLabel}\n";
        expect(source).not.toBe(original);
        const result = runReader("scripts/agent/validate-accessibility-tap-targets.ts", [[path, source]]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(variant === "Share callback" ? "rendered action must retain its actual callback: onShare" : "rendered timer must expose its complete accessible label");
    });


    describe("preview action scalar label custody", () => {
        const path = "src/components/Drops/LockedDropPreviewView.tsx";
        const reader = "scripts/agent/validate-accessibility-tap-targets.ts";
        const renderedLabel = "{getCoverCtaLabel({ truth, authLoading, unlocking, confirming, unlockCost })}";
        const failure = "rendered action must retain its accessible label: Refill to unwrap";
        it("accepts the connected scalar label and an equivalent local helper name", () => {
            const source = readSource(path);
            for (const candidate of [source, source.replaceAll("getCoverCtaLabel", "formatCoverActionLabel")]) {
                const result = runReader(reader, [[path, candidate]]);
                expect(result.status, result.stdout + result.stderr).toBe(0);
            }
        });
        it("rejects labels left in an unconsumed helper and comments", () => {
            const source = readSource(path);
            expect(source).toContain(renderedLabel);
            const result = runReader(reader, [[path, source.replace(renderedLabel, "Checking access") + "\n// Refill to unwrap\n"]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain(failure);
        });
        it("rejects a wrong returned label despite an unused correct literal", () => {
            const source = readSource(path);
            expect(source).toContain('return "Refill to unwrap"');
            const candidate = source.replace('return "Refill to unwrap"', 'return "Refill"') + '\nfunction unusedLabel() { return "Refill to unwrap"; }\n';
            const result = runReader(reader, [[path, candidate]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain(failure);
        });
        it("rejects labels computed only inside a deferred action callback", () => {
            const source = readSource(path);
            const candidate = source.replace(renderedLabel, "Checking access").replace("onClick={onCtaClick}", "onClick={() => { getCoverCtaLabel({ truth, authLoading, unlocking, confirming, unlockCost }); onCtaClick(); }}");
            expect(candidate).not.toBe(source);
            const result = runReader(reader, [[path, candidate]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain(failure);
        });
        it("rejects labels following an unconditional return in the consumed helper", () => {
            const source = readSource(path);
            const candidate = source.replace('    if (authLoading) return "Checking access";', '    return "Checking access";\n    if (authLoading) return "Checking access";');
            expect(candidate).not.toBe(source);
            const result = runReader(reader, [[path, candidate]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain(failure);
        });
    });

    describe("canonical preview doctrine delegation", () => {
        const reader = "scripts/agent/validate-drop-preview-page.ts";
        const discoveryDoc = "docs/agent-truth/drops-mobile-refinement.md";
        const previewDoc = "docs/agent-truth/drop-preview-page.md";
        it("accepts canonical preview delegation without duplicating its policy and with valid link aliases", () => {
            const doc = readSource(discoveryDoc);
            expect(doc).not.toContain("Locked Drop preview is a dedicated full-page conversion surface, not a bottom sheet.");
            const current = runReader(reader);
            expect(current.error).toBeUndefined();
            expect(current.status, current.stdout + current.stderr).toBe(0);
            const alias = doc.replace("[Drop Preview Page Truth](drop-preview-page.md)", "[Dedicated preview contract](./drop-preview-page.md#source-owners)");
            expect(alias).not.toBe(doc);
            const alternative = runReader(reader, [[discoveryDoc, alias]]);
            expect(alternative.status, alternative.stdout + alternative.stderr).toBe(0);
        });
        it("rejects a wrong or comment-only pointer and recovers the actual canonical reference", () => {
            const doc = readSource(discoveryDoc);
            const wrong = doc.replace("(drop-preview-page.md)", "(unrelated-preview.md)") + "\n<!-- [Drop Preview Page Truth](drop-preview-page.md) -->\n";
            const invalid = runReader(reader, [[discoveryDoc, wrong]]);
            expect(invalid.error).toBeUndefined();
            expect(invalid.status).toBe(1);
            expect(invalid.stderr).toContain("Drops mobile doctrine must link to the canonical Drop preview document.");
            const recovered = runReader(reader, [[discoveryDoc, doc]]);
            expect(recovered.status, recovered.stdout + recovered.stderr).toBe(0);
        });
        it("retains the canonical full-page policy and actual safe-route prerequisites", () => {
            const policy = readSource(previewDoc).replace("Locked Drop preview is a dedicated full-page conversion surface, not a bottom sheet.", "Preview policy removed.");
            const missingPolicy = runReader(reader, [[previewDoc, policy]]);
            expect(missingPolicy.status).toBe(1);
            expect(missingPolicy.stderr).toContain("Drop preview doctrine must include");
            const route = readSource(routePath).replaceAll("toLockedDropPreviewSafeDrop", "unsafePreviewProjection");
            const unsafe = runReader(reader, [[routePath, route]]);
            expect(unsafe.status).toBe(1);
            expect(unsafe.stderr).toContain("Preview route safe field mapper must include");
            const recovered = runReader(reader);
            expect(recovered.status, recovered.stdout + recovered.stderr).toBe(0);
        });
    });

    describe("retired-preview reader admission", () => {
        it.each(["return", "throw"])("rejects declared Share sinks after an unconditional %s", (variant) => {
            const path = "src/components/Drops/LockedDropPreviewClient.tsx";
            const original = readSource(path);
            const prefix = "const shareUrl = `${window.location.origin}${sharePath}`;";
            const source = original.replace(prefix, prefix + (variant === "return" ? "\n        return;" : "\n        throw new Error('Sharing stopped');"));
            expect(source).not.toBe(original);
            const result = runReader(previewReader, [[path, source]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain("Returned full-page Share callback must supply the encoded safe preview URL");
        });
        it("rejects the native Share sink retained only in a literal false branch", () => {
            const path = "src/components/Drops/LockedDropPreviewClient.tsx";
            const original = readSource(path);
            const source = original.replace("if (navigator.share) {", "if (false) {");
            expect(source).not.toBe(original);
            const result = runReader(previewReader, [[path, source]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain("Returned full-page Share callback must supply the encoded safe preview URL");
        });
        it("accepts terminal safe Share calls in the actual returned handler", () => {
            const path = "src/components/Drops/LockedDropPreviewClient.tsx";
            const original = readSource(path);
            const source = original.replace("await navigator.share({", "return await navigator.share({")
                .replace("await navigator.clipboard.writeText(shareUrl);", "return await navigator.clipboard.writeText(shareUrl);");
            expect(source).not.toBe(original);
            const result = runReader(previewReader, [[path, source]]);
            expect(result.status, result.stdout + result.stderr).toBe(0);
        });
        it.each(["inline", "bound alias"])("rejects interactive Badge props supplied by a %s spread", (variant) => {
            const path = "src/components/Drops/LockedDropPreviewView.tsx";
            const original = readSource(path);
            const interactive = '{ onClick: () => undefined, role: "button", tabIndex: 0 }';
            const source = variant === "inline" ? original.replaceAll("<Badge", "<Badge {..." + interactive + "}")
                : original.replace('    const tags = ', '    const chipProps = ' + interactive + ';\n    const tags = ').replaceAll("<Badge", "<Badge {...chipProps}");
            expect(source).not.toBe(original);
            const result = runReader("scripts/agent/validate-design-system-drift.ts", [[path, source]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain("Full-page preview must consume its imported passive local Badge");
        });
        it("accepts statically passive Badge spread aliases", () => {
            const path = "src/components/Drops/LockedDropPreviewView.tsx";
            const original = readSource(path);
            const source = original.replace('    const tags = ', '    const chipTitleProps = { title: "Package cost" };\n    const chipProps = { ...chipTitleProps, ...chipTitleProps };\n    const tags = ').replaceAll("<Badge", "<Badge {...chipProps}");
            expect(source).not.toBe(original);
            const result = runReader("scripts/agent/validate-design-system-drift.ts", [[path, source]]);
            expect(result.status, result.stdout + result.stderr).toBe(0);
        });
    });


    describe("connected Discovery body controls", () => {
        const mobileReader = "scripts/agent/validate-drops-mobile-refinement.ts";
        const featuredReader = "scripts/agent/validate-featured-carousel-polish.ts";
        const gridPath = "src/components/DropGrid.tsx";
        const releasePath = "src/components/DropCard.tsx";
        const editorialPath = "src/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCard.tsx";
        const featuredPath = "src/components/FeaturedCarousel.tsx";

        it.each([mobileReader, featuredReader])("accepts actual connected body owners through %s", (reader) => {
            const result = runReader(reader);
            expect(result.error).toBeUndefined();
            expect(result.status, result.stdout + result.stderr).toBe(0);
        });

        it("accepts equivalent imported feed and source-state local aliases", () => {
            const original = readSource(clientPath);
            const source = original.replace("import { useDrops }", "import { useDrops as usePublicFeed }")
                .replace("= useDrops([", "= usePublicFeed([")
                .replaceAll("dropsLoading", "feedPending").replaceAll("dropsError", "feedFailure");
            expect(source).not.toBe(original);
            const result = runReader(mobileReader, [[clientPath, source]]);
            expect(result.status, result.stdout + result.stderr).toBe(0);
        });

        it.each(["loading", "error"])("rejects a disconnected actual %s collection field despite comments", (field) => {
            const original = readSource(clientPath);
            const from = field === "loading" ? "loading={dropsLoading}" : "error={dropsError}";
            const source = original.replace(from, field === "loading" ? "loading={false}" : "error={null}") + "\n// " + from + "\n";
            expect(source).not.toBe(original);
            const result = runReader(mobileReader, [[clientPath, source]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain("loading and error from the actual imported useDrops call");
        });

        it("rejects an error notice declared but omitted from actual returned states", () => {
            const original = readSource(gridPath);
            const source = original.replaceAll("{sourceNotice}", "{null}") + "\n// {sourceNotice} role=\"alert\"\n";
            expect(source).not.toBe(original);
            const result = runReader(mobileReader, [[gridPath, source]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain("actual error notice, shared loading skeleton and collection");
        });

        it("rejects an imported but unrendered collection despite an unused correct component", () => {
            const original = readSource(gridPath);
            const source = original.replaceAll("<KandyEditorialReleaseCollection>", "<div>").replaceAll("</KandyEditorialReleaseCollection>", "</div>")
                + "\nconst UnusedCollection = () => <KandyEditorialReleaseCollection>Unused</KandyEditorialReleaseCollection>;\n";
            expect(source).not.toBe(original);
            const result = runReader(mobileReader, [[gridPath, source]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain("actual error notice, shared loading skeleton and collection");
        });

        it("rejects search focus retained only as an unused callback/comment", () => {
            const path = "src/components/StickyFilterBar.tsx", original = readSource(path);
            const source = original.replace("onFocus={onSearchFocus}", "onFocus={undefined}") + "\n// onFocus={onSearchFocus}\n";
            expect(source).not.toBe(original);
            const result = runReader(mobileReader, [[path, source]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain("search hints and its actual focus callback");
        });

        it.each(["wrong import", "unused canonical call", "wrong delivered field", "wrong visible field"])("rejects %s instead of the actual canonical Grid view count", (variant) => {
            const path = variant === "wrong visible field" ? editorialPath : releasePath;
            const original = readSource(path);
            const source = (variant === "wrong import" ? original.replace('@/lib/drop-engagement', '@/lib/unrelated-engagement')
                : variant === "unused canonical call" ? original.replace("const totalViews = getDropViewCount(drop);", "const totalViews = 0; const unusedViews = getDropViewCount(drop);")
                : variant === "wrong delivered field" ? original.replace("totalViews={totalViews}", "totalViews={0}")
                : original.replace("{totalViews.toLocaleString()} views", "{0} views")) + "\n// getDropViewCount(drop) totalViews={totalViews} totalViews.toLocaleString()\n";
            expect(source).not.toBe(original);
            const result = runReader(featuredReader, [[path, source]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain("canonical getDropViewCount result through the returned Card into its visible readout");
        });

        it("accepts equivalent canonical view-count import and result aliases", () => {
            const original = readSource(releasePath);
            const source = original.replace("import { getDropViewCount }", "import { getDropViewCount as readViews }")
                .replace("const totalViews = getDropViewCount(drop);", "const loadedViews = readViews(drop);")
                .replace("totalViews={totalViews}", "totalViews={loadedViews}");
            expect(source).not.toBe(original);
            const result = runReader(featuredReader, [[releasePath, source]]);
            expect(result.status, result.stdout + result.stderr).toBe(0);
        });

        it.each(["wrong slide projection", "unused correct label"])("rejects %s instead of the rendered Featured social proof", (variant) => {
            const original = readSource(featuredPath);
            const source = (variant === "wrong slide projection" ? original.replace("getFeaturedSocialProof(drop)", "getFeaturedSocialProof({ ...drop, totalUnlocks: 0 })")
                : original.replace("{socialProof.label}", '{"No source"}')) + "\n// getFeaturedSocialProof(drop) socialProof.label data-featured-social-proof-type\n";
            expect(source).not.toBe(original);
            const result = runReader(featuredReader, [[featuredPath, source]]);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain("visible social readout must consume its slide's canonical");
        });
    
        it.each([
            [mobileReader, clientPath, "DropsClient"],
            [featuredReader, featuredPath, "FeaturedDropSlide"],
        ])("rejects unreachable actual component %s/%s despite retained JSX", (reader, path, name) => {
            const original = readSource(path);
            const tree = ts.createSourceFile(path, original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
            const owner = tree.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name);
            expect(owner?.body).toBeDefined();
            const offset = owner!.body!.getStart(tree) + 1;
            const source = original.slice(0, offset) + "\n    return null;\n" + original.slice(offset);
            const result = runReader(reader, [[path, source]]);
            expect(result.error).toBeUndefined();
            expect(result.status, result.stdout + result.stderr).toBe(1);
            expect(result.stderr).toContain(reader === mobileReader ? "return the imported discovery composition" : "Featured CTA must render the shared Button");
        });
});
});

describe("source traversal completion in the existing behavioral owner", () => {
    function source(text: string) { return ts.createSourceFile("controlled-render.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
    function visible(nodes: readonly ts.Node[]) {
        const names = new Set<string>();
        someSourceNode(nodes, node => {
            if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName)) names.add(node.tagName.text);
            return false;
        });
        return [...names].sort();
    }
    it("preserves a partial unknown branch but stops after the later definite return", () => {
        const tree = source("function View({ pending }) { if (pending) return <Pending />; return <Ready />; return <Dead />; }");
        expect(visible(sourceRenderNodes(tree, "View"))).toEqual(["Pending", "Ready"]);
    });
    it("excludes the tail when every unknown branch terminates", () => {
        const tree = source("function View({ failed }) { if (failed) { return <Failed />; } else { return <Loaded />; } return <Dead />; }");
        expect(visible(sourceRenderNodes(tree, "View"))).toEqual(["Failed", "Loaded"]);
    });
    it("does not certify JSX after an unconditional throw", () => {
        const tree = source("function View() { throw new Error('source failed'); return <DeadHealthy />; }");
        expect(visible(sourceRenderNodes(tree, "View"))).toEqual([]);
    });
    it("excludes literal-dead branches and keeps the selected branch", () => {
        const tree = source("function View() { if ((false as boolean)) return <Dead />; if (!false) return <Active />; return <DeadTail />; }");
        expect(visible(sourceRenderNodes(tree, "View"))).toEqual(["Active"]);
    });
    it.each([
        "function Supplied() { return <Native />; return <Dead />; }",
        "const Exported = memo(function Supplied() { return <Native />; return <Dead />; });",
        "const Exported = memo(() => { return <Native />; return <Dead />; });",
        "const Exported = () => <Native />;",
    ])("accepts a resolved direct/memo/concise owner: %s", text => {
        const tree = source(text);
        let owner: ts.FunctionLikeDeclaration | undefined;
        someSourceNode(tree, node => {
            if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) { owner = node; return true; }
            return false;
        });
        expect(owner).toBeDefined();
        expect(visible(sourceRenderNodes(tree, owner!))).toEqual(["Native"]);
    });
    it("follows the reachable local helper and excludes its dead tail", () => {
        const tree = source("function View() { const unused = () => <Unused />; return renderBody(); } function renderBody() { return <Native />; return <Dead />; }");
        expect(visible(sourceRenderNodes(tree, "View"))).toEqual(["Native"]);
    });
    it("reports unsupported control flow instead of certifying a finally-overridden return", () => {
        const tree = source("function View() { try { return <BeforeFinally />; } finally { return <Actual />; } }");
        expect(() => sourceRenderNodes(tree, "View")).toThrow("Unsupported rendered control flow (TryStatement)");
    });
    it("does not treat a deferred scalar action helper as a rendered try branch", () => {
        const tree = source("function View() { return <Button onClick={() => settle()}>Continue</Button>; } async function settle() { try { return await Promise.resolve('saved'); } catch { return 'failed'; } }");
        expect(visible(sourceRenderNodes(tree, "View"))).toEqual(["Button"]);
    });
    it("keeps JSX that calls a switch formatter through a valid local delegate", () => {
        const tree = source("function View() { return renderBody(); } function renderBody() { return <Badge className={formatStatus('pending')}>Status</Badge>; } function formatStatus(status) { switch (status) { case 'pending': return 'pending'; default: return 'ready'; } }");
        expect(visible(sourceRenderNodes(tree, "View"))).toEqual(["Badge"]);
    });
    it("retains uncertainty for a delegated render helper with a finally-overridden result", () => {
        const tree = source("function View() { return renderBody(); } function renderBody() { try { return makeBody(); } finally { return null; } } function makeBody() { return <Uncertain />; }");
        expect(() => sourceRenderNodes(tree, "View")).toThrow("Unsupported rendered control flow (TryStatement)");
    });

    it.each(["onClick", "onChange"])("does not admit helper JSX called only inside %s", action => {
        const tree = source("function View() { return <button " + action + "={() => renderSafeguard()} />; } function renderSafeguard() { return <UnrenderedSafeguard />; }");
        expect(visible(sourceRenderNodes(tree, "View"))).toEqual(["button"]);
    });
    it("admits a direct row renderer inside the returned map callback", () => {
        const tree = source("function View({ rows }) { return <section>{rows.map(row => renderRow(row))}</section>; } function renderRow(row) { return <RenderedRow id={row.id} />; }");
        expect(visible(sourceRenderNodes(tree, "View"))).toEqual(["RenderedRow", "section"]);
    });

});
