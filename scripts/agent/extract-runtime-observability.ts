import { createMetadata, fileExists, toStableId } from "./shared";

type RuntimeObservabilityLane = {
  stable_id: string;
  key: string;
  storage_or_collection: string | null;
  purpose: string;
  intended_use: string;
  non_goals: string[];
  persisted: boolean;
  raw_or_rollup: "raw_events" | "status_items" | "rollup_documents";
  client_or_server_origin: "server" | "client" | "mixed";
  trust_notes: string[];
  backingPaths: string[];
};

export function buildRuntimeObservability() {
  const lanes: RuntimeObservabilityLane[] = [
    {
      stable_id: toStableId("observability", "server_diagnostics"),
      key: "server_diagnostics",
      storage_or_collection: "server_diagnostics",
      purpose: "Structured server-side diagnostics for route, auth, analytics, AI, and runtime incidents.",
      intended_use: "Operational incident review and channel-specific warning/error inspection.",
      non_goals: [
        "Latency rollups for every tracked route.",
        "Client-side chart hydration truth.",
      ],
      persisted: true,
      raw_or_rollup: "raw_events",
      client_or_server_origin: "server",
      trust_notes: ["Supporting observability only; do not treat as stronger truth than the route/runtime source being described."],
      backingPaths: [
        "src/lib/server/server-diagnostics.ts",
        "src/lib/server/route-diagnostics.ts",
      ].filter((entry) => fileExists(entry)),
    },
    {
      stable_id: toStableId("observability", "admin_ui_chart_health"),
      key: "admin_ui_chart_health",
      storage_or_collection: "admin_ui_chart_health",
      purpose: "Client-reported admin chart hydration health for dashboard/debug visibility.",
      intended_use: "Track whether admin chart modules loaded, degraded, or failed in the latest client report.",
      non_goals: [
        "Canonical backend analytics truth.",
        "Route runtime latency or failure sampling.",
      ],
      persisted: true,
      raw_or_rollup: "status_items",
      client_or_server_origin: "mixed",
      trust_notes: ["Client-originated supporting signal; use source data and route health for stronger truth."],
      backingPaths: [
        "src/lib/admin-ui-chart-health.ts",
        "src/lib/server/admin-ui-chart-health.ts",
        "src/app/api/admin/ui-chart-health/route.ts",
      ].filter((entry) => fileExists(entry)),
    },
    {
      stable_id: toStableId("observability", "route_runtime_health"),
      key: "route_runtime_health",
      storage_or_collection: "route_runtime_health",
      purpose: "Tracked route runtime sample health for known high-sensitivity endpoints.",
      intended_use: "Operational route latency/failure/staleness summary for explicitly tracked endpoints.",
      non_goals: [
        "Arbitrary untracked routes.",
        "General diagnostic event logging.",
      ],
      persisted: true,
      raw_or_rollup: "rollup_documents",
      client_or_server_origin: "server",
      trust_notes: ["Canonical operational truth for the tracked route runtime lane only."],
      backingPaths: [
        "src/lib/route-runtime-health.ts",
        "src/lib/server/route-runtime-health.ts",
      ].filter((entry) => fileExists(entry)),
    },
    {
      stable_id: toStableId("observability", "admin_panel_system_logs"),
      key: "admin_panel_system_logs",
      storage_or_collection: "admin_panel_system_logs",
      purpose: "Derived operational summaries that combine diagnostics, route runtime, chart health, and pipeline signals.",
      intended_use: "Compact admin/debug rollups for operational triage.",
      non_goals: [
        "Replacing the underlying source lanes.",
        "Treating derived summaries as stronger than source truth.",
      ],
      persisted: true,
      raw_or_rollup: "rollup_documents",
      client_or_server_origin: "server",
      trust_notes: ["Derived rollup only; source lanes outrank this summary."],
      backingPaths: [
        "src/lib/server/admin-panel-system-logs.ts",
        "src/app/api/admin/debug/route.ts",
      ].filter((entry) => fileExists(entry)),
    },
    {
      stable_id: toStableId("observability", "queue_job_heartbeats"),
      key: "queue_job_heartbeats",
      storage_or_collection: "queue_job_heartbeats",
      purpose: "Canonical scheduler heartbeat lane for queue lifecycle and active-drop notification jobs.",
      intended_use: "Detect stale schedulers, failed queue jobs, and missing runtime freshness before user-facing symptoms appear.",
      non_goals: [
        "Replacing queue source-of-truth documents.",
        "Acting as a historical analytics warehouse.",
      ],
      persisted: true,
      raw_or_rollup: "status_items",
      client_or_server_origin: "server",
      trust_notes: ["Canonical heartbeat truth for queue scheduler freshness."],
      backingPaths: [
        "shared/runtime/runtime-warning-contract.ts",
        "src/lib/server/runtime-warning-store.ts",
        "src/lib/server/queue-runtime.ts",
        "functions/src/runtime-warning-store.ts",
        "functions/src/queue-runtime.ts",
      ].filter((entry) => fileExists(entry)),
    },
    {
      stable_id: toStableId("observability", "runtime_warning_records"),
      key: "runtime_warning_records",
      storage_or_collection: "runtime_warning_records",
      purpose: "Structured warning budget lane for degraded, fallback, and failed runtime conditions across client, routes, schedulers, and mirrors.",
      intended_use: "Track repeated degradation classes that should fail lightweight continuity before a full audit is needed.",
      non_goals: [
        "Replacing the primary runtime source or route contract.",
        "Treating warning records as stronger truth than the source invariant they describe.",
      ],
      persisted: true,
      raw_or_rollup: "raw_events",
      client_or_server_origin: "mixed",
      trust_notes: ["Supporting continuity lane only; source runtime/config truth still outranks warning records."],
      backingPaths: [
        "shared/runtime/runtime-warning-contract.ts",
        "src/lib/server/runtime-warning-store.ts",
        "functions/src/runtime-warning-store.ts",
        "scripts/check-warnings.ts",
      ].filter((entry) => fileExists(entry)),
    },
    {
      stable_id: toStableId("observability", "notification_dispatch_outcomes"),
      key: "notification_dispatch_outcomes",
      storage_or_collection: "notification_dispatch_outcomes",
      purpose: "Persisted outcome lane for drop activation notification dispatch idempotency and failure tracking.",
      intended_use: "Verify that every canonical activation attempt produced an explicit notification outcome.",
      non_goals: [
        "Replacing the underlying drop lifecycle source documents.",
        "Serving as a client-facing notification inbox.",
      ],
      persisted: true,
      raw_or_rollup: "status_items",
      client_or_server_origin: "server",
      trust_notes: ["Canonical outcome truth for activation notification attempts."],
      backingPaths: [
        "shared/runtime/runtime-warning-contract.ts",
        "src/lib/server/push-notifications.ts",
        "src/lib/server/runtime-warning-store.ts",
        "functions/src/queue-runtime.ts",
      ].filter((entry) => fileExists(entry)),
    },
    {
      stable_id: toStableId("observability", "ui_module_continuity"),
      key: "ui_module_continuity",
      storage_or_collection: null,
      purpose: "Client-side hydration continuity signals for route modules that use the shared UI continuity helper.",
      intended_use: "Detect partial module failure, visible warning fallbacks, and hydration success/failure sequencing before signoff.",
      non_goals: [
        "Replacing route runtime truth.",
        "Acting as persisted analytics history.",
      ],
      persisted: false,
      raw_or_rollup: "status_items",
      client_or_server_origin: "client",
      trust_notes: ["Advisory client continuity signal only; repo/runtime source truth outranks it."],
      backingPaths: [
        "src/lib/ui-continuity.ts",
        "src/components/ui/UiContinuityNotice.tsx",
      ].filter((entry) => fileExists(entry)),
    },
  ];

  return {
    ...createMetadata([
      "src/lib/server/server-diagnostics.ts",
      "src/lib/server/route-diagnostics.ts",
      "src/lib/admin-ui-chart-health.ts",
      "src/lib/server/admin-ui-chart-health.ts",
      "src/lib/route-runtime-health.ts",
      "src/lib/server/route-runtime-health.ts",
      "src/lib/server/admin-panel-system-logs.ts",
      "src/lib/server/runtime-warning-store.ts",
      "src/lib/server/queue-runtime.ts",
      "functions/src/runtime-warning-store.ts",
      "functions/src/queue-runtime.ts",
    ]),
    lanes,
  };
}
