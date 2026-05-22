import { LEGACY_EVENT_RECOVERY_DOMAINS } from "@/lib/legacy/legacy-event-recovery-contract";
import {
  buildMarchFirstEventRecoveryDryRun,
  dryRunOnly,
  recoveryStartDate,
} from "@/lib/legacy/march-first-event-recovery";

export function buildLegacyRecoveryDebugSummary() {
  const dryRun = buildMarchFirstEventRecoveryDryRun({ records: [] });

  return {
    lane: "Legacy recovery",
    status: "ready_for_dry_run_review",
    sourceState: "source",
    recoveryStartDate,
    dryRunOnly,
    readsProduction: dryRun.readsProduction,
    liveBackfill: dryRun.liveBackfill,
    mutationsAllowed: dryRun.mutationsAllowed,
    blockedMutationPrevention: dryRun.mutationPrevention.productionMutationBlocked,
    countsByConfidence: dryRun.summary.confidenceCounts,
    countsByAction: dryRun.summary.actionCounts,
    countsByDuplicateRisk: dryRun.summary.duplicateRiskCounts,
    supportedDomains: LEGACY_EVENT_RECOVERY_DOMAINS,
    rawDumpsCollapsed: true,
    duplicateLegacyWidgetsConsolidated: true,
  };
}
