import { describe, expect, it } from "vitest";

import {
  TELEMETRY_INTENT_ALIASES,
  validateTelemetryIntentAliases,
} from "../../src/lib/analytics/telemetry-intent-aliases";
import {
  buildTelemetryDuplicateIntentClassificationReport,
  validateTelemetryDuplicateIntentClassificationReport,
} from "../../scripts/agent/debug-cockpit-batch14-shared";

describe("telemetry duplicate intent classification", () => {
  it("preserves drop preview event history while grouping the shared intent", () => {
    const alias = TELEMETRY_INTENT_ALIASES.find((entry) => entry.canonicalIntentId === "drop_preview_view");

    expect(alias).toBeDefined();
    expect(alias?.eventNames).toEqual(["drop_preview_opened", "drop_preview_page_viewed"]);
    expect(alias?.classification).toBe("potential_duplicate_intent");
    expect(alias?.renameAllowed).toBe(false);
    expect(alias?.historicalStatus).toBe("history_preserved");
    expect(alias?.dedupePolicy).toContain("same user/session/drop");
    expect(validateTelemetryIntentAliases()).toEqual([]);
  });

  it("reports the duplicate intent as classified without renaming catalog events", () => {
    const report = buildTelemetryDuplicateIntentClassificationReport();

    expect(report.status).toBe("telemetry_alias_classified");
    expect(report.eventsRenamed).toBe(false);
    expect(report.materializerDedupePolicy).toBe("alias_required_no_double_count");
    expect(validateTelemetryDuplicateIntentClassificationReport(report)).toEqual([]);
  });
});
