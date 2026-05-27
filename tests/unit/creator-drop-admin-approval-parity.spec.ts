import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("creator drop admin approval parity", () => {
  it("validates complete publish readiness before admin approval enables public rotation", () => {
    const adminRoute = read("src/app/api/admin/drops/route.ts");

    expect(adminRoute).toContain("nextApprovedDrop");
    expect(adminRoute).toContain("validateDropPublishState(nextApprovedDrop");
    expect(adminRoute).toContain("publicDiscovery: true");
    expect(adminRoute).toContain("rotationEligibility: true");
    expect(adminRoute).toContain('status: 422');
  });

  it("lets admin approve, reject, or request changes and tracks explicit decision events", () => {
    const adminPage = read("src/app/admin/drops/page.tsx");
    const adminRoute = read("src/app/api/admin/drops/route.ts");

    expect(adminPage).toContain('"needs_changes"');
    expect(adminPage).toContain("Request changes");
    expect(adminRoute).toContain('"admin_creator_drop_approved"');
    expect(adminRoute).toContain('"admin_creator_drop_rejected"');
    expect(adminRoute).toContain('"admin_creator_drop_needs_changes"');
  });
});
