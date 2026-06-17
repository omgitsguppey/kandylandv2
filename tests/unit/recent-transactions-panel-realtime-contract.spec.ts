import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const PANEL_SOURCE = readFileSync(
  join(__dirname, "../../src/components/Admin/RecentTransactionsPanel.tsx"),
  "utf-8",
);

describe("recent transactions admin snapshot contract", () => {
  it("defaults to verified snapshot mode instead of opening realtime listeners", () => {
    expect(PANEL_SOURCE).toContain('realtimeMode?: "snapshot" | "listener"');
    expect(PANEL_SOURCE).toContain('realtimeMode = "snapshot"');
    expect(PANEL_SOURCE).toContain('const enableRealtime = realtimeMode === "listener"');
    expect(PANEL_SOURCE).toContain('if (!enableRealtime) return "cached"');
  });

  it("keeps Firestore listener and client identity lookups behind explicit realtime mode", () => {
    expect(PANEL_SOURCE).toContain("if (!enableRealtime) return;");
    expect(PANEL_SOURCE).toContain('listenerStatus: !enableRealtime ? "disabled"');
    expect(PANEL_SOURCE).toContain('transactionSource: enableRealtime ? "firestore/transactions" : "overview_snapshot"');
    expect(PANEL_SOURCE).toContain('identitySource: enableRealtime ? "firestore/users" : "overview_snapshot"');
  });

  it("shows missing snapshot identities without issuing a client lookup", () => {
    expect(PANEL_SOURCE).toContain("snapshot_missing_identity");
    expect(PANEL_SOURCE).toContain("resolveDisplayName(transaction, identityMap, enableRealtime)");
  });
});
