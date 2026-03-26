export const ADMIN_PANEL_SYSTEM_LOG_COLLECTION = "admin_panel_system_logs";

export type AdminPanelSystemLogStatus = "healthy" | "warn" | "fail";
export type AdminPanelSystemLogTab = "overview" | "tasks" | "telemetry" | "reports" | "ops";

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
    observedAtMs: number;
    updatedAtMs: number;
}
