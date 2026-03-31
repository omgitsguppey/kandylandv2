import { test, expect } from '@playwright/test';

test.describe('Guest Dismissal Sync Error', () => {
    test('Modal should close even if the dismissal tracking fails', async ({ page }) => {
        // Mock the guest dismissal API to fail with a 500 status
        await page.route('**/api/user/guest-dismissal', route => {
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Internal Server Error' }),
            });
        });

        await page.goto('/');

        // Open the Auth Modal — normally this would be triggered by an action like clicking a Login button
        // For the purposes of this test, we identify an auth trigger and click it.
        const authButton = page.getByRole('button', { name: /Sign Up|Login|Sign In/i }).first();
        await authButton.click();

        // Verify the modal has appeared
        const modal = page.locator('div[role="dialog"], .fixed.inset-0.z-50').filter({ hasText: /Welcome Back|Unwrap your Kandy/i });
        await expect(modal).toBeVisible();

        // Locate and click the close (X) button within the modal
        const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') });
        await closeButton.click();

        // Ensure the modal closes regardless of the tracking network failure
        await expect(modal).not.toBeVisible();
    });
});
