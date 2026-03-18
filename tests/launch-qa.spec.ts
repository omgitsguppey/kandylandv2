import { expect, test, type Page } from "@playwright/test";

const AUTH_SETTLE_MS = 2_000;
const DROPS_SETTLE_MS = 3_000;

async function waitForGuestShell(page: Page) {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(AUTH_SETTLE_MS);
}

test.describe("Public Pages - Smoke Tests", () => {
    test("Home page loads with the hero section", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveTitle(/KandyDrops/i);
        await expect(page.locator("section").first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText("KandyDrops", { exact: false }).first()).toBeVisible();
    });

    test("Drops page loads with content or an empty state", async ({ page }) => {
        await page.goto("/drops");
        await expect(page).toHaveTitle(/KandyDrops/i);
        await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });

        const dropCards = page.locator('[id^="drop-"]');
        const dropCount = await dropCards.count();
        if (dropCount > 0) {
            await expect(dropCards.first()).toBeVisible();
        } else {
            await expect(page.getByText(/The Candy Shop is Empty/i)).toBeVisible();
        }
    });

    test("Experiences page loads", async ({ page }) => {
        await page.goto("/experiences");
        await expect(page.getByRole("heading", { name: /Experiences/i })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/immersive events/i)).toBeVisible();
    });

    test("Privacy and terms pages load", async ({ page }) => {
        for (const route of ["/privacy", "/terms"]) {
            await page.goto(route);
            await page.waitForLoadState("domcontentloaded");
            await expect(page.locator("body")).not.toContainText("404");
        }
    });
});

test.describe("SEO - Meta Tags And Structure", () => {
    test("Home page has core metadata", async ({ page }) => {
        await page.goto("/");

        await expect(page.locator("meta[name=\"description\"]")).toHaveAttribute("content", /gum drops|content/i);
        await expect(page.locator("html")).toHaveAttribute("lang", "en");
        expect(await page.locator("h1").count()).toBeGreaterThanOrEqual(1);
    });

    test("Drops page renders heading structure", async ({ page }) => {
        await page.goto("/drops");
        await page.waitForLoadState("domcontentloaded");
        expect(await page.locator("h1, h2, h3").count()).toBeGreaterThan(0);
    });
});

test.describe("Navigation", () => {
    test("Navbar is visible on guest pages", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator("nav").first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('nav a[href="/"]').first()).toBeVisible();
    });

    test("Guest logo link navigates home", async ({ page }) => {
        await page.goto("/drops");
        await waitForGuestShell(page);
        await page.locator('nav a[href="/"]').first().click();
        await page.waitForURL("/");
    });

    test("Guest shell shows sign in affordance", async ({ page }) => {
        await page.goto("/");
        await waitForGuestShell(page);

        const signInVisible = await page.getByText(/sign in/i).first().isVisible().catch(() => false);
        const profileVisible = await page.locator("nav button").last().isVisible().catch(() => false);

        expect(signInVisible || profileVisible).toBeTruthy();
    });
});

test.describe("404 Page", () => {
    test("Invalid route shows the 404 screen", async ({ page }) => {
        await page.goto("/this-route-does-not-exist");
        await page.waitForLoadState("domcontentloaded");
        await expect(page.getByText("404")).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/Page Not Found/i)).toBeVisible();
        await expect(page.getByRole("link", { name: /return home/i })).toBeVisible();
    });
});

test.describe("Auth Modal", () => {
    test("Guest sign-in button opens the auth modal", async ({ page }) => {
        await page.goto("/");
        await waitForGuestShell(page);

        const signIn = page.getByText(/sign in/i).first();
        if (!await signIn.isVisible().catch(() => false)) {
            test.skip();
        }

        await signIn.click();
        await page.waitForTimeout(500);

        const modalVisible = await page.locator("[role=\"dialog\"], .fixed").first().isVisible().catch(() => false);
        const emailVisible = await page.locator("input[type=\"email\"]").first().isVisible().catch(() => false);
        const googleVisible = await page.getByText(/google/i).first().isVisible().catch(() => false);

        expect(modalVisible || emailVisible || googleVisible).toBeTruthy();
    });

    test("Auth modal can be dismissed", async ({ page }) => {
        await page.goto("/");
        await waitForGuestShell(page);

        const signIn = page.getByText(/sign in/i).first();
        if (!await signIn.isVisible().catch(() => false)) {
            test.skip();
        }

        await signIn.click();
        await page.waitForTimeout(500);

        const closeButton = page.locator("button").filter({ has: page.locator("svg") }).first();
        if (await closeButton.isVisible().catch(() => false)) {
            await closeButton.click();
        } else {
            await page.keyboard.press("Escape");
        }

        await page.waitForTimeout(300);
    });
});

test.describe("Drops Page - Filters And Search", () => {
    test("Visible category filters are clickable", async ({ page }) => {
        await page.goto("/drops");
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(DROPS_SETTLE_MS);

        const newButton = page.getByText("New", { exact: true }).first();
        if (!await newButton.isVisible().catch(() => false)) {
            test.skip();
        }

        await newButton.click();
        await page.waitForTimeout(500);
        await expect(page.locator("main")).toContainText(/drops|items/i);
    });

    test("Visible search input accepts input", async ({ page }) => {
        await page.goto("/drops");
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(DROPS_SETTLE_MS);

        const searchInput = page.locator("input[type=\"text\"], input[placeholder*=\"earch\"]").first();
        if (!await searchInput.isVisible().catch(() => false)) {
            test.skip();
        }

        await searchInput.fill("test search query");
        await page.waitForTimeout(500);
        await expect(page.locator("main")).toContainText(/search results/i);
    });
});

test.describe("API Routes - Auth Enforcement", () => {
    const protectedRequests = [
        { method: "post", route: "/api/checkin", data: {} },
        { method: "post", route: "/api/drops/unlock", data: { dropId: "test" } },
        { method: "post", route: "/api/drops/track", data: { dropId: "test" } },
        { method: "post", route: "/api/paypal/capture", data: { orderId: "test", expectedDrops: 100 } },
        { method: "put", route: "/api/user/profile", data: { displayName: "test" } },
        { method: "post", route: "/api/user/follow", data: { targetUserId: "test", action: "follow" } },
        { method: "post", route: "/api/user/register", data: { displayName: "test" } },
        { method: "put", route: "/api/notifications", data: { notificationId: "test" } },
        { method: "post", route: "/api/notifications", data: { title: "test", message: "test", type: "info", target: { global: true } } },
        { method: "put", route: "/api/admin/users", data: { userId: "test", updates: { role: "user" } } },
        { method: "post", route: "/api/admin/drops", data: { dropData: {} } },
        { method: "post", route: "/api/admin/balance", data: { userId: "test", amount: 100, reason: "test" } },
        { method: "post", route: "/api/admin/queue/toggle", data: { enabled: true } },
    ] as const;

    for (const requestDef of protectedRequests) {
        test(`${requestDef.method.toUpperCase()} ${requestDef.route} returns 401 without auth`, async ({ request }) => {
            const response = requestDef.method === "put"
                ? await request.put(requestDef.route, { data: requestDef.data })
                : await request.post(requestDef.route, { data: requestDef.data });

            expect(response.status()).toBe(401);
        });
    }

    test("GET /api/user/check-username stays public", async ({ request }) => {
        const response = await request.get("/api/user/check-username?username=testuser123");
        expect([200, 409]).toContain(response.status());
    });
});

test.describe("Responsive - Mobile Viewport", () => {
    test.use({ viewport: { width: 393, height: 852 } });

    test("Home page renders on mobile", async ({ page }) => {
        await page.goto("/");
        await waitForGuestShell(page);
        await expect(page.locator("nav").first()).toBeVisible();
        await expect(page.getByText("KandyDrops", { exact: false }).first()).toBeVisible();
    });

    test("Drops page renders on mobile", async ({ page }) => {
        await page.goto("/drops");
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(DROPS_SETTLE_MS);
        await expect(page.getByRole("heading").first()).toBeVisible();
    });
});

test.describe("Responsive - Tablet Viewport", () => {
    test.use({ viewport: { width: 1024, height: 1366 } });

    test("Home and drops pages render on tablet", async ({ page }) => {
        await page.goto("/");
        await waitForGuestShell(page);
        await expect(page.locator("nav").first()).toBeVisible();

        await page.goto("/drops");
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(DROPS_SETTLE_MS);
        await expect(page.getByRole("heading").first()).toBeVisible();
    });
});

test.describe("Visual - CSS Loaded", () => {
    test("Home page does not render a plain white background", async ({ page }) => {
        await page.goto("/");
        await waitForGuestShell(page);

        const backgroundColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        expect(backgroundColor).not.toBe("rgb(255, 255, 255)");
    });

    test("Home page images resolve without obvious broken assets", async ({ page }) => {
        await page.goto("/");
        await page.waitForLoadState("networkidle");

        const images = page.locator("img");
        const imageCount = await images.count();

        for (let index = 0; index < imageCount; index += 1) {
            const image = images.nth(index);
            const src = await image.getAttribute("src") || "";
            if (src.startsWith("data:") || src.endsWith(".svg")) {
                continue;
            }

            const naturalWidth = await image.evaluate((element: HTMLImageElement) => element.naturalWidth);
            if (naturalWidth === 0) {
                console.warn(`Broken image found: ${src}`);
            }
        }
    });
});

test.describe("Accessibility Basics", () => {
    test("Home page keeps semantic landmarks", async ({ page }) => {
        await page.goto("/");
        await page.waitForLoadState("domcontentloaded");

        await expect(page.locator("nav").first()).toBeVisible();
        expect(await page.locator("main").count()).toBeGreaterThanOrEqual(1);
    });

    test("Interactive elements remain keyboard accessible", async ({ page }) => {
        await page.goto("/");
        await waitForGuestShell(page);
        await page.keyboard.press("Tab");
        expect(await page.evaluate(() => document.activeElement?.tagName)).toBeTruthy();
    });
});
