import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildAnalyticsPanelHydrationReport,
  resolveAllPanelHydration,
  resolvePanelHydration,
  validateAnalyticsPanelHydrationReport,
} from "@/lib/admin-analytics/panel-hydration-resolver";
import { buildPersonMetricsHydrationReport } from "@/lib/analytics/person-metrics-hydration";
import { buildLivePanelEvidenceReport } from "@/lib/release-readiness/live-panel-evidence-resolver";

const scoreDimensions = {
  sourceHealth: 100,
  runtimeHealth: 84.2,
  evidenceCompleteness: 84.6,
  freshness: 91.88,
  costRisk: 42,
  regressionRisk: 86,
};

const CURRENT_HEAD = "0123456789abcdef0123456789abcdef01234567";

function compactMetricRow(metricId: "auth_runtime_events" | "chat_actions", state: "hydrated" | "collecting" = "collecting") {
  return {
    metricId,
    state,
    count: state === "hydrated" ? 1 : 0,
    confidence: state === "hydrated" ? "exact" : "unknown",
    provenZero: false,
  };
}

function compactScope(
  scope: "global" | "guest" | "signedIn" | "linkedPerson" | "creatorRole",
  hydratedMetricIds: string[] = [],
) {
  return {
    scope,
    totalCount: hydratedMetricIds.length,
    lowConfidenceCount: 0,
    metricCount: 37,
    hydratedMetricIds,
    provenZeroMetricIds: [],
  };
}

function lineCount(path: string) {
  return readFileSync(path, "utf8").split(/\r?\n/u).length;
}

function compactPersonMetricsArtifact(overrides: Record<string, unknown> = {}) {
  const consumerRows = [compactMetricRow("auth_runtime_events"), compactMetricRow("chat_actions")];
  const status = overrides.status === "review" ? "review" : "pass";
  const evidenceMode = overrides.evidenceMode === "bounded_runtime_sample"
    ? "bounded_runtime_sample"
    : overrides.evidenceMode === "runtime_evidence_required"
      ? "runtime_evidence_required"
      : "source_validation_fixture";
  return {
    reportKey: "person-metrics-hydration",
    generatedAtUtc: new Date().toISOString(),
    currentHead: CURRENT_HEAD,
    sourceCommit: CURRENT_HEAD,
    status,
    passed: status === "pass",
    evidenceMode,
    evidenceClass: evidenceMode === "bounded_runtime_sample" ? "runtime_redacted" : "source_snapshot",
    canClearSourceGate: evidenceMode === "source_validation_fixture" && status === "pass",
    canClearRuntimeGate: evidenceMode === "bounded_runtime_sample",
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    boundedRuntimeWindow: null,
    fakeMetricsUsed: true,
    validationFailures: [],
    metricStatus: { total: 37, emitted: 0, omitted: 37, sample: [] },
    consumerMetricStatus: {
      total: 37,
      emitted: consumerRows.length,
      omitted: 37 - consumerRows.length,
      sample: consumerRows,
      byId: Object.fromEntries(consumerRows.map((row) => [row.metricId, row])),
    },
    userParityStatus: { total: 37, emitted: 0, omitted: 37, sample: [] },
    userParityGaps: { total: 0, emitted: 0, omitted: 0, sample: [], byId: {} },
    scopes: [
      compactScope("global"),
      compactScope("guest"),
      compactScope("signedIn"),
      compactScope("linkedPerson"),
      compactScope("creatorRole"),
    ],
    compaction: { fullReportValidatedInMemory: true },
    ...overrides,
  };
}

function boundedPersonMetricsArtifact(metricId: "auth_runtime_events" | "chat_actions") {
  const now = Date.now();
  const consumerRows = [
    compactMetricRow("auth_runtime_events", metricId === "auth_runtime_events" ? "hydrated" : "collecting"),
    compactMetricRow("chat_actions", metricId === "chat_actions" ? "hydrated" : "collecting"),
  ];
  return compactPersonMetricsArtifact({
    generatedAtUtc: new Date(now).toISOString(),
    evidenceMode: "bounded_runtime_sample",
    fakeMetricsUsed: false,
    boundedRuntimeWindow: {
      startedAtUtc: new Date(now - 5 * 60 * 1000).toISOString(),
      endedAtUtc: new Date(now - 1000).toISOString(),
      source: "redacted_admin_runtime_sample",
    },
    consumerMetricStatus: {
      total: 37,
      emitted: consumerRows.length,
      omitted: 37 - consumerRows.length,
      sample: consumerRows,
      byId: Object.fromEntries(consumerRows.map((row) => [row.metricId, row])),
    },
    scopes: [
      compactScope("global", [metricId]),
      compactScope("guest"),
      compactScope("signedIn", [metricId]),
      compactScope("linkedPerson"),
      compactScope("creatorRole"),
    ],
  });
}

function persistedEventArtifact(classifications: Array<Record<string, unknown>>, overrides: Record<string, unknown> = {}) {
  return {
    reportKey: "event-liveness-audit",
    status: "pass",
    validationFailures: [],
    generatedAtUtc: new Date().toISOString(),
    currentHead: CURRENT_HEAD,
    sourceCommit: CURRENT_HEAD,
    classifications,
    ...overrides,
  };
}

describe("analytics panel hydration", () => {
  it("keeps the panel registry derived instead of rebuilding a static duplicate registry", () => {
    const source = readFileSync("src/lib/admin-analytics/panel-hydration-registry.ts", "utf8");

    expect(source).toContain("PERSON_METRIC_DEFINITIONS");
    expect(source).toContain("derivePanelFromPersonMetric");
    expect(source).not.toContain("expectedEvents: [");
    expect(lineCount("src/lib/admin-analytics/panel-hydration-registry.ts")).toBeLessThanOrEqual(260);
  });

  it("keeps the generated hydration report compact while retaining panel lookup", () => {
    const now = new Date().toISOString();
    const report = buildAnalyticsPanelHydrationReport({
      currentHead: "head",
      generatedAtUtc: now,
      scoreDimensions,
      runtimeSignals: [{ panelId: "traffic_overview", hasData: true, sourceLoaded: true, lastSeenAt: now }],
    });

    expect(report.panelStatus.traffic_overview.hydrationStatus).toBe("hydrated");
    expect(report.topPanelHydrationFailures.length).toBeLessThanOrEqual(10);
    expect("panels" in report).toBe(false);
  });

  it("still covers every panel through resolver drilldown records", () => {
    const records = resolveAllPanelHydration({ scoreDimensions });

    expect(records).toHaveLength(41);
    expect(records.some((panel) => panel.panelId === "payment_approvals" && panel.hydrationStatus === "provider_gated")).toBe(true);
    expect(records.some((panel) => panel.canDisplayZero && panel.hydrationStatus !== "hydrated")).toBe(false);
  });

  it("classifies source-missing event liveness as actionable instead of collecting", () => {
    const panel = resolvePanelHydration({
      panelId: "drop_opens",
      eventLivenessAudit: {
        classifications: [
          {
            eventName: "drop_preview_opened",
            livenessStatus: "source_missing",
          },
        ],
      },
    });

    expect(panel.hydrationStatus).toBe("source_missing");
    expect(panel.userSafeDisplayState).toBe("show_not_connected");
    expect(panel.canDisplayZero).toBe(false);
  });

  it("prefers user parity gaps over global person metric hydration", () => {
    const gap = {
      metricId: "visits",
      state: "bridge_missing",
      globalCount: 4,
      guestCount: 0,
      signedInCount: 0,
      linkedPersonCount: 0,
      creatorRoleCount: 0,
      provenZero: false,
      blocksUserParity: true,
      debugNextAction: "Global visits exist, but user/person bridge is missing.",
    };
    const panel = resolvePanelHydration({
      panelId: "traffic_overview",
      personMetricsHydration: compactPersonMetricsArtifact({
        status: "review",
        userParityGaps: {
          total: 1,
          emitted: 1,
          omitted: 0,
          sample: [gap],
          byId: { visits: gap },
        },
      }),
    });

    expect(panel.hydrationStatus).toBe("bridge_missing");
    expect(panel.userSafeDisplayState).toBe("show_not_connected");
    expect(panel.canDisplayZero).toBe(false);
  });

  it("allows only bounded runtime person-metric samples to hydrate panels", () => {
    const sourceFixture = resolvePanelHydration({
      panelId: "auth_attempts_failures",
      personMetricsHydration: {
        ...boundedPersonMetricsArtifact("auth_runtime_events"),
        evidenceMode: "source_validation_fixture",
        evidenceClass: "source_snapshot",
        boundedRuntimeWindow: null,
        fakeMetricsUsed: true,
        canClearSourceGate: true,
        canClearRuntimeGate: false,
      },
    });
    const boundedRuntime = resolvePanelHydration({
      panelId: "auth_attempts_failures",
      personMetricsHydration: boundedPersonMetricsArtifact("auth_runtime_events"),
    });

    expect(sourceFixture.hydrationStatus).toBe("collecting");
    expect(sourceFixture.liveEvidenceContribution).toBe("source_exists_collecting");
    expect(boundedRuntime.hydrationStatus).toBe("hydrated");
    expect(boundedRuntime.liveEvidenceContribution).toBe("clears_live_evidence");
  });

  it("allows only bounded runtime evidence to prove a person metric is zero", () => {
    const zeroRow = {
      ...compactMetricRow("auth_runtime_events", "hydrated"),
      count: 0,
      provenZero: true,
    };
    const chatRow = compactMetricRow("chat_actions");
    const global = { ...compactScope("global"), provenZeroMetricIds: ["auth_runtime_events"] };
    const boundedZero = compactPersonMetricsArtifact({
      evidenceMode: "bounded_runtime_sample",
      fakeMetricsUsed: false,
      boundedRuntimeWindow: {
        startedAtUtc: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        endedAtUtc: new Date(Date.now() - 1000).toISOString(),
        source: "redacted_admin_runtime_sample",
      },
      consumerMetricStatus: {
        total: 37,
        emitted: 2,
        omitted: 35,
        sample: [zeroRow, chatRow],
        byId: { auth_runtime_events: zeroRow, chat_actions: chatRow },
      },
      scopes: [
        global,
        compactScope("guest"),
        compactScope("signedIn"),
        compactScope("linkedPerson"),
        compactScope("creatorRole"),
      ],
    });
    const sourceFixtureZero = {
      ...boundedZero,
      evidenceMode: "source_validation_fixture",
      evidenceClass: "source_snapshot",
      boundedRuntimeWindow: null,
      fakeMetricsUsed: true,
      canClearSourceGate: true,
      canClearRuntimeGate: false,
    };

    const bounded = resolvePanelHydration({ panelId: "auth_attempts_failures", personMetricsHydration: boundedZero });
    const fixture = resolvePanelHydration({ panelId: "auth_attempts_failures", personMetricsHydration: sourceFixtureZero });

    expect(bounded.hydrationStatus).toBe("hydrated");
    expect(bounded.canDisplayZero).toBe(true);
    expect(fixture.hydrationStatus).toBe("collecting");
    expect(fixture.canDisplayZero).toBe(false);
  });

  it("preserves an indexed wallet parity gap over positive event evidence", () => {
    const walletGap = {
      metricId: "wallet_opens",
      state: "bridge_missing",
      globalCount: 4,
      guestCount: 0,
      signedInCount: 0,
      linkedPersonCount: 0,
      creatorRoleCount: 0,
      provenZero: false,
      blocksUserParity: true,
      debugNextAction: "Repair the wallet identity bridge.",
    };
    const panel = resolvePanelHydration({
      panelId: "wallet_opens",
      eventLivenessAudit: {
        classifications: [{ eventName: "wallet_opened", livenessStatus: "observed_recently", lastSeenAtUtc: new Date().toISOString() }],
      },
      personMetricsHydration: compactPersonMetricsArtifact({
        status: "review",
        userParityGaps: {
          total: 1,
          emitted: 0,
          omitted: 1,
          sample: [],
          byId: { wallet_opens: walletGap },
        },
      }),
    });

    expect(panel.hydrationStatus).toBe("bridge_missing");
    expect(panel.userSafeDisplayState).toBe("show_not_connected");
    expect(panel.liveEvidenceContribution).toBe("actionable_gap");
    expect(panel.canDisplayZero).toBe(false);
  });

  it("keeps guest-only wallet activity global while blocking person-panel parity", () => {
    const walletRow = {
      metricId: "wallet_opens",
      state: "hydrated",
      count: 1,
      confidence: "weak",
      provenZero: false,
    };
    const walletGap = {
      metricId: "wallet_opens",
      state: "bridge_missing",
      globalCount: 1,
      guestCount: 1,
      signedInCount: 0,
      linkedPersonCount: 0,
      creatorRoleCount: 0,
      provenZero: false,
      blocksUserParity: true,
    };
    const authRow = compactMetricRow("auth_runtime_events");
    const chatRow = compactMetricRow("chat_actions");
    const panel = resolvePanelHydration({
      panelId: "wallet_opens",
      personMetricsHydration: compactPersonMetricsArtifact({
        status: "review",
        consumerMetricStatus: {
          total: 37,
          emitted: 3,
          omitted: 34,
          sample: [authRow, chatRow, walletRow],
          byId: { auth_runtime_events: authRow, chat_actions: chatRow, wallet_opens: walletRow },
        },
        userParityGaps: { total: 1, emitted: 0, omitted: 1, sample: [], byId: { wallet_opens: walletGap } },
        scopes: [
          compactScope("global", ["wallet_opens"]),
          compactScope("guest", ["wallet_opens"]),
          compactScope("signedIn"),
          compactScope("linkedPerson"),
          compactScope("creatorRole"),
        ],
      }),
    });

    expect(panel.hydrationStatus).toBe("bridge_missing");
    expect(panel.canDisplayZero).toBe(false);
  });

  it("does not let compact scope summaries inject unindexed panel evidence", () => {
    const panel = resolvePanelHydration({
      panelId: "wallet_opens",
      personMetricsHydration: compactPersonMetricsArtifact({
        evidenceMode: "bounded_runtime_sample",
        fakeMetricsUsed: false,
        boundedRuntimeWindow: {
          startedAtUtc: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          endedAtUtc: new Date(Date.now() - 1000).toISOString(),
          source: "redacted_admin_runtime_sample",
        },
        scopes: [
          compactScope("global", ["wallet_opens"]),
          compactScope("guest"),
          compactScope("signedIn", ["wallet_opens"]),
          compactScope("linkedPerson"),
          compactScope("creatorRole"),
        ],
      }),
    });

    expect(panel.hydrationStatus).toBe("runtime_evidence_required");
    expect(panel.liveEvidenceContribution).toBe("formal_evidence_required");
  });

  it("requires typed runtime authority for bounded person-metric clears", () => {
    const bounded = boundedPersonMetricsArtifact("auth_runtime_events");
    for (const personMetricsHydration of [
      { ...bounded, canClearRuntimeGate: false },
      { ...bounded, evidenceClass: "source_snapshot" },
      {
        ...bounded,
        boundedRuntimeWindow: {
          startedAtUtc: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          endedAtUtc: new Date(Date.now() - 1000).toISOString(),
          source: "untyped_sample",
        },
      },
    ]) {
      const panel = resolvePanelHydration({ panelId: "auth_attempts_failures", personMetricsHydration });
      expect(panel.hydrationStatus).toBe("runtime_evidence_required");
      expect(panel.canDisplayZero).toBe(false);
    }
  });

  it("rejects malformed or unresolved compact person-metric artifacts", () => {
    const positiveScopes = [
      compactScope("global", ["wallet_opens"]),
      compactScope("guest"),
      compactScope("signedIn", ["wallet_opens"]),
      compactScope("linkedPerson"),
      compactScope("creatorRole"),
    ];
    const cases = [
      compactPersonMetricsArtifact({ validationFailures: ["source validation failed"], scopes: positiveScopes }),
      compactPersonMetricsArtifact({ validationFailures: undefined, scopes: positiveScopes }),
      compactPersonMetricsArtifact({
        scopes: positiveScopes,
        userParityGaps: { total: 1, emitted: 0, omitted: 1, sample: [] },
      }),
      compactPersonMetricsArtifact({
        scopes: positiveScopes,
        userParityGaps: {
          total: 1,
          emitted: 0,
          omitted: 1,
          sample: [],
          byId: { wallet_opens: {} },
        },
      }),
    ];

    for (const personMetricsHydration of cases) {
      const panel = resolvePanelHydration({
        panelId: "wallet_opens",
        eventLivenessAudit: {
          classifications: [{ eventName: "wallet_opened", livenessStatus: "observed_recently", lastSeenAtUtc: new Date().toISOString() }],
        },
        personMetricsHydration,
      });
      expect(panel.hydrationStatus).toBe("runtime_evidence_required");
      expect(panel.userSafeDisplayState).toBe("show_not_connected");
      expect(panel.liveEvidenceContribution).toBe("formal_evidence_required");
      expect(panel.canDisplayZero).toBe(false);
    }
  });

  it("rejects stale, wrong-head, internally inconsistent, or injected compact person evidence", () => {
    const now = Date.now();
    const evaluatedAtUtc = new Date(now).toISOString();
    const positive = boundedPersonMetricsArtifact("auth_runtime_events");
    const consumerStatus = positive.consumerMetricStatus as {
      sample: Array<Record<string, unknown>>;
      byId: Record<string, Record<string, unknown>>;
    };
    const injectedWallet = {
      metricId: "wallet_opens",
      state: "hydrated",
      count: 999,
      confidence: "exact",
      provenZero: false,
    };
    const cases = [
      { ...positive, currentHead: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", sourceCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      { ...positive, sourceCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
      { ...positive, generatedAtUtc: new Date(now - 25 * 60 * 60 * 1000).toISOString() },
      { ...positive, generatedAtUtc: new Date(now + 60 * 1000).toISOString() },
      { ...positive, metricStatus: { total: 37, emitted: 1, omitted: 36, sample: [] } },
      {
        ...positive,
        consumerMetricStatus: {
          total: 37,
          emitted: 3,
          omitted: 34,
          sample: [...consumerStatus.sample, injectedWallet],
          byId: { ...consumerStatus.byId, wallet_opens: injectedWallet },
        },
      },
      {
        ...positive,
        scopes: [
          compactScope("global", ["auth_runtime_events"]),
          compactScope("guest"),
          compactScope("signedIn"),
          compactScope("linkedPerson"),
          compactScope("creatorRole"),
        ],
      },
    ];

    for (const personMetricsHydration of cases) {
      const panel = resolvePanelHydration({
        panelId: "auth_attempts_failures",
        currentHead: CURRENT_HEAD,
        generatedAtUtc: evaluatedAtUtc,
        personMetricsHydration,
        runtimeSignals: [{
          panelId: "auth_attempts_failures",
          hasData: true,
          sourceLoaded: true,
          lastSeenAt: evaluatedAtUtc,
        }],
      });

      expect(panel.hydrationStatus).toBe("runtime_evidence_required");
      expect(panel.liveEvidenceContribution).toBe("formal_evidence_required");
      expect(panel.canDisplayZero).toBe(false);
    }
  });

  it("does not reinterpret a no-sample person report as a materializer failure", () => {
    const panel = resolvePanelHydration({
      panelId: "traffic_overview",
      personMetricsHydration: buildPersonMetricsHydrationReport() as unknown as Record<string, unknown>,
    });

    expect(panel.hydrationStatus).toBe("runtime_evidence_required");
    expect(panel.reason).toContain("bounded route or debug runtime evidence");
    expect(panel.hydrationStatus).not.toBe("materializer_missing");
  });

  it("keeps source-validation fixtures out of live-panel clears", () => {
    const fixture = {
      ...boundedPersonMetricsArtifact("auth_runtime_events"),
      evidenceMode: "source_validation_fixture",
      evidenceClass: "source_snapshot",
      boundedRuntimeWindow: null,
      fakeMetricsUsed: true,
      canClearSourceGate: true,
      canClearRuntimeGate: false,
    };
    const report = buildAnalyticsPanelHydrationReport({
      currentHead: CURRENT_HEAD,
      scoreDimensions,
      personMetricsHydration: fixture,
    });
    const liveEvidence = buildLivePanelEvidenceReport(report);

    expect(report.panelStatus.auth_attempts_failures.hydrationStatus).toBe("collecting");
    expect(liveEvidence.liveEvidencePanelIds).not.toContain("auth_attempts_failures");
    expect(liveEvidence.decisions.find((decision) => decision.panelId === "auth_attempts_failures")).toMatchObject({
      status: "source_exists_collecting",
    });
  });

  it("requires fresh timestamps for runtime data and proven-zero claims", () => {
    const now = Date.now();
    const generatedAtUtc = new Date(now).toISOString();
    const resolve = (signal: { hasData?: boolean; provenZero?: boolean; lastSeenAt?: string }) => resolvePanelHydration({
      panelId: "traffic_overview",
      generatedAtUtc,
      runtimeSignals: [{ panelId: "traffic_overview", sourceLoaded: true, ...signal }],
    });

    expect(resolve({ hasData: true, lastSeenAt: new Date(now - 1000).toISOString() }).hydrationStatus).toBe("hydrated");
    expect(resolve({ hasData: true }).hydrationStatus).toBe("runtime_evidence_required");
    expect(resolve({ hasData: true, lastSeenAt: new Date(now + 1000).toISOString() }).hydrationStatus).toBe("runtime_evidence_required");
    expect(resolve({ hasData: true, lastSeenAt: new Date(now - 25 * 60 * 60 * 1000).toISOString() }).hydrationStatus).toBe("stale");
    const staleZero = resolve({ provenZero: true, lastSeenAt: new Date(now - 25 * 60 * 60 * 1000).toISOString() });
    expect(staleZero.hydrationStatus).toBe("stale");
    expect(staleZero.canDisplayZero).toBe(false);
  });

  it("requires an explicitly loaded source before runtime values or zero can hydrate", () => {
    const now = new Date().toISOString();
    for (const signal of [{ hasData: true }, { provenZero: true }]) {
      const panel = resolvePanelHydration({
        panelId: "traffic_overview",
        generatedAtUtc: now,
        runtimeSignals: [{ panelId: "traffic_overview", lastSeenAt: now, ...signal }],
      });
      expect(panel.hydrationStatus).toBe("runtime_evidence_required");
      expect(panel.canDisplayZero).toBe(false);
    }
  });

  it("keeps explicit runtime failures visible when persisted evidence is rejected", () => {
    const now = new Date().toISOString();
    const rejectedEvidence = compactPersonMetricsArtifact({ validationFailures: ["invalid artifact"] });
    const cases = [
      { signal: { error: "route exploded" }, status: "broken" },
      { signal: { permissionBlocked: true }, status: "permission_blocked" },
      { signal: { sourceLoaded: false }, status: "source_missing" },
    ] as const;
    for (const testCase of cases) {
      const panel = resolvePanelHydration({
        panelId: "traffic_overview",
        generatedAtUtc: now,
        personMetricsHydration: rejectedEvidence,
        runtimeSignals: [{ panelId: "traffic_overview", ...testCase.signal }],
      });
      expect(panel.hydrationStatus).toBe(testCase.status);
    }
  });

  it("gives person blockers priority over otherwise fresh runtime positives", () => {
    const now = new Date().toISOString();
    const gap = {
      metricId: "visits",
      state: "bridge_missing",
      globalCount: 1,
      guestCount: 0,
      signedInCount: 0,
      linkedPersonCount: 0,
      creatorRoleCount: 0,
      provenZero: false,
      blocksUserParity: true,
    };
    const panel = resolvePanelHydration({
      panelId: "traffic_overview",
      generatedAtUtc: now,
      personMetricsHydration: compactPersonMetricsArtifact({
        status: "review",
        userParityGaps: { total: 1, emitted: 1, omitted: 0, sample: [gap], byId: { visits: gap } },
      }),
      runtimeSignals: [{ panelId: "traffic_overview", hasData: true, sourceLoaded: true, lastSeenAt: now }],
    });

    expect(panel.hydrationStatus).toBe("bridge_missing");
    expect(panel.liveEvidenceContribution).toBe("actionable_gap");
  });

  it("requires strict event verdict provenance and prioritizes blocking classifications", () => {
    const now = Date.now();
    const generatedAtUtc = new Date(now).toISOString();
    const recent = { eventName: "drop_preview_opened", livenessStatus: "observed_recently", lastSeenAtUtc: generatedAtUtc };
    const runtimeSignal = [{ panelId: "drop_opens", hasData: true, sourceLoaded: true, lastSeenAt: generatedAtUtc }];
    const rejected = [
      persistedEventArtifact([recent], { status: "fail" }),
      persistedEventArtifact([recent], { validationFailures: ["event source failed"] }),
      persistedEventArtifact([recent], {
        currentHead: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        sourceCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
      persistedEventArtifact([recent], { sourceCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }),
      persistedEventArtifact([recent], { generatedAtUtc: new Date(now - 25 * 60 * 60 * 1000).toISOString() }),
    ];

    for (const eventLivenessAudit of rejected) {
      const panel = resolvePanelHydration({
        panelId: "drop_opens",
        currentHead: CURRENT_HEAD,
        generatedAtUtc,
        eventLivenessAudit,
        runtimeSignals: runtimeSignal,
      });
      expect(panel.hydrationStatus).toBe("runtime_evidence_required");
      expect(panel.liveEvidenceContribution).toBe("formal_evidence_required");
    }

    const mixed = resolvePanelHydration({
      panelId: "drop_opens",
      currentHead: CURRENT_HEAD,
      generatedAtUtc,
      eventLivenessAudit: persistedEventArtifact([
        recent,
        { eventName: "drop_preview_opened", livenessStatus: "source_missing" },
      ]),
    });
    expect(mixed.hydrationStatus).toBe("source_missing");

    const staleClassification = resolvePanelHydration({
      panelId: "drop_opens",
      currentHead: CURRENT_HEAD,
      generatedAtUtc,
      eventLivenessAudit: persistedEventArtifact([{
        ...recent,
        lastSeenAtUtc: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
      }]),
    });
    expect(staleClassification.hydrationStatus).toBe("stale");
  });

  it("does not let global event evidence hydrate a person panel without person evidence", () => {
    const now = new Date().toISOString();
    const panel = resolvePanelHydration({
      panelId: "drop_opens",
      currentHead: CURRENT_HEAD,
      generatedAtUtc: now,
      eventLivenessAudit: persistedEventArtifact([{
        eventName: "drop_preview_opened",
        livenessStatus: "observed_recently",
        lastSeenAtUtc: now,
      }]),
    });

    expect(panel.hydrationStatus).toBe("runtime_evidence_required");
    expect(panel.liveEvidenceContribution).toBe("formal_evidence_required");
  });

  it("keeps source-ready panel mappings distinct from runtime evidence", () => {
    const panel = resolvePanelHydration({
      panelId: "package_selections",
      eventLivenessAudit: {
        classifications: [
          {
            eventName: "purchase_package_selected",
            livenessStatus: "source_ready_waiting_for_activity",
          },
        ],
      },
    });

    expect(panel.hydrationStatus).toBe("source_ready_waiting_for_activity");
    expect(panel.liveEvidenceContribution).toBe("source_exists_collecting");
    expect(panel.reason).toContain("runtime evidence remains separate");
    expect(panel.canDisplayZero).toBe(false);
  });

  it("keeps expected but unobserved panels visible without calling them disconnected", () => {
    const panel = resolvePanelHydration({
      panelId: "drop_opens",
      eventLivenessAudit: {
        classifications: [
          {
            eventName: "drop_preview_opened",
            livenessStatus: "not_observed_but_expected",
          },
        ],
      },
    });

    expect(panel.hydrationStatus).toBe("not_observed_but_expected");
    expect(panel.liveEvidenceContribution).toBe("source_exists_collecting");
    expect(panel.userSafeDisplayState).toBe("show_no_recent_activity");
    expect(panel.nextExactAction).toContain("no recent activity");
  });

  it("keeps external provider payment panels external-required", () => {
    const panel = resolvePanelHydration({ panelId: "payment_approvals" });

    expect(panel.hydrationStatus).toBe("provider_gated");
    expect(panel.liveEvidenceContribution).toBe("formal_evidence_required");
    expect(panel.userSafeDisplayState).toBe("show_external_required");
  });

  it("keeps GumDrop balances in protected payment evidence instead of generic source-missing", () => {
    const panel = resolvePanelHydration({ panelId: "gumdrop_balances" });

    expect(panel.hydrationStatus).toBe("protected_payment_required");
    expect(panel.liveEvidenceContribution).toBe("formal_evidence_required");
    expect(panel.userSafeDisplayState).toBe("show_external_required");
    expect(panel.nextExactAction).toContain("payment");
  });

  it("splits runtime and admin truth evidence needs without manual-proof buckets", () => {
    const runtime = resolvePanelHydration({ panelId: "error_rate_4xx" });
    const adminTruth = resolvePanelHydration({ panelId: "creator_count" });
    const externalCost = resolvePanelHydration({ panelId: "cost_risk" });
    const report = buildAnalyticsPanelHydrationReport({ currentHead: "head", scoreDimensions });

    expect(runtime.hydrationStatus).toBe("runtime_evidence_required");
    expect(runtime.liveEvidenceContribution).toBe("formal_evidence_required");
    expect(runtime.userSafeDisplayState).toBe("show_not_connected");
    expect(runtime.reason).toContain("route or debug runtime evidence");
    expect(adminTruth.hydrationStatus).toBe("admin_truth_source_required");
    expect(adminTruth.nextExactAction).toContain("redacted admin source activity sample");
    expect(externalCost.hydrationStatus).toBe("external_required");
    expect(report.runtimeEvidenceRequiredPanels).toBeGreaterThan(0);
    expect(report.adminTruthSourceRequiredPanels).toBeGreaterThan(0);
    expect(report.liveEvidenceContribution.runtimeEvidenceRequired).toContain("error_rate_4xx");
    expect(report.liveEvidenceContribution.adminTruthSourceRequired).toContain("creator_count");
    expect(report.liveEvidenceContribution.externalRequired).toContain("cost_risk");
    expect(report.liveEvidenceContribution.externalRequired).not.toContain("error_rate_4xx");
    expect(report.debugLane.runtimeEvidenceRequired).toBe(report.runtimeEvidenceRequiredPanels);
    expect(report.debugLane.adminTruthSourceRequired).toBe(report.adminTruthSourceRequiredPanels);
    expect(report.debugLane.providerGated).toBe(report.providerGatedPanels);
    expect(report.debugLane.protectedPaymentRequired).toBe(report.protectedPaymentRequiredPanels);
    expect(report.debugLane.externalRequired).toBe(report.externalRequiredPanels);
    expect(report.debugLane.permissionBlocked).toBe(report.permissionBlockedPanels);
    expect(report.debugLane.hiddenByRole).toBe(report.hiddenByRolePanels);
    expect(report.externalRequiredPanels).toBe(1);
    expect(report.providerGatedPanels).toBe(2);
    expect(report.protectedPaymentRequiredPanels).toBe(1);
    expect(report).not.toHaveProperty("manualOrRuntimeRequiredPanels");
    expect(report.debugLane).not.toHaveProperty("manualOrRuntimeRequired");
  });

  it("maps journey funnel to the existing admin snapshot materializer instead of a stale source path", () => {
    const panel = resolvePanelHydration({ panelId: "journey_funnel" });

    expect(panel.hydrationStatus).toBe("source_ready_waiting_for_activity");
    expect(panel.sourcePath).toBe("src/app/api/admin/analytics/historical/route.ts");
    expect(panel.materializerPath).toBe("admin_analytics_materializers:journey_funnel");
    expect(panel.reason).toContain("canonical");
  });

  it("lets runtime signals hydrate panels without showing missing data as zero", () => {
    const now = new Date().toISOString();
    const report = buildAnalyticsPanelHydrationReport({
      currentHead: "head",
      generatedAtUtc: now,
      scoreDimensions,
      runtimeSignals: [
        {
          panelId: "traffic_overview",
          hasData: true,
          sourceLoaded: true,
          lastSeenAt: now,
        },
      ],
    });

    const traffic = report.panelStatus.traffic_overview;
    expect(traffic?.hydrationStatus).toBe("hydrated");
    expect(Object.values(report.panelStatus).some((panel) => panel.canDisplayZero && panel.hydrationStatus !== "hydrated")).toBe(false);
    expect(validateAnalyticsPanelHydrationReport(report)).toEqual([]);
  });

  it("feeds panel hydration into debug and live evidence", () => {
    const now = new Date().toISOString();
    const report = buildAnalyticsPanelHydrationReport({
      currentHead: "head",
      generatedAtUtc: now,
      scoreDimensions,
      runtimeSignals: [
        {
          panelId: "traffic_overview",
          hasData: true,
          sourceLoaded: true,
          lastSeenAt: now,
        },
      ],
    });
    const livePanelEvidence = buildLivePanelEvidenceReport(report);

    expect(report.debugLane.label).toBe("Analytics panel hydration");
    expect(report.debugLane.totalPanels).toBe(report.totalPanels);
    expect(report.debugLane.sourceReadyWaitingForActivity).toBeGreaterThanOrEqual(0);
    expect(livePanelEvidence.decisions.length).toBe(report.totalPanels);
    expect(livePanelEvidence.liveEvidencePanelIds).toContain("traffic_overview");
    expect(livePanelEvidence.decisions.find((decision) => decision.panelId === "drop_opens")).toMatchObject({
      status: "source_exists_collecting",
      betaExitImpact: "source_exists_but_not_recent",
    });
    expect(livePanelEvidence.decisions.find((decision) => decision.panelId === "package_selections")).toMatchObject({
      status: "source_exists_collecting",
      betaExitImpact: "source_exists_but_not_recent",
    });
    expect(livePanelEvidence.blockedPanelIds).not.toContain("drop_opens");
    expect(livePanelEvidence.blockedPanelIds).not.toContain("package_selections");
  });

  it("builds launch recovery from source agreement in-process instead of a generated report hop", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");
    const agreementIndex = source.indexOf("buildLaunchSourceAgreementDetail();");
    const recoveryIndex = source.indexOf("buildLaunchAnalyticsRecoveryReport({");

    expect(agreementIndex).toBeGreaterThanOrEqual(0);
    expect(recoveryIndex).toBeGreaterThan(agreementIndex);
    expect(source).not.toContain('readJson("agent/state/source-agreement-failure-detail.generated.json")');
    expect(source).not.toContain("validateSourceAgreementFailureDetail();");
  });

  it("uses the central recovery spine for launch-critical source coverage", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");
    const serverSource = readFileSync("src/lib/server/admin-analytics-historical-validation.ts", "utf8");

    expect(source).toContain("buildLaunchCriticalActiveSourceCoverageReport");
    expect(source).toContain("buildLaunchHistorySourceCoverageRowsState");
    expect(serverSource).toContain("buildLaunchHistorySourceCoverageRowsState");
    expect(source).not.toContain("buildLaunchHistoryDayRecoveryStatesFromSources");
    expect(serverSource).not.toContain("buildLaunchHistoryDayRecoveryStatesFromSources");
    expect(source).not.toContain("buildLaunchHistoryDayRecoveryState({");
    expect(serverSource).not.toContain("function buildLaunchHistoryDayCoverage");
    expect(source).toContain("buildLaunchCriticalRecoveryCoverageFromEvidence");
    expect(source).toContain("buildLaunchCriticalActiveSourceReferences");
    expect(source).not.toContain("buildLaunchCriticalObservedEventNamesFromSourceEvidence");
    expect(source).not.toContain("buildLaunchCriticalRecoveredMetricsFromSourceEvidence");
  });

  it("uses the canonical source-agreement classifier instead of local drift logic", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain("classifySourceAgreementCoverage");
    expect(source).toContain("buildSourceAgreementCoverageSummaryState");
    expect(source).toContain("sourceAgreementSummary.sourceAgreementStatus");
    expect(source).not.toContain("function classifySourceAgreementDisagreements");
    expect(source).not.toContain("sourceAgreementDetail.disagreementCount, 0) > 1");
    expect(source).not.toContain("sourceAgreementDetail.maxDeltaPct, 0) > 25");
  });

  it("keeps launch recovery partial until first-party coverage and source agreement both pass", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");
    const spine = readFileSync("src/lib/analytics/recovery-timeline-spine.ts", "utf8");

    expect(source).toContain("buildLaunchHistoryCoverageSummaryState");
    expect(source).toContain("const launchCoverageSummary = buildLaunchHistoryCoverageSummaryState");
    expect(source).toContain("firstPartyCoverageState: launchCoverageSummary.firstPartyCoverage.state");
    expect(source).toContain("sourceAgreementState,");
    expect(source).not.toContain('const firstPartyCoverageState =');
    expect(source).not.toContain('sourceAgreementState !== "pass"');
    expect(spine).toContain('const sourceAgreementPassed = input.sourceAgreementState === "pass"');
    expect(source).toContain("allLaunchRangeProven");
    expect(source).toContain("buildLaunchRecoverySourceGateState");
    expect(source).toContain("const launchSourceGate = buildLaunchRecoverySourceGateState");
    expect(source).toContain("canClearSourceGate: launchSourceGate.canClearSourceGate");
    expect(source).toContain("sourceGateReason: launchSourceGate.sourceGateReason");
    expect(source).toContain("sourceGateBlockers: launchSourceGate.sourceGateBlockers");
    expect(source).toContain("input.sourceAgreementResult.inputHead");
    expect(source).toContain("sourceAgreementEvidence.inputHead");
    expect(source).toContain("const hasLaunchCoverageInput");
    expect(source).toContain("typeof sourceAgreementHead !== \"string\"");
    expect(source).toContain("sourceAgreementHead !== input.currentHead");
    expect(source).not.toContain("const sourceAgreementHead = input.currentHead");
    expect(source).not.toContain("launchSourceGateCanClear");
    expect(source).not.toContain("const allLaunchRangeProofReason");
    expect(source).toContain("all-launch range evidence exists");
    expect(source).toContain("LAUNCH_ANALYTICS_FIRST_DAY_KEY");
    expect(source).toContain("normalizeLaunchHistoryRangeProofKind");
    expect(source).not.toContain("function publicLaunchRangeSource");
    expect(source).not.toContain('if (coverageWindowKind === "caller_supplied_expected_days" || coverageWindowKind === "local_source_window") return "local_source_window"');
    expect(source).toContain("formalLaunchRange");
    expect(source).toContain("buildFormalLaunchRangeRecoveryState");
    expect(source).toContain("buildLaunchHistoryRangeProofState");
    expect(source).toContain("rangeProof: buildLaunchHistoryRangeProofState");
    expect(source).toContain("localEvidenceDayCount");
    expect(source).toContain("unprovenRanges");
    expect(source).toContain("formalLaunchRange,");
    expect(source).not.toContain("formalRangeStartDayKey: formalLaunchRange.launchStartDayKey");
    expect(source).not.toContain("formalRangeEndDayKey: formalLaunchRange.expectedThroughDayKey");
    expect(source).not.toContain("formalExpectedDayCount: formalLaunchRange.expectedDayCount");
    expect(source).not.toContain("evidenceDayCount: formalLaunchRange.localEvidenceDayCount");
    expect(source).toContain("launch range evidence must expose the formal expected day count.");
    expect(source).toContain("localEvidenceDays: dayCoverage");
    expect(source).toContain("formalLaunchDayCoverage: summarizeRecoveredMetricMetadataCompleteness(formalLaunchRange.dayCoverage)");
    expect(source).not.toContain('sourceCountsKnown: false,');
    expect(source).not.toContain("No approved all-launch evidence covers this day yet; source counts are unknown, not zero.");
    expect(source).not.toContain("listInclusiveDays");
    expect(source).not.toContain("rangeLabel");
    expect(source).toContain("formal launch range must expose one dayCoverage row for every launch day.");
    expect(source).toContain("outside evidence window must use null source counts, not zero.");
    expect(source).toContain("Formal Launch Day Rows");
    expect(source).toContain("formal launch range must list unproven ranges");
    expect(spine).toContain("GA4, historical snapshots, and legacy support remain evidence-only");
    expect(source).toContain('productTruthRole: "primary_product_truth"');
    expect(source).toContain('productTruthRole: "second_source_evidence_only"');
    expect(source).toContain('productTruthRole: "fallback_evidence_only"');
    expect(source).toContain("launch recovery source inventory entries require productTruthRole and promotionRule.");
  });

  it("allows approved all-range export evidence without treating it as formal admin truth", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain('"all_range_historical_export"');
    expect(source).toContain("approved all-range historical export");
    expect(source).toContain("formal admin truth sample or approved all-range historical export");
    expect(source).toContain("canClearAdminTruthGate: false");
  });

  it("surfaces legacy purgatory in launch recovery without making it product truth", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain("compactLegacyRecoverySummary");
    expect(source).toContain("classifyGeneratedArtifactFromGit");
    expect(source).toContain("legacyRecoveryOwnedSourcePaths");
    expect(source).toContain("current_by_impact");
    expect(source).toContain("analytics-legacy-purgatory-queue.generated.json");
    expect(source).toContain("currentTotalsEligibleCount");
    expect(source).toContain("productTruthEligibleCount");
    expect(source).toContain("historical_evidence_only");
    expect(source).toContain("legacy recovery cannot mark purgatory rows current/product-truth eligible");
    expect(source).toContain("## Legacy Recovery Queue");
    expect(source).toContain("Legacy, historical snapshot, and GA4 evidence can explain gaps or seed manual review only.");
  });

  it("does not treat optimized task context churn as an analytics artifact to commit", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain('normalized.startsWith("agent/context/")) return "unrelated_agent_context_file_to_ignore"');
    expect(source).toContain('^\\.agent\\/workflows\\/[a-z0-9-]+\\.md$');
  });

  it("keeps launch recovery day rows actionable instead of top-level-only", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain("missingRangesBySource");
    expect(source).toContain("duplicateRanges");
    expect(source).toContain("productTruthRecoveredDayCount");
    expect(source).toContain("evidenceObservedDayCount");
    expect(source).toContain("sourceTruthState");
    expect(source).toContain("confidenceBand");
    expect(source).toContain("classifyRecoveryMetricConfidenceBand(day.confidenceScore)");
    expect(source).toContain("eventFamilyCoverage");
    expect(source).toContain("activeSourceCoverage");
    expect(source).toContain("targetCoveragePercent: activeSourceCoverage.targetCoveragePercent");
    expect(source).toContain("active source coverage must not clear historical launch evidence");
    expect(source).toContain("buildLaunchCriticalRecoveryCoverageFromEvidence");
    expect(source).toContain("modeled/inferred evidence calibration-only");
    expect(source).toContain("summarizeRecoveredMetricMetadataCompleteness");
    expect(source).toContain("recoveredMetricMetadataCompleteness");
    expect(source).toContain("sourceAgreementDisagreements: summarizeRecoveredMetricMetadataCompleteness(sourceAgreementDisagreements)");
    expect(source).toContain('"sourceAgreementDisagreements"');
    expect(source).toContain("compactLaunchAnalyticsRecoveryReport");
    expect(source).toContain("dayCoverageCount: compactFormalDays.dayCount");
    expect(source).toContain("omittedDayCoverageCount: compactFormalDays.omittedDayCount");
    expect(source).toContain("dayCoverageSummary: compactFormalDays.dayCoverageSummary");
    expect(source).toContain("compactSourceFamilyStates");
    expect(source).toContain("activeSourceFileCount: activeSourceFileSummary.count");
    expect(source).toContain("materializerFileCount: materializerFileSummary.count");
    expect(source).toContain("RECOVERY_METRIC_DEDUPE_RULES");
    expect(source).toContain("RECOVERY_METRIC_MODELING_POLICY");
    expect(source).toContain("RECOVERY_METRIC_POLICY_PROOF_BOUNDARY");
    expect(source).not.toContain('proofBoundary: "policy_metadata_only_not_runtime_provider_or_admin_truth_proof"');
    expect(source).toContain("recoveryPolicy");
    expect(source).toContain("eventIdIsPrimaryWhenPresent");
    expect(source).toContain("fallbackUsesSessionIdentityRouteObjectAndTimestampWindow");
    expect(source).toContain("modeled/visibility evidence policy");
    expect(source).toContain("metadata completeness must stay metadata-only");
    expect(source).toContain("policy metadata must not clear runtime/provider/admin truth gates");
    expect(source).toContain("RECOVERED_METRIC_METADATA_PROOF_BOUNDARY");
    expect(source).not.toContain('proofBoundary: "metadata_completeness_only_not_source_runtime_provider_or_admin_truth_proof"');
    expect(source).toContain("summarizeLaunchRecoveryFamilySourceStates");
    expect(source).toContain("displaySummary sourceWindowLabel must come from the recovery spine coverage window");
    expect(source).toContain("displaySummary sourceRoleCounts must agree with eventFamilyCoverage family source roles");
    expect(source).toContain("displaySummary must expose mathReasonSamples when launch-critical families are missing product truth");
    expect(source).toContain("coveredDayCount: sourceDayCounts.firstParty");
    expect(source).not.toContain("coveredDayCount: firstPartyDays.size");
    expect(source).toContain("collapseLaunchRecoveryDayRanges");
    expect(source).not.toContain("function collapseDayRanges");
    expect(source).toContain("Active source-code coverage");
    expect(source).toContain("Launch-critical observed first-party coverage");
    expect(source).toContain("Recovered metric metadata");
    expect(source).toContain("source-agreement disagreements ${report.recoveredMetricMetadataCompleteness.sourceAgreementDisagreements.status}");
    expect(source).toContain("Recovery policy");
    expect(source).toContain("launch day ${day.dayKey} cannot be product-truth recovered without first-party evidence.");
    expect(source).toContain("## Daily Recovery Rows");
    expect(source).toContain("perDayMetricDeltas");
    expect(source).toContain("Count delta details");
    expect(source).toContain("sourceAgreementMetricDeltas");
    expect(source).toContain("source-agreement count deltas");
    expect(source).toContain("sourceTruthState: typeof entry.sourceTruthState");
  });

  it("keeps analytics truth rebuild summary tied to the canonical recovery display summary", () => {
    const source = readFileSync("scripts/rebuild-analytics-truth.ts", "utf8");

    expect(source).toContain("buildLaunchHistoryDisplaySummaryState");
    expect(source).toContain("const displaySummary = buildLaunchHistoryDisplaySummaryState");
    expect(source).toContain("const sourceAgreementDisagreements = readRecordArray(sourceAgreement.disagreements)");
    expect(source).toContain("const sourceAgreementMetricDeltas = readRecordArray(sourceAgreement.perDayMetricDeltas)");
    expect(source).toContain("summarizeCurrentLaunchRecoveryMetadata");
    expect(source).toContain('status: "not_evaluated_stale_artifact"');
    expect(source).toContain("sourceAgreementMetricDeltas: summarizeCurrentLaunchRecoveryMetadata(artifactCurrent, sourceAgreementMetricDeltas, asRecord(artifactMetadataCompleteness.sourceAgreementMetricDeltas))");
    expect(source).toContain("readLaunchRecoveryDaySummary");
    expect(source).toContain("const artifactMetadataCompleteness = asRecord(report.recoveredMetricMetadataCompleteness)");
    expect(source).toContain("asRecord(artifactMetadataCompleteness.formalLaunchDayCoverage)");
    expect(source).toContain("sourceWindowLabel");
    expect(source).toContain("mathReasonSamples: (displaySummary.mathReasonSamples ?? [])");
    expect(source).not.toContain("asRecord(launchHistoryCoverage.displaySummary)");
    expect(source).not.toContain("readRecordArray(displaySummary.mathReasonSamples)");
    expect(source).not.toContain("Launch evidence window since ${");
    expect(source).not.toContain("Launch history recovered since ${");
  });
});
