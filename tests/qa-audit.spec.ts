import fs from "fs";
import path from "path";

import { chromium, test } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(__dirname, "..", "qa-screenshots");

const PAGES = [
    { name: "home", path: "/" },
    { name: "experiences", path: "/experiences" },
] as const;

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureWithViewport(
    browserType: "desktop" | "mobile" | "tablet",
    viewport: { width: number; height: number },
    isMobile = false,
) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport,
        isMobile,
        hasTouch: isMobile,
        colorScheme: "dark",
        javaScriptEnabled: true,
    });

    for (const targetPage of PAGES) {
        const page = await context.newPage();

        try {
            await page.goto(`${BASE_URL}${targetPage.path}`, {
                waitUntil: "domcontentloaded",
                timeout: 30_000,
            });

            await page.waitForFunction(() => {
                const backgroundColor = getComputedStyle(document.body).backgroundColor;
                return backgroundColor !== "rgba(0, 0, 0, 0)"
                    && backgroundColor !== "rgb(255, 255, 255)"
                    && backgroundColor !== "";
            }, { timeout: 15_000 }).catch(() => {
                console.log(`CSS did not finish loading for ${targetPage.name}; capturing anyway.`);
            });

            await page.waitForTimeout(3_000);

            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, `${browserType}-${targetPage.name}.png`),
                fullPage: true,
            });

            console.log(`Captured ${browserType}-${targetPage.name}`);
        } catch (error) {
            console.error(`Failed ${browserType}-${targetPage.name}:`, error);
        } finally {
            await page.close();
        }
    }

    await browser.close();
}

test("Desktop screenshots (1440x900)", async () => {
    await captureWithViewport("desktop", { width: 1440, height: 900 });
});

test("Mobile screenshots (393x852)", async () => {
    await captureWithViewport("mobile", { width: 393, height: 852 }, true);
});

test("Tablet screenshots (1024x1366)", async () => {
    await captureWithViewport("tablet", { width: 1024, height: 1366 }, true);
});
