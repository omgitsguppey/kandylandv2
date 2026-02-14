import { test, expect } from '@playwright/test';

test.describe('Visual Audit', () => {

    test('Home Page - Hero Section', async ({ page }) => {
        await page.goto('/');
        // Wait for any animations or data loading
        await page.waitForTimeout(2000);

        // Capture the top viewport (Hero)
        await expect(page).toHaveScreenshot('home-hero.png', {
            maxDiffPixels: 100, // Allow tiny rendering differences
            fullPage: false
        });
    });

    test('Drops Page - Grid Layout', async ({ page }) => {
        await page.goto('/drops');
        await page.waitForTimeout(2000);

        // Capture the full page to see the grid layout
        await expect(page).toHaveScreenshot('drops-grid.png', {
            fullPage: true
        });
    });

    // Only run this on Desktop usually, but good to check responsiveness if permitted
    test('Admin Login - Layout', async ({ page }) => {
        await page.goto('/admin');
        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot('admin-login.png');
    });

});
