import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { KnownAccessibilityBaseline } from "./known-accessibility-baseline";

export async function openAuditSurface(page: Page, targetPath: string, readySelector: string) {
  await page.goto(targetPath);
  const readyTarget = page.locator(readySelector).first();
  await expect(readyTarget).toBeVisible();
  await readyTarget.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
}

export async function expectNoAxeViolations(page: Page, selector = "main") {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .analyze();

  expect(
    results.violations,
    results.violations
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`)
      .join("\n"),
  ).toEqual([]);
}

export async function expectAxeViolationsToMatchBaseline(
  page: Page,
  baseline: KnownAccessibilityBaseline[],
  selector = "main",
  projectName?: string,
) {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .analyze();

  const actual = results.violations
    .map((violation) => ({
      id: violation.id,
      actualCount: violation.nodes.length,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const expected = baseline
    .map((violation) => ({
      id: violation.id,
      actualCounts: violation.expectedCounts
        ?? [
          projectName && violation.expectedCountByProject
            ? violation.expectedCountByProject[projectName] ?? violation.expectedCount ?? 0
            : violation.expectedCount ?? 0,
        ],
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  expect(actual.map((violation) => violation.id), JSON.stringify(results.violations, null, 2)).toEqual(
    expected.map((violation) => violation.id),
  );

  expected.forEach((violation) => {
    const matchingViolation = actual.find((entry) => entry.id === violation.id);
    expect(
      violation.actualCounts.includes(matchingViolation?.actualCount ?? -1),
      JSON.stringify(results.violations, null, 2),
    ).toBe(true);
  });
}
