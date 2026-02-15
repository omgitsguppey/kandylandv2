import { test, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '..', 'qa-screenshots');
const BASE_URL = 'http://localhost:3000';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Pages to test
const PAGES = [
    { name: 'home', path: '/' },
    { name: 'experiences', path: '/experiences' },
];

async function captureWithViewport(
    browserType: 'desktop' | 'mobile' | 'tablet',
    viewport: { width: number; height: number },
    isMobile: boolean = false
) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport,
        isMobile,
        hasTouch: isMobile,
        colorScheme: 'dark',
        // Force JavaScript to be enabled — this ensures CSS-in-JS styles load
        javaScriptEnabled: true,
    });

    for (const pg of PAGES) {
        const page = await context.newPage();

        try {
            // Navigate with domcontentloaded first, then wait for full load
            await page.goto(`${BASE_URL}${pg.path}`, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // Wait for CSS to actually apply by checking for dark background
            await page.waitForFunction(() => {
                const body = document.body;
                const bg = getComputedStyle(body).backgroundColor;
                // Check if background is NOT white/transparent (i.e., CSS has loaded)
                return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 255, 255)' && bg !== '';
            }, { timeout: 15000 }).catch(() => {
                console.log(`CSS didn't load for ${pg.name}, capturing anyway`);
            });

            // Extra buffer for rendering
            await page.waitForTimeout(3000);

            // Take screenshot
            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, `${browserType}-${pg.name}.png`),
                fullPage: true,
            });

            console.log(`✅ Captured ${browserType}-${pg.name}`);
        } catch (err) {
            console.error(`❌ Failed ${browserType}-${pg.name}:`, err);
        }

        await page.close();
    }

    await browser.close();
}

test('Desktop screenshots (1440x900)', async () => {
    await captureWithViewport('desktop', { width: 1440, height: 900 });
});

test('Mobile screenshots (393x852)', async () => {
    await captureWithViewport('mobile', { width: 393, height: 852 }, true);
});

test('Tablet screenshots (1024x1366)', async () => {
    await captureWithViewport('tablet', { width: 1024, height: 1366 }, true);
});
