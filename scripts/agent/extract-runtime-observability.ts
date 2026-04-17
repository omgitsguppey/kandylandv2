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
    ]),
    lanes,
  };
}
