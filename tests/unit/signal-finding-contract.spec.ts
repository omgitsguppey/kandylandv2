import { describe, expect, it } from "vitest";

import {
  SIGNAL_FINDING_SCHEMA_VERSION,
  buildSignalSarifProjection,
  validateSignalFinding,
  type SignalFinding,
} from "@/lib/agent-score/signal-finding-contract";

type SignalFindingProjectionInput = Omit<SignalFinding, "schemaVersion" | "sarif" | "minimalVerificationCommands">;

const baseFindingWithoutSarif: SignalFindingProjectionInput = {
  id: "signal_route_activity_duplicate_dto",
  ruleId: "signal.type-schema.duplicate-dto",
  title: "Route uses a duplicate DTO instead of the canonical helper contract.",
  severity: "moderate",
  confidence: "high",
  sourceSurface: "server_truth",
  ownerLane: "type_schema",
  evidence: [
    {
      kind: "source",
      source: "src/app/api/user/activity/route.ts",
      summary: "Static source scan found a route-local DTO that overlaps the helper contract.",
      freshness: "current",
      redacted: false,
    },
  ],
  affectedFiles: [
    {
      path: "src/app/api/user/activity/route.ts",
      role: "primary",
      line: 12,
    },
  ],
  rootCauseHypothesis: "A route-local type was added during a prior patch instead of importing the canonical helper type.",
  staleEvidence: "not_applicable",
  terminalProof: "targeted",
  recommendedNextAction: "Replace the duplicate route-local DTO with the canonical helper export.",
};

describe("signal finding contract", () => {
  it("projects a typed finding into SARIF-compatible fields", () => {
    const sarif = buildSignalSarifProjection(baseFindingWithoutSarif);
    const finding: SignalFinding = {
      schemaVersion: SIGNAL_FINDING_SCHEMA_VERSION,
      ...baseFindingWithoutSarif,
      minimalVerificationCommands: ["npm run typecheck"],
      sarif,
    };

    expect(validateSignalFinding(finding)).toEqual([]);
    expect(sarif).toMatchObject({
      ruleId: "signal.type-schema.duplicate-dto",
      level: "warning",
      artifactUri: "src/app/api/user/activity/route.ts",
      startLine: 12,
      properties: {
        signalId: "signal_route_activity_duplicate_dto",
        ownerLane: "type_schema",
        sourceSurface: "server_truth",
        confidence: "high",
        terminalProof: "targeted",
        evidenceKinds: ["source"],
      },
    });
  });

  it("keeps terminal-proof and redacted-runtime evidence rules explicit", () => {
    const finding: SignalFinding = {
      schemaVersion: SIGNAL_FINDING_SCHEMA_VERSION,
      ...baseFindingWithoutSarif,
      evidence: [
        {
          kind: "runtime_redacted",
          source: "agent/state/runtime-snapshot.generated.json",
          summary: "Synthetic redacted runtime snapshot points at the same source path.",
          freshness: "current",
          redacted: false,
        },
      ],
      terminalProof: "targeted",
      minimalVerificationCommands: [],
      sarif: buildSignalSarifProjection({
        ...baseFindingWithoutSarif,
        evidence: [
          {
            kind: "runtime_redacted",
            source: "agent/state/runtime-snapshot.generated.json",
            summary: "Synthetic redacted runtime snapshot points at the same source path.",
            freshness: "current",
            redacted: false,
          },
        ],
        terminalProof: "targeted",
      }),
    };

    expect(validateSignalFinding(finding)).toEqual([
      "minimalVerificationCommands must be populated when terminal proof is targeted or signoff.",
      "runtime_redacted evidence must be marked redacted.",
    ]);
  });
});
