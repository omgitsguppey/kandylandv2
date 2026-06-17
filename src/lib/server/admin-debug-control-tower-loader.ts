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
}): Promise<AdminDebugControlTowerModel> {
  const nowMs = options?.nowMs ?? Date.now();
  const debugEvidence = await listRecentDebugEvidence({ limit: options?.evidenceLimit ?? 60 });
  const businessSnapshot = await readAdminUserTruthSnapshot({
    db: adminDb,
    generatedAt: nowMs,
  });
  const model = buildAdminDebugControlTowerModel({
    rootDir: options?.rootDir,
    nowMs,
    debugEvidence,
    debugEvidenceSource: debugEvidence.length > 0 ? "firestore" : "generated",
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
