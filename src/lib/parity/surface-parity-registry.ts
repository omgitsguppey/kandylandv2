import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import {
  FEATURE_REGISTRATION_REGISTRY,
} from "@/lib/features/feature-registration-registry";
import {
  MAJOR_SURFACE_PARITY_IDS,
  SURFACE_PARITY_DOCTRINE_VERSION,
  SURFACE_PARITY_REQUIRED_STATES,
  type SupersededParityValidator,
  type SurfaceParityContract,
  type SurfaceParityDirtyClassification,
  type SurfaceParityDoctrineReport,
  validateSurfaceParityRegistry,
} from "./surface-parity-contract";

const registeredFeatureIds = new Set<string>(FEATURE_REGISTRATION_REGISTRY.map((feature) => feature.featureId));

function featureEvents(featureId: string, fallback: string[]) {
  return FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.featureId === featureId)?.telemetryEvents.slice(0, 4) ?? fallback;
}

function dimensions(featureId: string, fallback: PublicBetaHealthDimension[]) {
  return FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.featureId === featureId)?.scoreDimensionsAffected ?? fallback;
}

function scoreImpact(featureId: string, before: string, after: string, fallback: PublicBetaHealthDimension[]) {
  return {
    before,
    after,
    dimensions: dimensions(featureId, fallback),
  };
}

function registrationStatus(featureId: string, systemInternal = false): SurfaceParityContract["featureRegistrationStatus"] {
  if (registeredFeatureIds.has(featureId)) return "registered";
  return systemInternal ? "classified_system_internal" : "explicit_exception";
}

export const SUPERSEDED_PARITY_VALIDATORS: SupersededParityValidator[] = [
  {
    id: "user-creator-ui-parity",
    packageScript: "check:user-creator-ui-parity",
    status: "supporting_evidence",
    authority: "surface_parity_doctrine",
    reason: "User/creator parity remains useful source evidence, but cross-role surface parity authority now lives in the canonical surface registry.",
  },
  {
    id: "user-creator-feature-parity",
    packageScript: "check:user-creator-feature-parity",
    status: "supporting_evidence",
    authority: "surface_parity_doctrine",
    reason: "Feature parity stays scoped to user and creator feature coverage; it no longer defines the full public/user/creator/admin surface state contract.",
  },
  {
    id: "legacy-admin-parity",
    packageScript: "legacy:admin-parity",
    status: "superseded_removed",
    authority: "surface_parity_doctrine",
    reason: "The legacy admin parity script is compatibility-only and cannot outrank the surface parity doctrine registry.",
  },
];

export const SURFACE_PARITY_REGISTRY: SurfaceParityContract[] = [
  {
    surfaceId: "public_homepage",
    surfaceOwner: "user-ui",
    roleVisibility: { guest: "visible", user: "visible", creator: "visible", admin: "visible" },
    canonicalRoute: "/",
    routeAliases: ["/drops", "/experiences"],
    featureId: "drops",
    featureRegistrationStatus: registrationStatus("drops"),
    dataSources: ["drop catalog metadata", "featured drop summaries", "public creator profile summaries"],
    backendRoutesOrActions: ["/api/drops", "/api/creators/[username]", "client navigation telemetry"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: ["home_page_viewed", "hero_cta_clicked", "drop_card_impression"],
    debugLane: "feature registration gate / drops behavior",
    scoreDimensionImpact: scoreImpact("drops", "Homepage parity was split across public UI and drop discovery checks.", "Public entry surface is mapped to drop discovery states, telemetry, and debug evidence.", ["sourceHealth", "evidenceCompleteness"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "guest_allowed",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Public entry keeps guest access and must not inherit admin diagnostic density."],
  },
  {
    surfaceId: "auth",
    surfaceOwner: "identity",
    roleVisibility: { guest: "visible", user: "redirect", creator: "redirect", admin: "redirect" },
    canonicalRoute: "/__auth",
    routeAliases: ["/login", "/signup"],
    featureId: "auth_identity",
    featureRegistrationStatus: registrationStatus("auth_identity"),
    dataSources: ["Firebase auth state", "user profile bootstrap", "consent handoff"],
    backendRoutesOrActions: ["/api/auth", "/api/user/register", "/api/user/complete-onboarding"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("auth_identity", ["auth_surface_viewed", "auth_attempt_started", "auth_attempt_failed"]),
    debugLane: "identity analytics / auth runtime telemetry",
    scoreDimensionImpact: scoreImpact("auth_identity", "Auth parity lived in separate runtime and telemetry validators.", "Auth surface now declares route, state, telemetry, debug, and permission ownership in one registry.", ["runtimeHealth", "evidenceCompleteness"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "guest_allowed",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Existing auth runtime phases may remain in flight; this phase only classifies the surface contract."],
  },
  {
    surfaceId: "user_dashboard",
    surfaceOwner: "user-dashboard",
    roleVisibility: { guest: "redirect", user: "visible", creator: "visible", admin: "visible" },
    canonicalRoute: "/dashboard",
    routeAliases: ["/account"],
    featureId: "user_dashboard",
    featureRegistrationStatus: registrationStatus("user_dashboard"),
    dataSources: ["user profile", "wallet balance summary", "recent activity", "daily check-in state"],
    backendRoutesOrActions: ["/api/user/profile", "/api/user/activity", "/api/checkin"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("user_dashboard", ["page_viewed", "settings_surface_viewed"]),
    debugLane: "user dashboard analytics / feature registration gate",
    scoreDimensionImpact: scoreImpact("user_dashboard", "Dashboard loading and state parity were validated in narrow mobile/user lanes.", "Dashboard role, loading, empty, error, telemetry, and debug state are registered as a major surface.", ["sourceHealth", "evidenceCompleteness"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "auth_required",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Creator and admin visibility here means authenticated shell access, not creator/admin diagnostics."],
  },
  {
    surfaceId: "wallet_purchase_modal",
    surfaceOwner: "wallet",
    roleVisibility: { guest: "redirect", user: "visible", creator: "visible", admin: "visible" },
    canonicalRoute: "/dashboard?wallet=1",
    routeAliases: ["/api/wallet", "/api/paypal", "/api/checkout"],
    featureId: "wallet",
    featureRegistrationStatus: registrationStatus("wallet"),
    dataSources: ["wallet balance summary", "server payment truth", "commerce ledger projection"],
    backendRoutesOrActions: ["/api/wallet", "/api/paypal", "/api/checkout"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("wallet", ["wallet_opened", "begin_checkout", "purchase_completed"]),
    debugLane: "commerce parity / wallet analytics",
    scoreDimensionImpact: scoreImpact("wallet", "Wallet parity remains protected by payment-specific validators.", "Surface registry references wallet state and telemetry without changing payment runtime or GumDrop math.", ["runtimeHealth", "evidenceCompleteness", "costRisk"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "auth_required",
    oldLogicStatus: "still_required",
    parityNotes: ["Payment, PayPal, and GumDrop source-of-funds logic remain owned by wallet and commerce validators."],
  },
  {
    surfaceId: "drops_library",
    surfaceOwner: "drops-library",
    roleVisibility: { guest: "readonly", user: "visible", creator: "visible", admin: "visible" },
    canonicalRoute: "/drops",
    routeAliases: ["/experiences", "/dashboard/library"],
    featureId: "library",
    featureRegistrationStatus: registrationStatus("library"),
    dataSources: ["drop metadata", "unlock ledger projection", "library activity summaries"],
    backendRoutesOrActions: ["/api/drops", "/api/user/activity"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("library", ["drop_card_impression", "drop_preview_opened", "file_viewed"]),
    debugLane: "drops and library behavior evidence",
    scoreDimensionImpact: scoreImpact("library", "Drop and library parity were split between discovery, unlock, and library validators.", "Combined library surface now declares safe states without changing unlock or entitlement truth.", ["sourceHealth", "evidenceCompleteness"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "mixed_role_clear",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Readonly guest visibility must not expose locked internal content."],
  },
  {
    surfaceId: "creator_dashboard",
    surfaceOwner: "creator-dashboard",
    roleVisibility: { guest: "redirect", user: "redirect", creator: "visible", admin: "visible" },
    canonicalRoute: "/creator",
    routeAliases: ["/dashboard/creator", "/creators/dashboard"],
    featureId: "creator_dashboard",
    featureRegistrationStatus: registrationStatus("creator_dashboard"),
    dataSources: ["creator profile projection", "creator stats", "creator onboarding state"],
    backendRoutesOrActions: ["/api/creator/payouts", "/api/creator/onboarding"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("creator_dashboard", ["creator_dashboard_viewed", "creator_dashboard_settings_viewed"]),
    debugLane: "creator lane debug parity",
    scoreDimensionImpact: scoreImpact("creator_dashboard", "Creator dashboard parity existed in creator-specific checks.", "Creator dashboard is now part of cross-role surface parity while preserving creator/admin separation.", ["sourceHealth", "evidenceCompleteness"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "creator_only",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Admin visibility is operational review access, not user-facing creator state."],
  },
  {
    surfaceId: "creator_settings",
    surfaceOwner: "creator-settings",
    roleVisibility: { guest: "redirect", user: "redirect", creator: "visible", admin: "visible" },
    canonicalRoute: "/dashboard/creator/settings",
    routeAliases: ["/creator/settings"],
    featureId: "creator_settings",
    featureRegistrationStatus: registrationStatus("creator_settings"),
    dataSources: ["creator settings document", "pricing settings", "landing settings"],
    backendRoutesOrActions: ["/api/creator/settings", "/api/settings/landing"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("creator_settings", ["creator_dashboard_settings_viewed", "creator_setting_updated", "setting_save_failed"]),
    debugLane: "settings connection parity",
    scoreDimensionImpact: scoreImpact("creator_settings", "Settings parity was split between route alias and settings connection validators.", "Creator settings now declares role, state, save/error telemetry, and debug ownership in one surface contract.", ["sourceHealth", "evidenceCompleteness"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "creator_only",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Settings validators remain active as surface-specific evidence."],
  },
  {
    surfaceId: "creator_drop_manager",
    surfaceOwner: "creator-drops",
    roleVisibility: { guest: "redirect", user: "redirect", creator: "visible", admin: "visible" },
    canonicalRoute: "/dashboard/creator/drops",
    routeAliases: ["/api/creator/drops", "/api/admin/drops"],
    featureId: "creator_drop_manager",
    featureRegistrationStatus: registrationStatus("creator_drop_manager"),
    dataSources: ["creator drop drafts", "drop approval state", "drop metrics projection"],
    backendRoutesOrActions: ["/api/creator/drops", "/api/admin/drops"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("creator_drop_manager", ["creator_drop_manager_viewed", "creator_drop_submitted", "creator_drop_submission_failed"]),
    debugLane: "creator drop status metrics",
    scoreDimensionImpact: scoreImpact("creator_drop_manager", "Drop manager proof was source-specific.", "Drop manager is registered with approval, error, empty, and telemetry parity expectations.", ["sourceHealth", "evidenceCompleteness"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "creator_only",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Admin drop review remains admin truth; creator state must not grant approval authority."],
  },
  {
    surfaceId: "creator_profile_timeline",
    surfaceOwner: "creator-profile",
    roleVisibility: { guest: "readonly", user: "visible", creator: "visible", admin: "visible" },
    canonicalRoute: "/creators/[username]",
    routeAliases: ["/dashboard/profile/creator"],
    featureId: "creator_profile",
    featureRegistrationStatus: registrationStatus("creator_profile"),
    dataSources: ["public creator profile", "timeline posts", "follow relationship", "fan pass state"],
    backendRoutesOrActions: ["/api/creators/[username]", "/api/creator/discovery", "/api/user/follow"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("creator_profile", ["creator_profile_viewed", "creator_followed", "creator_timeline_viewed"]),
    debugLane: "creator profile mobile timeline",
    scoreDimensionImpact: scoreImpact("creator_profile", "Creator profile and timeline parity lived in mobile/profile validators.", "Profile/timeline visibility, empty state, telemetry, and debug lanes are registered together.", ["sourceHealth", "evidenceCompleteness"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "mixed_role_clear",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Guest readonly access must keep paid/internal content protected."],
  },
  {
    surfaceId: "chat",
    surfaceOwner: "chat",
    roleVisibility: { guest: "redirect", user: "visible", creator: "visible", admin: "hidden" },
    canonicalRoute: "/dashboard/chat",
    routeAliases: ["/api/chat", "/api/creator/messages"],
    featureId: "chat_system_internal",
    featureRegistrationStatus: registrationStatus("chat_system_internal", true),
    dataSources: ["chat threads", "messages", "presence", "gating state"],
    backendRoutesOrActions: ["/api/chat", "/api/creator/messages", "Firestore realtime listener with detach policy"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: ["chat_surface_viewed", "chat_thread_list_loaded", "chat_message_sent", "chat_message_failed"],
    debugLane: "chat telemetry admin truth / chat realtime cost control",
    scoreDimensionImpact: { before: "Chat parity phases are allowed to remain in flight.", after: "Chat is classified as an exception surface without modifying chat internals.", dimensions: ["runtimeHealth", "evidenceCompleteness", "costRisk"] },
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "auth_required",
    oldLogicStatus: "in_flight_leave_alone",
    parityNotes: ["This doctrine only classifies chat parity status; it does not remove legitimate chat realtime behavior."],
  },
  {
    surfaceId: "daily_tasks_checkin",
    surfaceOwner: "retention",
    roleVisibility: { guest: "redirect", user: "visible", creator: "visible", admin: "visible" },
    canonicalRoute: "/experiences",
    routeAliases: ["/api/checkin", "/api/tasks"],
    featureId: "daily_checkin",
    featureRegistrationStatus: registrationStatus("daily_checkin"),
    dataSources: ["daily task state", "check-in state", "reward ledger projection"],
    backendRoutesOrActions: ["/api/checkin", "/api/tasks"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("daily_checkin", ["daily_task_progressed", "daily_task_completed", "task_completed"]),
    debugLane: "daily task lifecycle telemetry",
    scoreDimensionImpact: scoreImpact("daily_checkin", "Task/check-in parity was handled by task-specific phases.", "Task/check-in surface state is mapped while reward ledger truth remains unchanged.", ["evidenceCompleteness"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "auth_required",
    oldLogicStatus: "in_flight_leave_alone",
    parityNotes: ["Reward telemetry must not override canonical task or GumDrop ledger truth."],
  },
  {
    surfaceId: "notifications_pwa_prompt",
    surfaceOwner: "notifications",
    roleVisibility: { guest: "readonly", user: "visible", creator: "visible", admin: "visible" },
    canonicalRoute: "native:notification-prompt",
    routeAliases: ["/api/notifications"],
    featureId: "notifications",
    featureRegistrationStatus: registrationStatus("notifications"),
    dataSources: ["notification permission state", "push token registration", "notification queue"],
    backendRoutesOrActions: ["/api/notifications", "service worker registration"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("notifications", ["notification_prompt_shown", "notification_permission_requested", "notification_permission_denied"]),
    debugLane: "notification PWA score lock",
    scoreDimensionImpact: scoreImpact("notifications", "Notification and PWA parity phases may be running independently.", "Prompt surface now has explicit visibility, empty/error, telemetry, and debug classification.", ["runtimeHealth", "evidenceCompleteness"]),
    mobileDensityStatus: "external_native",
    rolePermissionStatus: "mixed_role_clear",
    oldLogicStatus: "in_flight_leave_alone",
    parityNotes: ["Browser/native permission behavior is external; UI must still show permission state honestly."],
  },
  {
    surfaceId: "account_settings",
    surfaceOwner: "settings",
    roleVisibility: { guest: "redirect", user: "visible", creator: "visible", admin: "visible" },
    canonicalRoute: "/settings",
    routeAliases: ["/profile/settings", "/dashboard/settings", "/dashboard/profile"],
    featureId: "user_dashboard",
    featureRegistrationStatus: registrationStatus("user_dashboard"),
    dataSources: ["user profile", "privacy consent settings", "account preferences"],
    backendRoutesOrActions: ["/api/user/profile", "/api/privacy", "/api/user/data"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: ["settings_surface_viewed", "setting_save_succeeded", "setting_save_failed"],
    debugLane: "settings connection parity / privacy behavior",
    scoreDimensionImpact: scoreImpact("user_dashboard", "Account settings parity was split from creator settings parity.", "Account settings is explicitly mapped to user roles, save/error telemetry, and debug visibility.", ["sourceHealth", "evidenceCompleteness"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "auth_required",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Account settings stays user-oriented and must not inherit creator control-plane permissions."],
  },
  {
    surfaceId: "admin_dashboard",
    surfaceOwner: "admin",
    roleVisibility: { guest: "redirect", user: "redirect", creator: "redirect", admin: "visible" },
    canonicalRoute: "/admin",
    routeAliases: ["/api/admin/overview"],
    featureId: "admin_debug",
    featureRegistrationStatus: registrationStatus("admin_debug"),
    dataSources: ["admin overview hot-cache snapshot", "admin heartbeat", "admin support summaries"],
    backendRoutesOrActions: ["/api/admin/overview"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("admin_debug", ["admin_overview_viewed", "admin_surface_loaded", "admin_surface_failed"]),
    debugLane: "admin hot-cache heartbeat / admin debug",
    scoreDimensionImpact: scoreImpact("admin_debug", "Admin overview parity recently moved to hot-cache and compact platform pulse evidence.", "Admin dashboard states are registered as snapshot-first with visible stale/missing/error states.", ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "admin_only",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Admin UI must show stale/missing as stale/missing and keep raw diagnostics in Debug."],
  },
  {
    surfaceId: "admin_debug",
    surfaceOwner: "admin-debug",
    roleVisibility: { guest: "redirect", user: "redirect", creator: "redirect", admin: "visible" },
    canonicalRoute: "/admin/debug",
    routeAliases: ["/api/admin/debug"],
    featureId: "admin_debug",
    featureRegistrationStatus: registrationStatus("admin_debug"),
    dataSources: ["debug backlog", "generated reports", "route runtime health", "cost/security/device evidence"],
    backendRoutesOrActions: ["/api/admin/debug", "agent generated report readers"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("admin_debug", ["admin_debug_viewed", "admin_debug_filter_changed", "admin_debug_refresh_failed"]),
    debugLane: "admin debug control tower",
    scoreDimensionImpact: scoreImpact("admin_debug", "Debug evidence lanes already existed but did not define all product surface contracts.", "Admin Debug remains the visibility lane for source, telemetry, stale, and missing parity evidence.", ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness"]),
    mobileDensityStatus: "desktop_operational",
    rolePermissionStatus: "admin_only",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Debug may show technical proof; primary product surfaces should stay summary-first."],
  },
  {
    surfaceId: "user_management",
    surfaceOwner: "admin-users",
    roleVisibility: { guest: "redirect", user: "redirect", creator: "redirect", admin: "visible" },
    canonicalRoute: "/admin/users",
    routeAliases: ["/api/admin/users", "/api/admin/user/[userId]"],
    featureId: "admin_debug",
    featureRegistrationStatus: registrationStatus("admin_debug"),
    dataSources: ["admin users snapshot", "user truth snapshot", "role/audit records"],
    backendRoutesOrActions: ["/api/admin/users", "/api/admin/user/[userId]"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: ["admin_user_management_viewed", "admin_user_action_started", "admin_user_action_failed"],
    debugLane: "user management status truth",
    scoreDimensionImpact: scoreImpact("admin_debug", "User management parity was admin-specific.", "User management role, permission denied, empty, degraded, and audit state contracts are registered.", ["sourceHealth", "runtimeHealth", "evidenceCompleteness"]),
    mobileDensityStatus: "desktop_operational",
    rolePermissionStatus: "admin_only",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Role-specific permissions must remain admin-only and audited."],
  },
  {
    surfaceId: "support_policies",
    surfaceOwner: "support-policy",
    roleVisibility: { guest: "readonly", user: "visible", creator: "visible", admin: "visible" },
    canonicalRoute: "/dashboard/support",
    routeAliases: ["/faq", "/privacy", "/terms", "/api/support", "/api/bug-reports"],
    featureId: "support",
    featureRegistrationStatus: registrationStatus("support"),
    dataSources: ["support threads", "bug reports", "policy documents", "data export status"],
    backendRoutesOrActions: ["/api/support", "/api/bug-reports", "/api/user/data"],
    requiredStates: [...SURFACE_PARITY_REQUIRED_STATES],
    telemetryEvents: featureEvents("support", ["support_ticket_created", "support_thread_opened", "bug_report_submitted"]),
    debugLane: "support route recovery / support policy cleanup",
    scoreDimensionImpact: scoreImpact("support", "Support, bug, FAQ, policy, and privacy surfaces were mapped across several trust validators.", "Support/policy surface states are registered together while preserving user-owned support truth.", ["runtimeHealth", "evidenceCompleteness"]),
    mobileDensityStatus: "mobile_ready",
    rolePermissionStatus: "mixed_role_clear",
    oldLogicStatus: "active_canonical",
    parityNotes: ["Admin support visibility must not convert admin/debug diagnostics into user-reported support counts."],
  },
];

export const ACTIVE_SUPPORTING_PARITY_VALIDATORS = [
  "check:feature-registration-gate",
  "check:targeted-behavior-evidence",
  "check:user-creator-ui-parity",
  "check:settings-connection-parity",
  "check:creator-lane-debug-parity",
  "check:telemetry-parity-score",
] as const;

export function classifySurfaceParityDirtyFile(path: string): SurfaceParityDirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "agent/state/surface-parity-doctrine.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/targeted-behavior-evidence.generated.json") return "stale_generated_artifact_to_regenerate";
  if (normalized === "docs/agent-truth/surface-parity-doctrine.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/targeted-behavior-evidence.md") return "in_flight_artifact_to_leave_alone";
  if (normalized === "scripts/agent/validate-surface-parity-doctrine.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/surface-parity-doctrine.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/parity/surface-parity-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/parity/surface-parity-registry.ts") return "real_source_change_needs_review";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/user-creator.*parity|legacy.*admin.*parity/u.test(normalized)) return "duplicate_parity_validator_to_retire";
  if (/surface.*doctrine/u.test(normalized) && !/surface-parity/u.test(normalized)) return "stale_surface_doctrine_to_remove";
  return "unsafe_unknown";
}

export function buildSurfaceParityDoctrineReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: readonly string[];
  registry?: readonly SurfaceParityContract[];
} = {}): SurfaceParityDoctrineReport {
  const registry = [...(input.registry ?? SURFACE_PARITY_REGISTRY)];
  const dirtyFiles = [...(input.dirtyFiles ?? [])].map((path) => ({
    path,
    classification: classifySurfaceParityDirtyFile(path),
  }));
  const baseReport: SurfaceParityDoctrineReport = {
    reportKey: "surface-parity-doctrine",
    doctrineVersion: SURFACE_PARITY_DOCTRINE_VERSION,
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    majorSurfacesRegistered: registry.length,
    majorSurfaceIds: [...MAJOR_SURFACE_PARITY_IDS],
    surfaces: registry,
    duplicateParityValidatorsRetired: SUPERSEDED_PARITY_VALIDATORS
      .filter((validator) => validator.status !== "still_required")
      .map((validator) => validator.packageScript),
    activeSupportingParityValidators: [...ACTIVE_SUPPORTING_PARITY_VALIDATORS],
    supersededParityValidators: SUPERSEDED_PARITY_VALIDATORS,
    dirtyFiles,
    scoreDimensionBeforeAfter: Object.fromEntries(registry.map((surface) => [surface.surfaceId, surface.scoreDimensionImpact])) as SurfaceParityDoctrineReport["scoreDimensionBeforeAfter"],
    validationFailures: [],
  };
  const validationFailures = [
    ...validateSurfaceParityRegistry(registry, SUPERSEDED_PARITY_VALIDATORS),
    ...dirtyFiles
      .filter((file) => file.classification === "unsafe_unknown")
      .map((file) => `${file.path} is unclassified for surface parity doctrine.`),
  ];
  return {
    ...baseReport,
    status: validationFailures.length > 0 ? "fail" : "pass",
    validationFailures,
  };
}
