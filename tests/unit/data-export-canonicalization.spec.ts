import { describe, expect, it } from "vitest";

import {
  DATA_EXPORT_SECTIONS,
  validateDataExportCanonicalization,
} from "@/lib/privacy-data/data-export-contract";

describe("data export canonicalization", () => {
  it("maps export sections to source, confidence, redaction, retention, and privacy class", () => {
    expect(validateDataExportCanonicalization()).toEqual([]);
    expect(DATA_EXPORT_SECTIONS.map((section) => section.sectionKey)).toEqual(
      expect.arrayContaining(["profile_account", "wallet_gumdrop_ledger_summary", "support_report_issue_records", "behavioral_journey_summary"]),
    );
    for (const section of DATA_EXPORT_SECTIONS) {
      expect(section.privacyClass).toBeTruthy();
      expect(section.source).toBeTruthy();
      expect(section.confidence).toBeTruthy();
      expect(section.redactionPolicy).not.toContain("raw token");
    }
  });

  it("does not export raw provider ids, push tokens, storage paths, private chat, or exact legacy data", () => {
    const serialized = JSON.stringify(DATA_EXPORT_SECTIONS);

    expect(serialized).not.toMatch(/raw provider|raw push token|raw storage path|raw private chat|legacy exact/iu);
    expect(serialized).toContain("legacy_unknown_review");
    expect(serialized).toContain("redacted");
  });
});
