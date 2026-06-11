import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  ADMIN_BROWSER_SURFACE_DEFINITIONS,
  type AdminBrowserSurfaceDefinition,
  type AdminBrowserSurfaceDeviceBand,
} from "../../src/lib/admin/admin-browser-surface-map";

const ENABLED = process.env.ADMIN_BROWSER_SMOKE === "1";
const STORAGE_STATE = process.env.ADMIN_BROWSER_SMOKE_STORAGE_STATE?.trim();
const EVIDENCE_DIR = process.env.ADMIN_BROWSER_SMOKE_EVIDENCE_DIR?.trim();
const MARKER_TIMEOUT_MS = Number(process.env.ADMIN_BROWSER_SMOKE_MARKER_TIMEOUT_MS ?? "2500");

function projectDeviceBand(projectName: string): AdminBrowserSurfaceDeviceBand {
  return /mobile|iphone|pixel/iu.test(projectName) ? "mobile" : "desktop";
}

function quoteAttributeValue(value: string) {
  return value.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"');
}

function markerLocator(page: Page, marker: string): Locator {
  const normalized = marker.trim();
  if (normalized.startsWith("data-")) {
    const [attributeName, ...valueParts] = normalized.split("=");
    if (valueParts.length > 0) {
      return page.locator(`[${attributeName}="${quoteAttributeValue(valueParts.join("="))}"]`).first();
    }
    return page.locator(`[${attributeName}]`).first();
  }
  return page.getByText(normalized, { exact: false }).first();
}

async function expectAnyAuthenticatedMarker(page: Page, surface: AdminBrowserSurfaceDefinition) {
  const errors: string[] = [];

  for (const marker of surface.authenticatedVisibleMarkers) {
    const locator = markerLocator(page, marker);
    try {
      await expect(locator).toBeVisible({ timeout: MARKER_TIMEOUT_MS });
      return marker;
    } catch (error) {
      errors.push(`${marker}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
    }
  }

  throw new Error([
    `No authenticated marker was visible for ${surface.surfaceId}.`,
    `Expected one of: ${surface.authenticatedVisibleMarkers.join(" | ")}`,
    `Failures: ${errors.join(" / ")}`,
  ].join(" "));
}

function writeSurfaceEvidence(input: {
  surface: AdminBrowserSurfaceDefinition;
  deviceBand: AdminBrowserSurfaceDeviceBand;
  checkedAtUtc: string;
  urlAfterNavigation: string;
  selectorUsed: string;
  visibleMarker: string;
}) {
  if (!EVIDENCE_DIR) return;

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const fileName = `${input.surface.surfaceId}.${input.deviceBand}.json`;
  const payload = {
    surfaceId: input.surface.surfaceId,
    route: input.surface.browserSmokePath,
    deviceBand: input.deviceBand,
    state: "authenticated_surface_verified",
    checkedAtUtc: input.checkedAtUtc,
    urlAfterNavigation: input.urlAfterNavigation,
    selectorUsed: input.selectorUsed,
    visibleMarker: input.visibleMarker,
    note: "Captured by opt-in authenticated admin browser smoke. This local evidence does not clear provider, deployed runtime, admin truth, payment, or GumDrop gates.",
  };

  writeFileSync(join(EVIDENCE_DIR, fileName), `${JSON.stringify(payload)}\n`);
}

test.describe("authenticated admin browser surface smoke", () => {
  test.skip(
    !ENABLED || !STORAGE_STATE,
    "Set ADMIN_BROWSER_SMOKE=1 and ADMIN_BROWSER_SMOKE_STORAGE_STATE=<path> to run authenticated admin browser smoke.",
  );

  test.use({ storageState: STORAGE_STATE || undefined });

  for (const surface of ADMIN_BROWSER_SURFACE_DEFINITIONS) {
    for (const deviceBand of surface.deviceBands) {
      test(`${surface.surfaceId} renders ${deviceBand} authenticated surface contract`, async ({ page }, testInfo) => {
        test.skip(
          projectDeviceBand(testInfo.project.name) !== deviceBand,
          `Surface ${surface.surfaceId} ${deviceBand} smoke only runs on matching device-band projects.`,
        );

        const selector = surface.authenticatedSelectors[0];
        expect(selector, `${surface.surfaceId} must declare a canonical authenticated selector`).toBeTruthy();

        await page.goto(surface.browserSmokePath);
        await expect(page.locator(selector).first()).toBeVisible({ timeout: 15000 });
        await expect(page.locator(selector).first()).toHaveAttribute("data-admin-browser-route", surface.route, { timeout: 15000 });

        const visibleMarker = await expectAnyAuthenticatedMarker(page, surface);
        await expect(page.getByText(/public_home_kandydrops/i)).toHaveCount(0);

        writeSurfaceEvidence({
          surface,
          deviceBand,
          checkedAtUtc: new Date().toISOString(),
          urlAfterNavigation: new URL(page.url()).pathname,
          selectorUsed: selector,
          visibleMarker,
        });
      });
    }
  }
});
