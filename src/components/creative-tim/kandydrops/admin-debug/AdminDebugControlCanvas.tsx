"use client";

import type { ElementType, ReactNode } from "react";

import { AdminMetricCard } from "@/components/Admin/AdminMetricCard";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import { ADMIN_NO_SOURCE_LABEL, resolveAdminInputTruthState, type AdminTruthState } from "@/lib/admin-truth-state";

type AdminDebugControlTab = {
    id: string;
    label: string;
    icon: ElementType;
};

type AdminDebugPriorityAction = {
    label: string;
    value: string | number;
    meta: string;
    truthState: AdminTruthState | AdminSurfaceState | "loading";
};

type AdminDebugControlCanvasProps = {
    title: string;
    subtitle: string;
    statusLabel: string;
    statusClassName: string;
    statusTextClassName: string;
    tabs: readonly AdminDebugControlTab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    priorityAction: AdminDebugPriorityAction;
    evidenceBoundary: ReactNode;
    beforeContent?: ReactNode;
    children: ReactNode;
};

export function AdminDebugControlCanvas({
    title,
    subtitle,
    statusLabel,
    statusClassName,
    statusTextClassName,
    tabs,
    activeTab,
    onTabChange,
    priorityAction,
    evidenceBoundary,
    beforeContent,
    children,
}: AdminDebugControlCanvasProps) {
    const resolvedActionTruth = resolveAdminInputTruthState({
        truthState: priorityAction.truthState,
        value: priorityAction.value,
        pendingInitialLoad: priorityAction.truthState === "loading",
    });

    return (
        <div
            className="min-w-0 space-y-6"
            data-admin-control-tower="true"
            data-mobile-organization="summary-first"
            data-mobile-drilldown="true"
            data-desktop-flow-collapsed="true"
            data-admin-mobile-surface="debug"
            data-admin-debug-sprawl-reduction="target-75-95"
            data-admin-debug-canvas="control_tower"
        >
            {beforeContent}
            <AdminPageHeader
                compact
                eyebrow="Admin Debug"
                title={title}
                subtitle={subtitle}
                actions={<span className={`flex items-center gap-2 text-sm ${statusTextClassName}`}><span className={`size-2 rounded-full ${statusClassName}`} aria-hidden="true" />{statusLabel}</span>}
                topSlot={
                    <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4">
                        <label className="grid min-w-0 content-start gap-2 text-sm font-medium" data-admin-debug-workstream-control="decision-rail" data-admin-debug-active-workstream={activeTab}>
                            Debug workstream
                            <NativeSelect value={activeTab} onChange={(event) => onTabChange(event.target.value)} aria-label="Debug workstream">
                                {tabs.map((tab) => <NativeSelectOption key={tab.id} value={tab.id}>{tab.label}</NativeSelectOption>)}
                            </NativeSelect>
                        </label>
                        <AdminMetricCard
                            label={priorityAction.label}
                            value={resolvedActionTruth.hasUsableValue ? priorityAction.value : ADMIN_NO_SOURCE_LABEL}
                            meta={priorityAction.meta}
                            truthState={resolvedActionTruth.truthState}
                            pendingInitialLoad={resolvedActionTruth.pendingInitialLoad}
                            hasUsableValue={resolvedActionTruth.hasUsableValue}
                        />
                    </div>
                }
            />
            <details className="min-w-0 border-t border-border" data-admin-debug-evidence-boundary="true">
                <summary className="flex min-h-11 cursor-pointer items-center py-3 text-sm font-medium">Source and evidence details</summary>
                <div className="pb-4">{evidenceBoundary}</div>
            </details>
            <section className="min-w-0">{children}</section>
        </div>
    );
}
