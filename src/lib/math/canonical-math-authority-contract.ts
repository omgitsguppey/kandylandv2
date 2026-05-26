export type MathDomain =
  | "beta_score"
  | "source_health"
  | "runtime_health"
  | "evidence_completeness"
  | "freshness"
  | "cost_risk"
  | "regression_risk"
  | "user_metrics"
  | "global_metrics"
  | "session_metrics"
  | "watch_time"
  | "bounce"
  | "revenue"
  | "gumdrop"
  | "creator_monetization"
  | "fan_pass"
  | "discovery"
  | "chat"
  | "daily_tasks"
  | "notifications"
  | "media"
  | "legacy_recovery";

export type MathFormulaId =
  | "beta_score.scanner_penalty"
  | "beta_score.domain_score"
  | "beta_score.source_health"
  | "beta_score.runtime_health"
  | "beta_score.evidence_completeness"
  | "beta_score.freshness_score"
  | "beta_score.cost_risk"
  | "beta_score.regression_risk"
  | "beta_score.overall_health"
  | "person_metrics.hydrated_event_count"
  | "global_metrics.event_fact_count"
  | "user_metrics.event_fact_count"
  | "behavioral_event_fact.deduped_count"
  | "count_dedupe.page_session_count"
  | "count_dedupe.signup_login_count"
  | "count_dedupe.drop_open_count"
  | "count_dedupe.unwrap_count"
  | "count_dedupe.watch_session_count"
  | "count_dedupe.wallet_open_count"
  | "count_dedupe.checkout_start_count"
  | "count_dedupe.payment_approved_count"
  | "count_dedupe.daily_task_count"
  | "count_dedupe.chat_event_count"
  | "count_dedupe.creator_profile_count"
  | "count_dedupe.creator_relationship_count"
  | "count_dedupe.fan_pass_count"
  | "count_dedupe.notification_count"
  | "count_dedupe.media_count"
  | "count_dedupe.support_account_count"
  | "count_dedupe.legacy_bucket_count"
  | "count_dedupe.global_count"
  | "count_dedupe.user_count"
  | "count_dedupe.creator_count"
  | "count_dedupe.retry_replay_suppression"
  | "session_metrics.active_session_time"
  | "bounce.session_bounce_status"
  | "watch_time.active_watch_ms"
  | "watch_time.normalized_watch_percent"
  | "sql_parity.summary_count_delta"
  | "revenue.server_verified_revenue"
  | "gumdrop.source_of_funds_balance"
  | "creator_monetization.entitlement_metric"
  | "fan_pass.access_lifecycle_metric"
  | "discovery.search_result_rate"
  | "chat.message_outcome_count"
  | "daily_tasks.reward_and_completion_count"
  | "notifications.permission_outcome_rate"
  | "media.upload_lifecycle_count"
  | "legacy_recovery.legacy_event_recovered_count";

export type MathAuthorityStatus =
  | "canonical"
  | "duplicate"
  | "stale"
  | "missing_definition"
  | "needs_operator_decision"
  | "in_flight";

export type MathConfidenceRule =
  | "exact"
  | "linked"
  | "inferred"
  | "weak"
  | "unknown"
  | "mixed_explicit";

export type DurationState = "active" | "passive" | "idle" | "hidden" | "playback" | "unknown";
export type ValueSourceBreakdown = "paid_gd" | "reward_gd" | "bonus_gd" | "source_of_funds" | "confidence" | "revenue_cents";

export type ScoreImpactDefinition = {
  scoreId: string;
  weight: number;
  formula: string;
  cap: string;
  penalty: string;
  blockerType: string;
};

export type FormulaDefinition = {
  formulaId: MathFormulaId;
  domain: MathDomain;
  humanName: string;
  formulaExpression: string;
  numerator: string;
  denominator: string;
  timeWindow: string;
  dedupeKey: string;
  sourceTruth: string;
  confidenceRule: string;
  confidenceLevel: MathConfidenceRule;
  zeroDenominatorRule: string;
  legacyRule: string;
  userFacingAllowed: boolean;
  adminFacingAllowed: boolean;
  scoreImpact: ScoreImpactDefinition | null;
  owner: string;
  authorityStatus: MathAuthorityStatus;
  sourcePaths: string[];
  countRule?: "integer" | "not_count";
  durationStates?: DurationState[];
  valueSourceBreakdown?: ValueSourceBreakdown[];
  globalUserDivergenceRule?: string;
};

export type FormulaReferenceStatus = MathAuthorityStatus;

export type FormulaInventoryReference = {
  referenceId: string;
  formulaId: MathFormulaId | `unowned.${string}`;
  sourcePath: string;
  status: FormulaReferenceStatus;
  reason: string;
};

export type FormulaValidationResult = {
  ok: boolean;
  formulaId?: MathFormulaId;
  status: MathAuthorityStatus;
  reason: string;
};

export type UnownedFormulaInput = {
  formulaId: string;
  sourcePath: string;
  reason?: string;
};
