import { describe, expect, it } from "vitest";

import {
  buildWalletFunnelSampleCleanupReport,
  validateWalletFunnelSampleCleanupReport,
} from "../../scripts/agent/tracking-runtime-surface-status-cleanup-shared";

describe("wallet funnel sample cleanup", () => {
  it("distinguishes source-ready no sample from unavailable runtime", () => {
    const report = buildWalletFunnelSampleCleanupReport({ sourceEventsMapped: true, sampleLoaded: false });

    expect(validateWalletFunnelSampleCleanupReport(report)).toEqual([]);
    expect(report.walletFunnelStatusBefore).toBe("live_unavailable");
    expect(report.walletFunnelStatusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.paymentRuntimeChanged).toBe(false);
  });
});
