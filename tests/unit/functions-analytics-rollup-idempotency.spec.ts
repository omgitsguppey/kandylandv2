import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("Functions analytics rollup idempotency", () => {
  it("guards transaction commerce rollup increments with a projection receipt", () => {
    const source = readSource("functions/src/analytics-transactions.ts");
    const receiptIndex = source.indexOf("analytics_projection_receipts");
    const receiptCreateIndex = source.indexOf("batch.create(projectionReceiptRef");
    const commitIndex = source.indexOf("await batch.commit()");
    const runtimeTouchIndex = source.indexOf("await touchAnalyticsRuntime(timestamp)");

    expect(receiptIndex).toBeGreaterThan(-1);
    expect(source).toContain("transactions:${event.id}:commerce_rollup");
    expect(source).toContain("Duplicate transaction rollup skipped");
    expect(source).toContain("isFirestoreAlreadyExists");
    expect(receiptCreateIndex).toBeGreaterThan(-1);
    expect(commitIndex).toBeGreaterThan(receiptCreateIndex);
    expect(runtimeTouchIndex).toBeGreaterThan(commitIndex);
  });
});
