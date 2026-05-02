import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const manifestPath = path.join(process.cwd(), "public/manifest.json");
const manifestSource = fs.readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(manifestSource) as {
    name?: string;
    short_name?: string;
    start_url?: string;
    scope?: string;
    display?: string;
    theme_color?: string;
    background_color?: string;
    icons?: Array<{ src?: string; sizes?: string; type?: string; purpose?: string }>;
};

describe("PWA manifest", () => {
    it("keeps launch install metadata on valid app routes", () => {
        expect(manifest.name).toBe("KandyDrops");
        expect(manifest.short_name).toBe("KandyDrops");
        expect(manifest.start_url).toBe("/drops?source=pwa");
        expect(manifest.scope).toBe("/");
        expect(manifest.display).toBe("standalone");
        expect(manifest.theme_color).toBe("#000000");
        expect(manifest.background_color).toBe("#000000");
    });

    it("references current install icons and no obsolete starter assets", () => {
        const iconSources = new Set((manifest.icons ?? []).map((icon) => icon.src));

        expect(iconSources.has("/icon-192x192.png")).toBe(true);
        expect(iconSources.has("/icon-512x512.png")).toBe(true);
        expect(fs.existsSync(path.join(process.cwd(), "public/icon-192x192.png"))).toBe(true);
        expect(fs.existsSync(path.join(process.cwd(), "public/icon-512x512.png"))).toBe(true);

        for (const obsoleteAsset of ["next.svg", "vercel.svg", "file.svg", "globe.svg", "window.svg"]) {
            expect(manifestSource).not.toContain(obsoleteAsset);
        }
    });
});
