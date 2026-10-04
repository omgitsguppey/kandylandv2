import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildAdminViewAsHeaders,
  buildAdminViewAsTelemetryPayload,
  buildSyntheticCreatorMarker,
  getSyntheticCreatorMarkerMissingFields,
  INTERNAL_SYNTHETIC_LEGAL_EVIDENCE_MODE,
  isAdminViewAsBlockedRequest,
  normalizeSyntheticCreatorType,
  parseAdminViewAsState,
} from "@/lib/admin/synthetic-creators-view-as";
import {
  calculateLegacyDebtScore,
  getLegacyOverdueMultiplier,
  getLegacyRegistryItem,
} from "@/lib/legacy/legacy-registry";

describe("synthetic creators and admin view-as helpers", () => {
  it("creates synthetic creator markers with required audit fields", () => {
    expect(buildSyntheticCreatorMarker({
      syntheticCreatorType: "internal_character",
      syntheticCreatedByUid: "owner_1",
      syntheticCreatedAt: 1_714_600_000_000,
      syntheticReason: "Zaylani launch QA persona",
      humanOperatorRequired: true,
    })).toMatchObject({
      isSyntheticCreator: true,
      syntheticCreatorType: "internal_character",
      syntheticCreatedByUid: "owner_1",
      syntheticCreatedAt: 1_714_600_000_000,
      syntheticReason: "Zaylani launch QA persona",
      humanOperatorRequired: true,
      syntheticLegalEvidenceMode: INTERNAL_SYNTHETIC_LEGAL_EVIDENCE_MODE,
    });
  });

  it("requires internal synthetic legal evidence metadata", () => {
    expect(getSyntheticCreatorMarkerMissingFields({
      isSyntheticCreator: true,
      syntheticCreatorType: "ai_creator",
      syntheticCreatedByUid: "owner_1",
      syntheticCreatedAt: 1_714_600_000_000,
      syntheticReason: "Internal AI creator QA",
      syntheticLegalEvidenceMode: INTERNAL_SYNTHETIC_LEGAL_EVIDENCE_MODE,
    })).toEqual([]);

    expect(getSyntheticCreatorMarkerMissingFields({
      isSyntheticCreator: true,
      syntheticCreatorType: "ai_creator",
      syntheticReason: "Internal AI creator QA",
    })).toEqual(expect.arrayContaining([
      "syntheticCreatedByUid",
      "syntheticCreatedAt",
      "syntheticLegalEvidenceMode",
    ]));
  });

  it("rejects missing synthetic reasons", () => {
    expect(() => buildSyntheticCreatorMarker({
      syntheticCreatorType: "demo_creator",
      syntheticCreatedByUid: "owner_1",
      syntheticCreatedAt: 1,
      syntheticReason: "",
    })).toThrow("Synthetic creator reason is required.");
  });

  it("normalizes invalid synthetic types to test creator", () => {
    expect(normalizeSyntheticCreatorType("zaylani")).toBe("test_creator");
    expect(normalizeSyntheticCreatorType("ai_creator")).toBe("ai_creator");
  });

  it("parses view-as state without replacing the real auth identity", () => {
    const state = parseAdminViewAsState({
      adminViewingAsUserId: "creator_1",
      adminViewingAsDisplayName: "Zaylani",
      adminViewingAsRole: "creator",
      simulationStartedAt: 1_714_600_000_000,
      simulationReason: "Admin QA",
      viewAsActorUid: "admin_1",
      viewAsReturnHref: "/admin/roster?focus=creator_1",
    });

    expect(state).toMatchObject({
      adminViewingAsUserId: "creator_1",
      adminViewingAsRole: "creator",
      viewAsActorUid: "admin_1",
    });
    expect(buildAdminViewAsHeaders(state!)).toMatchObject({
      "x-admin-view-as-user-id": "creator_1",
      "x-admin-view-as-role": "creator",
      "x-admin-view-as-actor-uid": "admin_1",
    });
  });

  it("blocks purchase, wallet, unlock, and creator writes in view-as mode", () => {
    expect(isAdminViewAsBlockedRequest("/api/purchase/capture", "POST")?.reason).toContain("Purchase actions");
    expect(isAdminViewAsBlockedRequest("/api/wallet/grant", "POST")?.reason).toContain("Wallet actions");
    expect(isAdminViewAsBlockedRequest("/api/drops/unlock", "POST")?.reason).toContain("Unlock actions");
    expect(isAdminViewAsBlockedRequest("/api/creator/settings", "PUT")?.reason).toContain("Creator settings");
    expect(isAdminViewAsBlockedRequest("/api/creator/settings", "GET")).toBeNull();
  });

  it("records blocked purchase validation language", () => {
    expect(isAdminViewAsBlockedRequest("/api/paypal/capture", "POST")?.reason).toBe(
      "Payment actions are blocked while viewing as a creator.",
    );
  });

  it("builds local-only projection telemetry with admin actor and target creator fields", () => {
    expect(buildAdminViewAsTelemetryPayload({
      actorAdminId: "admin_1",
      targetUserId: "creator_1",
      route: "/admin/roster",
      actionKey: "admin_view_as_creator_started",
      reason: "QA check",
      simulationStartedAt: 1_714_600_000_000,
    })).toMatchObject({
      actorType: "admin",
      actorAdminId: "admin_1",
      adminId: "admin_1",
      actorCreatorId: "",
      targetUserId: "creator_1",
      targetCreatorId: "creator_1",
      performedAs: "admin_view_as_creator",
      projectionMode: "read_only_creator_projection",
      projectionScope: "local_only",
      includeInUserBehavior: false,
      metricEligible: false,
      metricExclusionReason: "admin_projection",
      sourceTruth: "local_projection",
    });
  });

  it("retires unsafe projection semantics without blocking legitimate user behavior eligibility", () => {
    const item = getLegacyRegistryItem("synthetic-view-as-local-projection");

    expect(item).toMatchObject({
      status: "blocked",
      phaseOutStage: "removed",
      ownerSurface: "admin_creator_projection",
    });
    expect(item?.blockedReferences).toContain('sourceTruth: "live_projection"');
    expect(item?.blockedReferences).toContain('performedAs: "creator"');
    expect(item?.blockedReferences).not.toContain("includeInUserBehavior: true");
    expect(getLegacyOverdueMultiplier(item!, new Date("2026-08-01T00:00:00.000Z"))).toBe(1);
    expect(calculateLegacyDebtScore([item!], new Date("2026-08-01T00:00:00.000Z"))).toBe(0);
  });

  it("keeps retired legacy semantics blocked while active fallback debt remains explicit", () => {
    const retiredIds = [
      "drops-query-modal-flow",
      "old-moderation-screenshot-certainty",
      "old-wallet-total-only-balance-chip",
      "old-green-bonus-chips",
      "notification-opened-read-score-split",
      "admin-support-realtime-queue",
    ];

    for (const id of retiredIds) {
      const item = getLegacyRegistryItem(id);
      expect(item?.phaseOutStage).toBe("removed");
      expect(item?.blockedReferences.length).toBeGreaterThan(0);
      expect(calculateLegacyDebtScore([item!], new Date("2026-08-01T00:00:00.000Z"))).toBe(0);
    }

    const retiredPreview = getLegacyRegistryItem("drop-preview-modal-fallback");
    expect(retiredPreview).toMatchObject({ status: "blocked", phaseOutStage: "removed" });
    expect(retiredPreview?.blockedReferences).toContain('from "@/components/DropPreviewModal"');
    expect(calculateLegacyDebtScore([retiredPreview!], new Date("2026-08-01T00:00:00.000Z"))).toBe(0);
    expect(getLegacyRegistryItem("admin-users-realtime-route")?.phaseOutStage).toBe("guarded");
  });
});


describe("legacy retirement scorer CLI custody", () => {
  function withScorerFixture(run: (fixture: string, scoreAndValidate: () => { report: { findings: Array<{ severity: string; itemId: string; filePath?: string }>; nextActions: string[]; registryCount: number; items: Array<{ id: string; phaseOutStage: string; debtScore: number; blockedReferenceCount: number }> }; validation: SpawnSyncReturns<string>; writes: string[] }) => void) {
    const repository = process.cwd();
    const fixture = resolve(mkdtempSync(join(tmpdir(), "legacy-retirement-reader-")));
    if (dirname(fixture) !== resolve(tmpdir()) || !basename(fixture).startsWith("legacy-retirement-reader-")) throw new Error("Unexpected legacy fixture root");
    const files = ["package.json", "src/lib/legacy/legacy-registry.ts", "scripts/agent/score-legacy-phaseout.ts", "scripts/agent/validate-legacy-phaseout.ts", "scripts/agent/score-orphaned-logic.ts", "docs/agent-truth/legacy-phaseout.md", "docs/agent-truth/orphaned-logic-score.md", "FULL_SCALE_CODEBASE_AUDIT.md", "REPO_MEMORY_LEDGER.md", "EVERY_FILE_FUNCTION_CHECKLIST.md"];
    try {
      for (const file of files) {
        const target = resolve(fixture, file);
        if (!target.startsWith(fixture + sep)) throw new Error("Unexpected fixture target");
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, readFileSync(resolve(repository, file)));
      }
      const preload = join(fixture, "publication-custody.cjs");
      const trace = join(fixture, "published-paths.source");
      writeFileSync(preload, "const fs=require('node:fs'),path=require('node:path');const root=" + JSON.stringify(fixture) + ",trace=" + JSON.stringify(trace) + ",traceWrite=fs.writeFileSync;for(const name of ['writeFileSync','appendFileSync','mkdirSync']){const original=fs[name];fs[name]=function(file,...args){const target=path.resolve(String(file));if(target!==root&&!target.startsWith(root+path.sep))throw new Error('Publication escaped isolated fixture: '+target);traceWrite(trace,target+'\\n',{flag:'a'});return original.call(this,file,...args);};}require('node:module').syncBuiltinESMExports();");
      const loader = pathToFileURL(resolve(repository, "node_modules/tsx/dist/loader.mjs")).href;
      const scoreAndValidate = () => {
        const args = ["--require", preload, "--import", loader];
        const scored = spawnSync(process.execPath, [...args, join(fixture, "scripts/agent/score-legacy-phaseout.ts")], { cwd: fixture, env: { ...process.env, TSX_DISABLE_CACHE: "1" }, encoding: "utf8", timeout: 15000 });
        expect(scored.error).toBeUndefined();
        expect(scored.status, scored.stdout + scored.stderr).toBe(0);
        const report = JSON.parse(readFileSync(join(fixture, "agent/state/legacy-phaseout.generated.json"), "utf8"));
        const validation = spawnSync(process.execPath, [...args, join(fixture, "scripts/agent/validate-legacy-phaseout.ts")], { cwd: fixture, env: { ...process.env, TSX_DISABLE_CACHE: "1" }, encoding: "utf8", timeout: 15000 });
        expect(validation.error).toBeUndefined();
        const writes = readFileSync(trace, "utf8").split("\n").filter(Boolean);
        expect(writes.length).toBeGreaterThan(0);
        expect(writes.every(target => target.startsWith(fixture + sep))).toBe(true);
        return { report, validation, writes };
      };
      run(fixture, scoreAndValidate);
    } finally {
      if (dirname(fixture) !== resolve(tmpdir()) || !basename(fixture).startsWith("legacy-retirement-reader-")) throw new Error("Unexpected legacy fixture cleanup root");
      rmSync(fixture, { recursive: true, force: true });
    }
  }
  it("scores canonical registry metadata without a runtime reference or a removed-item phaseout action", () => {
    withScorerFixture((_fixture, evaluate) => {
      const { report, validation } = evaluate();
      expect(validation.status, validation.stdout + validation.stderr).toBe(0);
      expect(report.findings.filter(finding => finding.severity === "critical")).toEqual([]);
      expect(report.items.find(item => item.id === "drop-preview-modal-fallback")).toMatchObject({ phaseOutStage: "removed", debtScore: 0, blockedReferenceCount: 0 });
      expect(report.nextActions.some(action => action.includes("drop-preview-modal-fallback"))).toBe(false);
      expect(report.registryCount).toBe(report.items.length);
    });
  });
  it("retains forbidden runtime import rejection after physical retirement", () => {
    withScorerFixture((fixture, evaluate) => {
      const probe = join(fixture, "src/blocked-probe.ts");
      writeFileSync(probe, "import { DropPreviewModal } from '@/components/DropPreviewModal';\nexport const active = DropPreviewModal;\n");
      const { report, validation } = evaluate();
      expect(validation.status).toBe(1);
      expect(validation.stderr).toContain("Blocked legacy appears in runtime path: drop-preview-modal-fallback");
      expect(report.findings.some(finding => finding.severity === "critical" && finding.itemId === "drop-preview-modal-fallback" && finding.filePath === "src/blocked-probe.ts")).toBe(true);
    });
  });
  it("regenerates a valid report after the forbidden reference is removed", () => {
    withScorerFixture((fixture, evaluate) => {
      const probe = join(fixture, "src/blocked-probe.ts");
      writeFileSync(probe, 'import { DropPreviewModal } from "@/components/DropPreviewModal";\n');
      expect(evaluate().validation.status).toBe(1);
      rmSync(probe);
      const recovered = evaluate();
      expect(recovered.validation.status, recovered.validation.stdout + recovered.validation.stderr).toBe(0);
      expect(recovered.report.findings.filter(finding => finding.severity === "critical")).toEqual([]);
      expect(recovered.report.items.find(item => item.id === "drop-preview-modal-fallback")?.blockedReferenceCount).toBe(0);
      expect(recovered.report.nextActions.some(action => action.includes("drop-preview-modal-fallback"))).toBe(false);
    });
  });
});
