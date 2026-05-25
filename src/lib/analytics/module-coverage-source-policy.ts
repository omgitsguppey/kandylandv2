export type AnalyticsModuleCoverageSourceType =
  | "ga4"
  | "event_facts"
  | "telemetry_logs"
  | "page_rollups"
  | "guest_batches"
  | "task_lifecycle"
  | "task_pipeline"
  | "commerce_transactions"
  | "commerce_rollups"
  | "purchase_server_telemetry"
  | "unlock_transactions"
  | "unlock_rollups"
  | "unlock_server_telemetry"
  | "watch_sessions"
  | "session_facts"
  | "viewer_start_events"
  | "notification_outcomes"
  | "push_tokens"
  | "auth_outcomes"
  | "identity_handoff"
  | "route_runtime"
  | "debug_evidence"
  | "admin_truth_snapshot"
  | "creator_lane_snapshot"
  | "support_threads"
  | "ai_repair_work_items"
  | "external_archive_only";

export type AnalyticsModuleCoverageId =
  | "auth"
  | "onboarding"
  | "navigation"
  | "notifications"
  | "daily_tasks"
  | "task_guidance"
  | "commerce"
  | "unlock_watch"
  | "creator_experiences"
  | "engagement"
  | "admin"
  | "runtime"
  | "support"
  | "ai_debug";

export interface AnalyticsModuleCoverageSourcePolicy {
  moduleId: AnalyticsModuleCoverageId;
  label: string;
  requiredForBeta: boolean;
  requiredSources: AnalyticsModuleCoverageSourceType[];
  acceptedSubstituteSources: AnalyticsModuleCoverageSourceType[];
  optionalSources: AnalyticsModuleCoverageSourceType[];
  forbiddenSources: AnalyticsModuleCoverageSourceType[];
  sourcePriority: AnalyticsModuleCoverageSourceType[];
  externalEvidenceOnlySources: AnalyticsModuleCoverageSourceType[];
  internalCanonicalSources: AnalyticsModuleCoverageSourceType[];
  dependentPanels: string[];
  validators: string[];
  passPolicy: string;
  blockPolicy: string;
  nextAction: string;
}

export const MODULE_COVERAGE_SOURCE_LABELS: Record<AnalyticsModuleCoverageSourceType, string> = {
  ga4: "GA4",
  event_facts: "Event facts",
  telemetry_logs: "Telemetry logs",
  page_rollups: "Page rollups",
  guest_batches: "Guest batches",
  task_lifecycle: "Task lifecycle",
  task_pipeline: "Task pipeline",
  commerce_transactions: "Commerce transactions",
  commerce_rollups: "Commerce rollups",
  purchase_server_telemetry: "Purchase server telemetry",
  unlock_transactions: "Unlock transactions",
  unlock_rollups: "Unlock rollups",
  unlock_server_telemetry: "Unlock server telemetry",
  watch_sessions: "Watch sessions",
  session_facts: "Session facts",
  viewer_start_events: "Viewer start events",
  notification_outcomes: "Notification outcomes",
  push_tokens: "Push tokens",
  auth_outcomes: "Auth outcomes",
  identity_handoff: "Identity handoff",
  route_runtime: "Route runtime",
  debug_evidence: "Debug evidence",
  admin_truth_snapshot: "Admin truth snapshot",
  creator_lane_snapshot: "Creator lane snapshot",
  support_threads: "Support threads",
  ai_repair_work_items: "AI repair work items",
  external_archive_only: "External archive only",
};

export const MODULE_COVERAGE_SOURCE_POLICIES: AnalyticsModuleCoverageSourcePolicy[] = [
  {
    moduleId: "auth",
    label: "Auth",
    requiredForBeta: true,
    requiredSources: ["auth_outcomes", "identity_handoff"],
    acceptedSubstituteSources: ["event_facts", "telemetry_logs", "route_runtime"],
    optionalSources: ["ga4"],
    forbiddenSources: [],
    sourcePriority: ["auth_outcomes", "identity_handoff", "event_facts", "telemetry_logs", "ga4"],
    externalEvidenceOnlySources: ["ga4"],
    internalCanonicalSources: ["auth_outcomes", "identity_handoff", "event_facts", "route_runtime"],
    dependentPanels: ["Telemetry parity", "Analytics source health", "Admin analytics overview"],
    validators: ["check:telemetry-parity-score", "check:event-fact-truth"],
    passPolicy: "Auth requires auth outcomes or identity handoff plus a canonical event/fact or route runtime source.",
    blockPolicy: "Auth remains blocked when no accepted auth source lands for the selected range.",
    nextAction: "Wire auth outcome or identity handoff evidence before treating auth module coverage as verified.",
  },
  {
    moduleId: "onboarding",
    label: "Onboarding",
    requiredForBeta: true,
    requiredSources: ["event_facts"],
    acceptedSubstituteSources: ["telemetry_logs"],
    optionalSources: ["ga4"],
    forbiddenSources: [],
    sourcePriority: ["event_facts", "telemetry_logs", "ga4"],
    externalEvidenceOnlySources: ["ga4"],
    internalCanonicalSources: ["event_facts", "telemetry_logs"],
    dependentPanels: ["Onboarding/task parity", "Audience snapshot", "User behavior scoring"],
    validators: ["check:event-fact-truth", "check:person-metrics-hydration"],
    passPolicy: "Onboarding requires canonical start/completion event facts or telemetry logs.",
    blockPolicy: "Missing onboarding event facts keeps the module partial or empty.",
    nextAction: "Confirm onboarding start and completion events materialize into event facts.",
  },
  {
    moduleId: "navigation",
    label: "Navigation",
    requiredForBeta: true,
    requiredSources: ["page_rollups", "route_runtime"],
    acceptedSubstituteSources: ["event_facts", "telemetry_logs"],
    optionalSources: ["ga4"],
    forbiddenSources: [],
    sourcePriority: ["page_rollups", "route_runtime", "event_facts", "telemetry_logs", "ga4"],
    externalEvidenceOnlySources: ["ga4"],
    internalCanonicalSources: ["page_rollups", "route_runtime", "event_facts", "telemetry_logs"],
    dependentPanels: ["Telemetry parity", "Analytics source health", "Admin analytics overview"],
    validators: ["check:telemetry-parity-score", "check:admin-debug-control-tower"],
    passPolicy: "Navigation requires page rollups or route runtime with page/navigation event facts.",
    blockPolicy: "Navigation stays blocked when route/page producers and materializers are absent.",
    nextAction: "Wire page view, route runtime, or page rollup evidence for navigation coverage.",
  },
  {
    moduleId: "notifications",
    label: "Notifications",
    requiredForBeta: true,
    requiredSources: ["notification_outcomes"],
    acceptedSubstituteSources: ["notification_outcomes", "push_tokens", "event_facts", "telemetry_logs"],
    optionalSources: ["ga4"],
    forbiddenSources: [],
    sourcePriority: ["notification_outcomes", "push_tokens", "event_facts", "telemetry_logs", "ga4"],
    externalEvidenceOnlySources: ["ga4"],
    internalCanonicalSources: ["notification_outcomes", "push_tokens", "event_facts", "telemetry_logs"],
    dependentPanels: ["Recent event flow", "Return loop", "Behavioral intelligence"],
    validators: ["check:notification-pwa-score-lock", "check:event-fact-truth"],
    passPolicy: "Notifications can verify through notification outcomes and push/token lifecycle evidence without GA4.",
    blockPolicy: "Notification remains empty only when no outcome, push token, event fact, or telemetry log source exists.",
    nextAction: "Map notification outcomes, push registration, or user-action facts into module coverage.",
  },
  {
    moduleId: "daily_tasks",
    label: "Daily Tasks",
    requiredForBeta: true,
    requiredSources: ["task_lifecycle"],
    acceptedSubstituteSources: ["task_lifecycle", "event_facts", "telemetry_logs"],
    optionalSources: ["ga4"],
    forbiddenSources: [],
    sourcePriority: ["task_lifecycle", "event_facts", "telemetry_logs", "ga4"],
    externalEvidenceOnlySources: ["ga4"],
    internalCanonicalSources: ["task_lifecycle", "event_facts", "telemetry_logs"],
    dependentPanels: ["Onboarding/task parity", "Recent task activity sample", "Task rollups"],
    validators: ["check:daily-task-lifecycle-telemetry", "check:daily-task-telemetry-truth"],
    passPolicy: "Daily Tasks requires task lifecycle or task event facts; GA4 is optional external evidence.",
    blockPolicy: "Task lifecycle evidence must count as an accepted source and cannot be ignored.",
    nextAction: "Keep task lifecycle mapped and repair event fact materialization if verification is still partial.",
  },
  {
    moduleId: "task_guidance",
    label: "Task Guidance",
    requiredForBeta: true,
    requiredSources: ["task_pipeline"],
    acceptedSubstituteSources: ["task_pipeline", "event_facts", "telemetry_logs"],
    optionalSources: ["ga4"],
    forbiddenSources: [],
    sourcePriority: ["task_pipeline", "event_facts", "telemetry_logs", "ga4"],
    externalEvidenceOnlySources: ["ga4"],
    internalCanonicalSources: ["task_pipeline", "event_facts", "telemetry_logs"],
    dependentPanels: ["Onboarding/task parity", "Task completion guidance", "Behavioral intelligence"],
    validators: ["check:task-guidance-telemetry-contract", "check:task-guidance-event-normalization"],
    passPolicy: "Task Guidance requires the task guidance pipeline and guidance events or facts.",
    blockPolicy: "Task guidance pipeline evidence prevents empty classification but missing facts keep the module partial.",
    nextAction: "Map task guidance pipeline and expected guidance events into event facts.",
  },
  {
    moduleId: "commerce",
    label: "Commerce",
    requiredForBeta: true,
    requiredSources: ["commerce_transactions", "commerce_rollups"],
    acceptedSubstituteSources: ["purchase_server_telemetry", "event_facts"],
    optionalSources: ["ga4"],
    forbiddenSources: [],
    sourcePriority: ["commerce_transactions", "purchase_server_telemetry", "commerce_rollups", "event_facts", "ga4"],
    externalEvidenceOnlySources: ["ga4"],
    internalCanonicalSources: ["commerce_transactions", "commerce_rollups", "purchase_server_telemetry", "event_facts"],
    dependentPanels: ["Commerce parity", "Recent receipts / dedupe sample", "User value score"],
    validators: ["check:commerce-parity-validator-semantics", "check:server-purchase-telemetry-emission"],
    passPolicy: "Commerce requires ledger/rollup reconciliation and server purchase telemetry when purchases exist.",
    blockPolicy: "Missing server purchase telemetry keeps commerce parity blocked even when ledger truth exists.",
    nextAction: "Reconcile purchase transactions, server telemetry, and commerce rollups.",
  },
  {
    moduleId: "unlock_watch",
    label: "Unlock/watch",
    requiredForBeta: true,
    requiredSources: ["unlock_transactions", "watch_sessions"],
    acceptedSubstituteSources: ["unlock_rollups", "unlock_server_telemetry", "viewer_start_events", "session_facts", "event_facts"],
    optionalSources: ["ga4"],
    forbiddenSources: [],
    sourcePriority: ["unlock_transactions", "unlock_server_telemetry", "unlock_rollups", "viewer_start_events", "watch_sessions", "session_facts", "event_facts", "ga4"],
    externalEvidenceOnlySources: ["ga4"],
    internalCanonicalSources: ["unlock_transactions", "unlock_rollups", "unlock_server_telemetry", "viewer_start_events", "watch_sessions", "session_facts"],
    dependentPanels: ["Unlock/watch parity", "Watch-time", "Behavioral intelligence"],
    validators: ["check:unlock-watch-validation-semantics", "check:drop-watch-time-accuracy"],
    passPolicy: "Unlock/watch needs unlock ledger evidence and watch/session capture; missing server unlock or viewer start stays explicit.",
    blockPolicy: "Missing unlock telemetry or viewer start evidence keeps the module partial, not hidden behind watch sessions.",
    nextAction: "Reconcile unlock transactions, server unlock telemetry, viewer starts, watch sessions, and session facts.",
  },
  {
    moduleId: "creator_experiences",
    label: "Creator Experiences",
    requiredForBeta: false,
    requiredSources: ["creator_lane_snapshot"],
    acceptedSubstituteSources: ["event_facts", "telemetry_logs"],
    optionalSources: ["ga4"],
    forbiddenSources: [],
    sourcePriority: ["creator_lane_snapshot", "event_facts", "telemetry_logs", "ga4"],
    externalEvidenceOnlySources: ["ga4"],
    internalCanonicalSources: ["creator_lane_snapshot", "event_facts", "telemetry_logs"],
    dependentPanels: ["Creator lane", "Creator dashboard", "Creator performance"],
    validators: ["check:admin-analytics-overview", "check:feature-registration-gate"],
    passPolicy: "Creator experience coverage is optional for this beta lane and uses creator lane evidence before GA4.",
    blockPolicy: "Optional creator gaps are displayed separately and do not block required module parity.",
    nextAction: "Map creator lane snapshots or creator event facts when creator analytics becomes required.",
  },
  {
    moduleId: "engagement",
    label: "Engagement",
    requiredForBeta: true,
    requiredSources: ["event_facts", "session_facts"],
    acceptedSubstituteSources: ["watch_sessions", "page_rollups", "guest_batches", "telemetry_logs"],
    optionalSources: ["ga4"],
    forbiddenSources: [],
    sourcePriority: ["event_facts", "session_facts", "watch_sessions", "page_rollups", "guest_batches", "telemetry_logs", "ga4"],
    externalEvidenceOnlySources: ["ga4"],
    internalCanonicalSources: ["event_facts", "session_facts", "watch_sessions", "page_rollups", "guest_batches"],
    dependentPanels: ["Analytics source health", "Audience snapshot", "Behavioral intelligence"],
    validators: ["check:event-fact-truth", "check:person-metrics-hydration"],
    passPolicy: "Engagement can verify through event facts plus session/watch/page evidence; GA4 is external support.",
    blockPolicy: "Event facts alone are partial until a session, watch, page, or guest context source is present.",
    nextAction: "Link engagement event facts with session facts, watch sessions, page rollups, or guest batches.",
  },
  {
    moduleId: "admin",
    label: "Admin",
    requiredForBeta: false,
    requiredSources: ["admin_truth_snapshot", "debug_evidence"],
    acceptedSubstituteSources: ["route_runtime"],
    optionalSources: [],
    forbiddenSources: ["ga4"],
    sourcePriority: ["admin_truth_snapshot", "debug_evidence", "route_runtime"],
    externalEvidenceOnlySources: [],
    internalCanonicalSources: ["admin_truth_snapshot", "debug_evidence", "route_runtime"],
    dependentPanels: ["Admin debug control tower", "Admin AI diagnostics", "Ops health"],
    validators: ["check:admin-debug-control-tower", "check:debug-runtime-evidence"],
    passPolicy: "Admin coverage is internal and verifies through admin truth snapshots and debug evidence.",
    blockPolicy: "Admin/Runtime must not require GA4 as a primary source.",
    nextAction: "Use admin truth snapshots, debug evidence, and route runtime health for admin module coverage.",
  },
  {
    moduleId: "runtime",
    label: "Runtime",
    requiredForBeta: false,
    requiredSources: ["route_runtime", "debug_evidence"],
    acceptedSubstituteSources: ["admin_truth_snapshot"],
    optionalSources: [],
    forbiddenSources: ["ga4"],
    sourcePriority: ["route_runtime", "debug_evidence", "admin_truth_snapshot"],
    externalEvidenceOnlySources: [],
    internalCanonicalSources: ["route_runtime", "debug_evidence", "admin_truth_snapshot"],
    dependentPanels: ["Analytics source health", "Refresh diagnostics", "Ops health"],
    validators: ["check:admin-debug-control-tower", "check:debug-runtime-evidence"],
    passPolicy: "Runtime coverage is internal and verifies through route runtime health plus debug evidence.",
    blockPolicy: "Runtime must not be empty when route/debug evidence exists, and it must not require GA4.",
    nextAction: "Map route runtime health and server diagnostics into runtime module coverage.",
  },
  {
    moduleId: "support",
    label: "Support",
    requiredForBeta: false,
    requiredSources: ["support_threads"],
    acceptedSubstituteSources: ["debug_evidence", "admin_truth_snapshot"],
    optionalSources: [],
    forbiddenSources: ["ga4"],
    sourcePriority: ["support_threads", "debug_evidence", "admin_truth_snapshot"],
    externalEvidenceOnlySources: [],
    internalCanonicalSources: ["support_threads", "debug_evidence", "admin_truth_snapshot"],
    dependentPanels: ["Support inbox", "Admin debug control tower"],
    validators: ["check:admin-debug-control-tower"],
    passPolicy: "Support coverage is optional and uses support thread/admin truth evidence, not GA4.",
    blockPolicy: "Support gaps are optional unless support module parity is explicitly promoted.",
    nextAction: "Map support thread counts when support coverage becomes part of required module parity.",
  },
  {
    moduleId: "ai_debug",
    label: "AI Debug",
    requiredForBeta: false,
    requiredSources: ["ai_repair_work_items"],
    acceptedSubstituteSources: ["debug_evidence", "admin_truth_snapshot"],
    optionalSources: [],
    forbiddenSources: ["ga4"],
    sourcePriority: ["ai_repair_work_items", "debug_evidence", "admin_truth_snapshot"],
    externalEvidenceOnlySources: [],
    internalCanonicalSources: ["ai_repair_work_items", "debug_evidence", "admin_truth_snapshot"],
    dependentPanels: ["AI diagnostics", "Admin debug control tower"],
    validators: ["check:admin-debug-control-tower"],
    passPolicy: "AI Debug coverage is optional and uses internal repair/debug evidence.",
    blockPolicy: "AI Debug gaps are optional and must not block required analytics module parity.",
    nextAction: "Map AI repair work items or debug evidence when AI Debug coverage is promoted.",
  },
];

const POLICY_BY_ID = new Map(MODULE_COVERAGE_SOURCE_POLICIES.map((policy) => [policy.moduleId, policy]));

export function getModuleCoveragePolicy(moduleId: AnalyticsModuleCoverageId) {
  const policy = POLICY_BY_ID.get(moduleId);
  if (!policy) throw new Error(`Unknown analytics module coverage policy: ${moduleId}`);
  return policy;
}

export function sourceLabel(source: AnalyticsModuleCoverageSourceType) {
  return MODULE_COVERAGE_SOURCE_LABELS[source] ?? source;
}
