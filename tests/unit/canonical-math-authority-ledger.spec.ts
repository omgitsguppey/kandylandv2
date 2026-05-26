import { describe, expect, it } from "vitest";

import {
  CANONICAL_MATH_FORMULA_REFERENCES,
  REQUIRED_FORMULA_SOURCE_PATHS,
  classifyUnownedFormula,
  explainFormula,
  getFormulaDefinition,
  listFormulaDefinitions,
  listFormulaSourceInventory,
  requireFormulaDefinition,
  validateMetricHasFormula,
  validateScoreHasFormula,
} from "@/lib/math/canonical-math-authority-ledger";

describe("canonical math authority ledger", () => {
  it("registers all source-defined math domains without inventing formulas", () => {
    const domains = new Set(listFormulaDefinitions().map((formula) => formula.domain));

    expect([...domains]).toEqual(expect.arrayContaining([
      "beta_score",
      "user_metrics",
      "global_metrics",
      "session_metrics",
      "watch_time",
      "bounce",
      "revenue",
      "gumdrop",
      "creator_monetization",
      "fan_pass",
      "discovery",
      "chat",
      "daily_tasks",
      "notifications",
      "media",
      "legacy_recovery",
    ]));
    expect(CANONICAL_MATH_FORMULA_REFERENCES.some((entry) => entry.status === "needs_operator_decision")).toBe(true);
  });

  it("inventories required formula-bearing source paths before later normalization phases", () => {
    const inventory = listFormulaSourceInventory();
    const sourcePaths = new Set(inventory.map((entry) => entry.sourcePath));

    expect([...sourcePaths]).toEqual(expect.arrayContaining([...REQUIRED_FORMULA_SOURCE_PATHS]));
    expect(inventory.find((entry) => entry.sourcePath === "scripts/agent/score-code-organization.ts")).toMatchObject({
      status: "needs_operator_decision",
    });
    expect(inventory.find((entry) => entry.sourcePath === "agent/state/public-beta-score.generated.json")).toMatchObject({
      status: "stale",
    });
    expect(inventory.every((entry) => entry.detectedFormulaKinds.length > 0 && entry.formulaIds.length > 0)).toBe(true);
  });

  it("requires score dimensions to carry weight, formula, cap, penalty, and blocker metadata", () => {
    const sourceHealth = requireFormulaDefinition("beta_score.source_health");
    const scannerPenalty = requireFormulaDefinition("beta_score.scanner_penalty");

    expect(validateScoreHasFormula("sourceHealth")).toEqual(expect.objectContaining({ ok: true }));
    expect(sourceHealth.scoreImpact).toMatchObject({
      scoreId: "sourceHealth",
      weight: 25,
      cap: "launch/evidence caps apply after weighted health score",
      penalty: "source gates missing or scanner penalties reduce score",
      blockerType: "source_or_evidence_gate",
    });
    expect(scannerPenalty.formulaExpression).toContain("severityPenalty * confidence * blastRadiusMultiplier");
    expect(scannerPenalty.dedupeKey).toContain("filePath");
  });

  it("defines rate formulas with numerator, denominator, window, and zero denominator behavior", () => {
    const freshness = requireFormulaDefinition("beta_score.freshness_score");

    expect(freshness.numerator).toContain("fresh evidence gate count");
    expect(freshness.denominator).toContain("total evidence gate count");
    expect(freshness.timeWindow).toContain("24h");
    expect(freshness.zeroDenominatorRule).not.toBe("n/a");
  });

  it("keeps counts integer and deduped by canonical keys", () => {
    const personMetrics = requireFormulaDefinition("person_metrics.hydrated_event_count");
    const behavioralFacts = requireFormulaDefinition("behavioral_event_fact.deduped_count");

    expect(personMetrics.countRule).toBe("integer");
    expect(personMetrics.dedupeKey).toContain("eventId");
    expect(behavioralFacts.countRule).toBe("integer");
    expect(behavioralFacts.dedupeKey).toContain("dedupeKey");
  });

  it("separates active, passive, idle, hidden, playback, and unknown durations", () => {
    const sessionActive = requireFormulaDefinition("session_metrics.active_session_time");
    const watchActive = requireFormulaDefinition("watch_time.active_watch_ms");

    expect(sessionActive.durationStates).toEqual(expect.arrayContaining(["active", "passive", "idle", "hidden", "unknown"]));
    expect(watchActive.durationStates).toEqual(expect.arrayContaining(["active", "passive", "hidden", "playback", "unknown"]));
    expect(watchActive.formulaExpression).toContain("video/audio use playingMs");
  });

  it("preserves paid, reward, bonus, source-of-funds, and confidence metadata for revenue and GumDrops", () => {
    const gumdrop = requireFormulaDefinition("gumdrop.source_of_funds_balance");
    const revenue = requireFormulaDefinition("revenue.server_verified_revenue");

    expect(gumdrop.valueSourceBreakdown).toEqual(expect.arrayContaining(["paid_gd", "reward_gd", "bonus_gd", "source_of_funds", "confidence"]));
    expect(gumdrop.authorityStatus).toBe("needs_operator_decision");
    expect(revenue.sourceTruth).toContain("server transaction");
    expect(revenue.confidenceRule).toContain("exact only");
  });

  it("blocks legacy data from becoming exact without exact source identity or event truth", () => {
    const legacy = requireFormulaDefinition("legacy_recovery.legacy_event_recovered_count");

    expect(legacy.legacyRule).toContain("cannot become exact");
    expect(legacy.confidenceRule).toContain("downgrade");
  });

  it("keeps user and global metric divergence explicit", () => {
    const globalMetric = requireFormulaDefinition("global_metrics.event_fact_count");
    const userMetric = requireFormulaDefinition("user_metrics.event_fact_count");

    expect(globalMetric.globalUserDivergenceRule).toContain("global dedupe");
    expect(userMetric.globalUserDivergenceRule).toContain("user dedupe");
  });

  it("validates metric references and flags unowned formulas for operator decision", () => {
    expect(validateMetricHasFormula("runtime_watch_sessions")).toMatchObject({ ok: true });
    expect(validateMetricHasFormula("unknown_metric")).toMatchObject({
      ok: false,
      status: "missing_definition",
    });
    expect(classifyUnownedFormula({ formulaId: "custom_formula", sourcePath: "src/example.ts" })).toMatchObject({
      status: "needs_operator_decision",
    });
  });

  it("explains formulas with enough source and confidence context for user/admin display", () => {
    expect(explainFormula("watch_time.normalized_watch_percent")).toContain("zeroDenominatorRule");
    expect(explainFormula("watch_time.normalized_watch_percent")).toContain("confidenceRule");
    expect(getFormulaDefinition("missing.formula")).toBeNull();
  });

  it("requires every admin-facing formula to declare freshness semantics", () => {
    const adminFacing = listFormulaDefinitions().filter((formula) => formula.adminFacingAllowed);

    expect(adminFacing.length).toBeGreaterThan(0);
    for (const formula of adminFacing) {
      expect(formula.freshnessRule, formula.formulaId).toBeTruthy();
      expect(explainFormula(formula.formulaId)).toContain("freshnessRule");
    }
  });
});
