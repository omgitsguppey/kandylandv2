import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
    DROP_COUNTDOWN_ONE_DAY_MS,
    DROP_COUNTDOWN_ONE_HOUR_MS,
    DROP_COUNTDOWN_ONE_SECOND_MS,
    formatDropCountdown,
} from "@/lib/drop-countdown";

describe("formatDropCountdown", () => {
    const nowMs = Date.UTC(2026, 4, 1, 12, 0, 0);

    it("keeps human-readable Ends in copy beyond 24 hours", () => {
        expect(formatDropCountdown(nowMs + 6 * DROP_COUNTDOWN_ONE_DAY_MS, nowMs)).toMatchObject({
            visibleLabel: "Ends in 6 days",
            fullLabel: "Ends in 6 days",
            isCountdownOnly: false,
        });
    });

    it("shows countdown-only copy exactly at 24 hours", () => {
        const label = formatDropCountdown(nowMs + DROP_COUNTDOWN_ONE_DAY_MS, nowMs);

        expect(label.visibleLabel).toBe("24:00:00");
        expect(label.visibleLabel).not.toContain("Ends in");
        expect(label.fullLabel).toBe("Ends in 24 hours, 0 minutes, 0 seconds");
        expect(label.isCountdownOnly).toBe(true);
    });

    it("shows HH:MM:SS countdown-only copy under 24 hours", () => {
        const label = formatDropCountdown(
            nowMs + 4 * DROP_COUNTDOWN_ONE_HOUR_MS + 12 * 60 * 1000 + 9 * DROP_COUNTDOWN_ONE_SECOND_MS,
            nowMs,
        );

        expect(label.visibleLabel).toBe("04:12:09");
        expect(label.visibleLabel).not.toContain("Ends in");
        expect(label.isCountdownOnly).toBe(true);
    });

    it("keeps expired and invalid values out of fake countdown states", () => {
        expect(formatDropCountdown(nowMs - DROP_COUNTDOWN_ONE_SECOND_MS, nowMs)).toMatchObject({
            visibleLabel: "Expired",
            isCountdownOnly: false,
        });
        expect(formatDropCountdown(undefined, nowMs)).toMatchObject({
            visibleLabel: "Always",
            fullLabel: "Always available",
            isCountdownOnly: false,
        });
        expect(formatDropCountdown(Number.NaN, nowMs)).toMatchObject({
            visibleLabel: "Always",
            fullLabel: "Always available",
            isCountdownOnly: false,
        });
    });
});

describe("drop card countdown UI contract", () => {
    it("keeps timer typography on the inherited site font and preserves core drop-card pieces", () => {
        const componentPath = join(process.cwd(), "src", "components", "DropCardParts.tsx");
        const layoutPath = join(process.cwd(), "src", "components", "DropCardLayout.tsx");
        const timerSource = readFileSync(componentPath, "utf8");
        const layoutSource = readFileSync(layoutPath, "utf8");

        expect(timerSource).not.toContain("font-mono");
        expect(timerSource).not.toContain("font-[ui-monospace");
        expect(timerSource).toContain("formatDropCountdown");
        expect(layoutSource).toContain("DropCardTimer");
        expect(layoutSource).toContain("FileCountChip");
        expect(layoutSource).toContain("drop.unlockCost");
        expect(layoutSource).toContain("ctaButton");
    });
});
