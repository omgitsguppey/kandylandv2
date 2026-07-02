import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validateUiSurfaceCoveragePayload } from "../../scripts/agent/check-ui-surface-coverage";

type UiSurfaceFixture = Parameters<typeof validateUiSurfaceCoveragePayload>[0]["surfaces"][number];

function sourceCoveredSurface(overrides: Partial<UiSurfaceFixture> = {}): UiSurfaceFixture {
  return {
    route_or_component: "src/app/page.tsx",
    criticality: "critical",
    blocking_required: true,
    source_readiness_owner: "scripts/agent/check-ui-surface-coverage.ts",
    optional_browser_reproduction_owner: null,
    playwright_owner: null,
    existing_tests: ["tests/unit/source-route-contract.spec.ts"],
    hydration_mode: "static",
    runtime_canary: {
      protected: false,
      helper_paths: [],
    },
    audit_target: {
      auth_required: "none",
      source_route_contract_selector: "main",
      hydration_marker: "main",
      expected_anchors: ["KandyDrops"],
    },
    ...overrides,
  } as UiSurfaceFixture;
}

describe("UI surface coverage source-first schema", () => {
  it("clears source readiness with source selectors without requiring a Playwright owner", () => {
    const failures = validateUiSurfaceCoveragePayload({
      surfaces: [sourceCoveredSurface()],
    });

    expect(failures).toEqual([]);
  });

  it("does not require admin source readiness to name an optional browser reproduction owner", () => {
    const failures = validateUiSurfaceCoveragePayload({
      surfaces: [
        sourceCoveredSurface({
          route_or_component: "src/app/admin/page.tsx",
          criticality: "high",
          blocking_required: false,
          existing_tests: ["tests/unit/admin-source-contract.spec.ts"],
          audit_target: {
            auth_required: "admin",
            source_route_contract_selector: "main",
            hydration_marker: "main",
            expected_anchors: ["Admin"],
          },
        }),
      ],
    });

    expect(failures).toEqual([]);
  });

  it("reports missing source selectors instead of browser ownership gaps", () => {
    const failures = validateUiSurfaceCoveragePayload({
      surfaces: [
        sourceCoveredSurface({
          audit_target: {
            auth_required: "none",
            source_route_contract_selector: "",
            hydration_marker: "main",
            expected_anchors: ["KandyDrops"],
          },
        }),
      ],
    });

    expect(failures).toContain("src/app/page.tsx has an audit target without a source route contract selector.");
    expect(failures.join("\n")).not.toMatch(/Playwright owner|screenshot/iu);
  });

  it("requires source-first fields in the artifact schema while leaving browser aliases optional", () => {
    const schema = JSON.parse(readFileSync(join(process.cwd(), "agent/schemas/ui-surface-coverage.schema.json"), "utf8"));
    const surfaceRequired = schema.properties.surfaces.items.required;
    const auditTargetObject = schema.properties.surfaces.items.properties.audit_target.anyOf.find(
      (entry: { type?: string }) => entry.type === "object",
    );

    expect(surfaceRequired).toContain("source_readiness_owner");
    expect(surfaceRequired).toContain("optional_browser_reproduction_owner");
    expect(surfaceRequired).not.toContain("playwright_owner");
    expect(auditTargetObject.required).toEqual(expect.arrayContaining([
      "source_route_contract_selector",
      "hydration_marker",
      "optional_browser_reproduction_selector",
    ]));
    expect(auditTargetObject.required).not.toContain("screenshot_selector");
  });
});
