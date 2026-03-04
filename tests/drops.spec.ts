import { test, expect } from '@playwright/test';

test.describe('Drops Feed Critical Path', () => {
    test('Drops page loads and renders items or empty state', async ({ page }) => {
        await page.goto('/drops');

        // We expect the main Drops header
        await expect(page.getByRole('heading', { name: /All KandyDrops|Search Results/i })).toBeVisible();

        // Either drops load or "The Candy Shop is Empty" state loads
        const hasDrops = await page.locator('[id^="drop-"]').count() > 0;

        if (hasDrops) {
            // Validate at least one drop card renders correctly
            await expect(page.locator('[id^="drop-"]').first()).toBeVisible();
        } else {
            // Validate empty state renders
            await expect(page.getByText(/The Candy Shop is Empty/i)).toBeVisible();
        }
    });
});
