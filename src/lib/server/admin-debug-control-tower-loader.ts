import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import {
  buildAdminDebugControlTowerModel,
  type AdminDebugControlTowerModel,
} from "@/lib/admin-debug-control-tower";
import {
  groupRuntimeEvidenceByFingerprintAndSource,
  resolveControlTowerBusinessTruthState,
} from "@/lib/admin/debug/control-tower-truth";
import { readAdminUserTruthSnapshot } from "@/lib/server/admin-user-truth-snapshot";
import { listRecentDebugEvidence } from "@/lib/server/debug-evidence-store";

export async function loadAdminDebugControlTower(options?: {
  nowMs?: number;
  rootDir?: string;
  evidenceLimit?: number;
  sourceReportsOnly?: boolean;
}): Promise<AdminDebugControlTowerModel> {
  const nowMs = options?.nowMs ?? Date.now();
  const debugEvidence = options?.sourceReportsOnly
    ? []
    : await listRecentDebugEvidence({ limit: options?.evidenceLimit ?? 60 });
  const businessSnapshot = options?.sourceReportsOnly
    ? null
    : await readAdminUserTruthSnapshot({
        db: adminDb,
        generatedAt: nowMs,
      });
  const model = buildAdminDebugControlTowerModel({
    rootDir: options?.rootDir,
    nowMs,
    debugEvidence,
    debugEvidenceSource: options?.sourceReportsOnly || debugEvidence.length === 0
      ? "generated"
      : "firestore",
  });

  return {
    ...model,
    businessSnapshot,
    businessTruthState: resolveControlTowerBusinessTruthState(businessSnapshot),
    runtimeEvidenceGroups: groupRuntimeEvidenceByFingerprintAndSource(debugEvidence),
    reportFreshnessState: model.missingReportCount > 0
      ? "missing"
      : model.staleReportCount > 0
        ? "stale"
        : model.truthState,
  };
}
