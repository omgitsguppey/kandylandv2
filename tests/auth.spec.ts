import { test, expect } from '@playwright/test';

test.describe('Authentication Critical Path', () => {
    test('Landing page loads and Global Auth Modal can open', async ({ page }) => {
        await page.goto('/');

        // Check main heading exists
        await expect(page.locator('h1').first()).toBeVisible();

        // Find the Sign Up / Login button in the navbar or hero and click it
        const authButton = page.getByRole('button', { name: /Sign Up|Login|Sign In/i }).first();
        await authButton.click();

        // Auth Modal should appear
        const modalHeading = page.getByRole('heading', { name: /Welcome to KandyDrops/i });
        await expect(modalHeading).toBeVisible();

        // Should have Google and Email options
        await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Continue with Email/i })).toBeVisible();
    });
});
