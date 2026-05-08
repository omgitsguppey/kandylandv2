export const ANALYTICS_IMPORT_EXPORT_TRUTH_CLASS = "analytics_evidence_only";

export const CANONICAL_FACT_IMPORT_TARGETS = ["analytics_event_facts", "analytics_metric_facts"] as const;

export const FORBIDDEN_RUNTIME_MUTATION_SURFACES = [
  "runtime_balances",
  "runtime_transactions",
  "runtime_unlocks",
  "runtime_purchases",
  "runtime_subscriptions",
  "runtime_support_messages",
  "runtime_user_rollups",
  "legacy_admin_metric_snapshots",
] as const;

export const ANALYTICS_IMPORT_EXPORT_POLICY = {
  analyticsEvidenceOnly: true,
  schemaValidationRequired: true,
  dryRunRequiredBeforeImport: true,
  idempotentImportRequired: true,
  runtimeImportBlocked: true,
  canonicalFactImportTargets: [...CANONICAL_FACT_IMPORT_TARGETS],
  forbiddenRuntimeMutationSurfaces: [...FORBIDDEN_RUNTIME_MUTATION_SURFACES],
} as const;
