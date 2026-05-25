import type { TaskGuidanceEventName } from "@/lib/task-guidance";

export type TaskGuidanceAliasProposal = {
  legacyEventName: string;
  canonicalEventName: TaskGuidanceEventName;
};

export type TaskGuidanceHistoryRecoveryPlan = {
  status: "legacy_alias_candidate" | "instrumentation_gap" | "source_ready_waiting_for_activity";
  observedEventNames: string[];
  aliasProposal: TaskGuidanceAliasProposal[];
  productionMutationAllowed: false;
  backfillMode: "none_dry_run_only";
  nextAction: string;
};

const LEGACY_GUIDANCE_ALIASES: TaskGuidanceAliasProposal[] = [
  { legacyEventName: "daily_task_guidance_opened", canonicalEventName: "task_guidance_viewed" },
  { legacyEventName: "task_guidance_banner_viewed", canonicalEventName: "task_guidance_viewed" },
  { legacyEventName: "task_guidance_cta_clicked", canonicalEventName: "task_guidance_tapped" },
  { legacyEventName: "task_guidance_banner_dismissed", canonicalEventName: "task_guidance_dismissed" },
];

export function buildTaskGuidanceHistoryRecoveryPlan(input: {
  observedEventNames?: readonly string[];
} = {}): TaskGuidanceHistoryRecoveryPlan {
  const observedEventNames = [...new Set(input.observedEventNames ?? [])];
  const aliasProposal = LEGACY_GUIDANCE_ALIASES.filter((alias) => (
    observedEventNames.includes(alias.legacyEventName)
  ));
  const status = aliasProposal.length > 0
    ? "legacy_alias_candidate"
    : observedEventNames.length > 0
      ? "source_ready_waiting_for_activity"
      : "instrumentation_gap";

  return {
    status,
    observedEventNames,
    aliasProposal,
    productionMutationAllowed: false,
    backfillMode: "none_dry_run_only",
    nextAction: aliasProposal.length > 0
      ? "Keep the alias map in event normalization and historical rollups; do not backfill production in this batch."
      : "Classify current zero samples as a new instrumentation gap until real guidance events arrive.",
  };
}
