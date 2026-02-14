import { test, expect } from '@playwright/test';

test('homepage visual check', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/KandyDrops/);

    // Wait for animations to settle
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: `screenshots/${test.info().project.name}-home.png`, fullPage: true });
});
