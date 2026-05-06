export const ADMIN_PANEL_SYSTEM_LOG_COLLECTION = "admin_panel_system_logs";

export type AdminPanelSystemLogStatus = "healthy" | "warn" | "fail";
export type AdminPanelSystemLogTab = "overview" | "analytics" | "tasks" | "telemetry" | "reports" | "ops";
export type DebugSignalType =
    | "finding"
    | "actionable_repair"
    | "low_confidence_event"
    | "active_diagnostic"
    | "recent_history"
    | "inventory"
    | "freshness"
    | "runtime_sample"
    | "materializer_status"
    | "bug_intake";
export type DebugSectionStatusValue = "live" | "quiet" | "info" | "review" | "error" | "stale" | "unknown";
export type DebugSectionSeverity = "none" | "info" | "warn" | "error" | "critical";

export interface AdminPanelSignal {
    key: string;
    signalType: DebugSignalType;
    count: number;
    reviewable: boolean;
    severity: DebugSectionSeverity;
    label?: string;
}

export interface DebugSectionStatus {
    status: DebugSectionStatusValue;
    severity: DebugSectionSeverity;
    reasonCodes: string[];
    currentCounts: {
        activeErrors: number;
        activeWarnings: number;
        activeFindings: number;
        actionableRepairs: number;
    };
    inventoryCounts: Record<string, number>;
    historicalCounts: Record<string, number>;
    freshnessState: "fresh" | "stale" | "expired" | "unknown";
    explanation: string;
}

export interface AdminPanelSystemLog {
    id: string;
    panelKey: string;
    tab: AdminPanelSystemLogTab;
    panelTitle: string;
    status: AdminPanelSystemLogStatus;
    summary: string;
    action: string;
    signalCount: number;
    signalKeys: string[];
    signals?: AdminPanelSignal[];
    reviewableSignalCount?: number;
    totalSignalCount?: number;
    sectionStatus?: DebugSectionStatus;
    observedAtMs: number;
    updatedAtMs: number;
}
