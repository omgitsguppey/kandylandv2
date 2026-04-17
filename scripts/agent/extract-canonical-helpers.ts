import { fileExists, toStableId } from "./shared";

type CanonicalHelperSeed = {
  path: string;
  family: string;
  purpose: string;
  reuseBeforeNew: boolean;
  adjacentUsageNotes: string[];
};

export type CanonicalHelperEntry = CanonicalHelperSeed & {
  stable_id: string;
  risk_if_changed: string;
  broad_signoff_likely: boolean;
};

const HELPER_CANDIDATES: CanonicalHelperSeed[] = [
  {
    path: "src/lib/server/auth.ts",
    family: "route_boundary_auth_request_guard",
    purpose: "Canonical auth verification and API error handling for route boundaries.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Pair with src/lib/server/request-guard.ts for trusted-origin and rate-limit checks.",
      "Use handleApiError(...) instead of ad hoc route error wrappers.",
    ],
  },
  {
    path: "src/lib/server/request-guard.ts",
    family: "route_boundary_auth_request_guard",
    purpose: "Canonical request guard for auth, rate limiting, trusted origin, and caller scoping.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Default route-entry guard for Next route handlers.",
    ],
  },
  {
    path: "src/lib/server/route-diagnostics.ts",
    family: "route_diagnostics_server_diagnostics",
    purpose: "Canonical route warning/failure recording into structured diagnostics lanes.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Use recordRouteWarning(...) or recordRouteFailure(...) instead of raw console warnings in server routes.",
    ],
  },
  {
    path: "src/lib/server/server-diagnostics.ts",
    family: "route_diagnostics_server_diagnostics",
    purpose: "Persisted server diagnostics writer for canonical admin/debug observability.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Backs the server_diagnostics lane; not a replacement for route runtime health.",
    ],
  },
  {
    path: "src/lib/telemetry.ts",
    family: "telemetry_analytics_canon",
    purpose: "Canonical client telemetry enqueueing, batching, and backend mirroring entrypoint.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Keep event naming and batching aligned with telemetry catalog and backend ingestion contracts.",
    ],
  },
  {
    path: "src/lib/telemetry-catalog.ts",
    family: "telemetry_analytics_canon",
    purpose: "Canonical telemetry event registry and alias normalization source.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Use catalog-backed event naming before adding new telemetry emitters.",
    ],
  },
  {
    path: "src/lib/tasks/task-observability.ts",
    family: "task_observability_runtime_audit",
    purpose: "Daily-task observability and runtime audit helpers used by admin/debug tooling.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Prefer inventory/audit helpers over one-off task coverage logic.",
    ],
  },
  {
    path: "src/lib/tasks/task-catalog.ts",
    family: "task_observability_runtime_audit",
    purpose: "Built-in daily-task contract and reward configuration source.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Task coverage, rewards, and event bindings should reuse the catalog.",
    ],
  },
  {
    path: "src/lib/server/creator-onboarding.ts",
    family: "creator_onboarding_compliance",
    purpose: "Server-side creator onboarding storage and queue contract.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Keep creator onboarding persistence and queue semantics centralized.",
    ],
  },
  {
    path: "src/lib/creator-onboarding.ts",
    family: "creator_onboarding_compliance",
    purpose: "Shared creator onboarding contract helpers.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Use shared onboarding helpers before new creator-specific utility files.",
    ],
  },
  {
    path: "src/lib/route-runtime-health.ts",
    family: "runtime_health_admin_debug_observability",
    purpose: "Canonical route runtime health target registry and summarization logic.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Use tracked route keys and shared summary helpers instead of custom runtime-health math.",
    ],
  },
  {
    path: "src/lib/server/route-runtime-health.ts",
    family: "runtime_health_admin_debug_observability",
    purpose: "Server persistence and reads for route runtime health samples.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Route handlers should record samples through this lane instead of inventing new route-health sinks.",
    ],
  },
  {
    path: "src/lib/admin-ui-chart-health.ts",
    family: "runtime_health_admin_debug_observability",
    purpose: "Canonical client/admin chart-health item modeling and summary logic.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Admin chart hydration status should stay on this shared contract.",
    ],
  },
  {
    path: "src/lib/server/admin-panel-system-logs.ts",
    family: "runtime_health_admin_debug_observability",
    purpose: "System-log rollups that combine diagnostics, chart health, and runtime health into admin/debug summaries.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Operational summaries should flow through the shared admin panel system log builder.",
    ],
  },
  {
    path: "src/lib/ai-drop-covers.ts",
    family: "ai_admin_runtime_helpers",
    purpose: "Canonical AI cover prompt, policy, and generation metadata helpers.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "AI cover surfaces should reuse shared model and prompt helpers instead of in-route duplication.",
    ],
  },
  {
    path: "src/lib/server/ai-drop-covers.ts",
    family: "ai_admin_runtime_helpers",
    purpose: "Server-side AI cover admin settings, policy, and review state contract.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Admin AI routes should stay aligned with this storage/runtime layer.",
    ],
  },
  {
    path: "src/lib/chat-realtime.ts",
    family: "chat_realtime_runtime_helpers",
    purpose: "Canonical chat realtime retry, fallback, and listener orchestration helpers.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Chat realtime recovery must reuse the shared retry/failure handling model.",
    ],
  },
  {
    path: "src/lib/server/chat.ts",
    family: "chat_realtime_runtime_helpers",
    purpose: "Canonical server-side chat thread and message operations.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Server chat routes should route writes through this helper surface.",
    ],
  },
  {
    path: "src/lib/gumdrop-ledger.ts",
    family: "economics_ledger_payments",
    purpose: "Canonical Gum Drop balance split, spending, and ledger source accounting logic.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Do not duplicate spend-source math in routes or functions.",
    ],
  },
  {
    path: "src/lib/gumdrop-economics.ts",
    family: "economics_ledger_payments",
    purpose: "Shared Gum Drop economics and pricing derivation helpers.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Pricing and economics displays should derive from shared helpers.",
    ],
  },
  {
    path: "src/lib/server/paypal.ts",
    family: "economics_ledger_payments",
    purpose: "Canonical server PayPal integration helper layer.",
    reuseBeforeNew: true,
    adjacentUsageNotes: [
      "Payment routes should reuse the shared PayPal helper instead of route-local clients.",
    ],
  },
];

export function buildCanonicalHelpers() {
  const entries = HELPER_CANDIDATES
    .filter((entry) => fileExists(entry.path))
    .map((entry) => ({
      stable_id: toStableId("helper", entry.path),
      ...entry,
      risk_if_changed: entry.family.includes("runtime") || entry.family.includes("route")
        ? "High. Shared runtime or route contracts can drift across multiple surfaces."
        : "Medium. Shared helper changes can alter adjacent features and verification scope.",
      broad_signoff_likely: entry.path.startsWith("src/lib/") || entry.path.startsWith("src/lib/server/"),
    }));
  const families = Array.from(new Set(entries.map((entry) => entry.family))).sort();

  return {
    entries,
    families,
  };
}
