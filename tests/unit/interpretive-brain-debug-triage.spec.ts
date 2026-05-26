import { describe, expect, it } from "vitest";

import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";
import { normalizeProductSignal } from "@/lib/product-integrity/central-normalizer";
import {
  buildAiRepairWorkbenchFindingFeed,
  buildOperatorSummary,
  collapseDuplicateFindings,
  interpretNormalizedSignal,
  prioritizeFindings,
} from "@/lib/product-integrity/interpretive-brain";
import type { ProductHealthFinding } from "@/lib/product-integrity/interpretive-brain-contract";

const dropSignal = {
  signalId: "sig-product-brain-drop-preview-1",
  signalKind: "UserActionSignal" as const,
  eventName: "drop_preview_opened",
  featureId: "drops",
  surface: "drops_library",
  who: {
    userId: "user_1",
    sessionId: "session_1",
    actorKind: "signed_in_user",
  },
  what: {
    objectType: "drop",
    objectId: "drop_1",
    dropId: "drop_1",
  },
  when: {
    occurredAtUtc: "2026-05-26T12:00:00.000Z",
    timestampMs: 1_779_800_000_000,
  },
  where: {
    route: "/drops/drop_1",
    surface: "drops_library",
    sourceComponent: "DropCard",
  },
  how: {
    action: "click",
    method: "tap",
    source: "client" as const,
  },
  howLong: {
    durationMs: 1200,
    activeMs: 900,
  },
  identityState: "signed_in",
  confidence: "exact" as const,
  sourceTruth: "client",
  dedupeKey: "product-brain-drop-preview-user-1-drop-1",
  privacyClass: "minimal_product" as const,
  costClass: "hot_path_summary" as const,
  debugVisibility: "debug_visible",
  scoreImpact: ["evidenceCompleteness" as const, "runtimeHealth" as const],
};

describe("interpretive brain debug triage", () => {
  it("translates normalized signals into root-cause findings with score, cost, and formal next actions", () => {
    const normalized = normalizeProductSignal(dropSignal);
    const findings = interpretNormalizedSignal({
      ...normalized,
      formalEvidence: [{
        gateId: "runtime-provider-smoke",
        status: "formal_artifact_missing",
        owner: "operator",
        nextAction: "Attach formal deployed runtime/provider smoke evidence before clearing the beta gate.",
      }],
      sourceEvidence: [{
        evidenceId: "source-ready",
        status: "source_confidence_ready",
        confidence: "linked",
        detail: "Central normalizer sample is source-ready only.",
      }],
    });

    expect(findings.length).toBeGreaterThanOrEqual(4);
    expect(findings.every((finding) =>
      finding.findingId
      && finding.bodySystem
      && finding.rootCause
      && finding.owner
      && finding.nextAction.action
      && finding.evidence.length > 0
      && finding.confidence
    )).toBe(true);
    expect(findings.some((finding) => finding.findingType === "score_impact" && finding.scoreDimension === "evidenceCompleteness")).toBe(true);
    expect(findings.some((finding) => finding.findingType === "cost_risk" && finding.rootCause === "cost_guard_ready")).toBe(true);
    expect(findings.some((finding) => finding.findingType === "formal_gate" && finding.rootCause === "formal_evidence_missing")).toBe(true);
  });

  it("collapses duplicate debug findings and keeps critical findings visible first", () => {
    const duplicate: ProductHealthFinding = {
      findingType: "product_health",
      findingId: "duplicate-a",
      bodySystem: "admin_debug_ops",
      severity: "critical",
      actionability: "fix_now",
      rootCause: "normalization_failure",
      evidence: ["first"],
      scoreDimension: "evidenceCompleteness",
      estimatedPointImpact: 3,
      owner: "product-integrity",
      nextAction: {
        actionId: "fix-normalization",
        action: "Repair the normalized signal failure before hiding raw debug details.",
        validator: "npm run check:interpretive-brain-debug-triage",
      },
      blockedBy: [],
      confidence: "exact",
    };
    const findings = collapseDuplicateFindings([
      duplicate,
      {
        ...duplicate,
        findingId: "duplicate-b",
        evidence: ["second"],
        severity: "p1",
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0].duplicateChildren).toEqual(expect.arrayContaining(["duplicate-b"]));
    expect(findings[0].evidence).toEqual(expect.arrayContaining(["first", "second"]));
    expect(prioritizeFindings(findings)[0].severity).toBe("critical");
  });

  it("builds a Product brain summary before raw debug lanes and feeds AI repair from prioritized findings only", () => {
    const normalized = normalizeProductSignal(dropSignal);
    const findings = interpretNormalizedSignal({
      ...normalized,
      formalEvidence: [{
        gateId: "admin-truth-sample",
        status: "formal_artifact_missing",
        owner: "admin-debug",
        nextAction: "Attach a redacted admin truth sample before clearing the formal gate.",
      }],
      staleArtifact: [{
        artifactPath: "agent/state/public-beta-score.generated.json",
        status: "stale_artifact_refresh_needed",
        nextAction: "Run npm run score:beta and npm run check:beta-score.",
      }],
    });
    const summary = buildOperatorSummary({ findings });
    const trackingSummary = buildDebugPanelTrackingSummary({
      interpretiveBrainDebugTriage: { debugLane: summary.debugLane },
    });
    const aiFeed = buildAiRepairWorkbenchFindingFeed(summary);

    expect(summary.defaultView).toBe("product_brain_summary");
    expect(summary.rawLanesDefaultOpen).toBe(false);
    expect(summary.topActions.length).toBeLessThanOrEqual(10);
    expect(summary.hiddenCriticalCount).toBe(0);
    expect(summary.scoreBelow80Reasons.every((reason) => reason.nextAction)).toBe(true);
    expect(summary.formalGates.length).toBeGreaterThan(0);
    expect(summary.staleArtifacts.length).toBeGreaterThan(0);
    expect(summary.debugLane.label).toBe("Product brain");
    expect(trackingSummary.lanes[0].id).toBe("product_brain");
    expect(trackingSummary.lanes[0].rawDetailsDefaultOpen).toBe(false);
    expect(aiFeed.source).toBe("prioritized_findings");
    expect(aiFeed.paidAiRuntimeAllowed).toBe(false);
  });
});
