import { describe, expect, it } from "vitest";

import { findNonCanonical404Lines } from "../../scripts/check-not-found-contracts";

describe("API not-found source contract", () => {
  it("accepts a canonical 404 body with route evidence", () => {
    const source = `return NextResponse.json({
      ...ROUTE_EVIDENCE,
      ...buildNotFoundBody("asset", "File not found", "file_not_found"),
    }, { status: 404 });`;

    expect(findNonCanonical404Lines(source)).toEqual([]);
  });

  it("identifies a direct 404 body even when another branch uses the helper", () => {
    const source = `
      if (missingFile) return NextResponse.json(buildNotFoundBody("file", "File missing"), { status: 404 });
      return NextResponse.json({ error: "Missing", errorCode: "missing" }, { status: 404 });
    `;

    expect(findNonCanonical404Lines(source)).toEqual([3]);
  });
});
