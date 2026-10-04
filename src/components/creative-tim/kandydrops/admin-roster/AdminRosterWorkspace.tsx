"use client";

import type { ReactNode } from "react";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { NativeSelect, NativeSelectOption } from "@/components/creative-tim/ui/native-select";

type AdminRosterWorkspaceTab = {
    key: string;
    label: string;
};

type AdminRosterWorkspaceMetric = {
    label: string;
    value: string | number;
    description: string;
};

type AdminRosterWorkspaceProps = {
    eyebrow: string;
    title: string;
    subtitle: string;
    tabs: readonly AdminRosterWorkspaceTab[];
    activeTab: string;
    onTabChange: (key: string) => void;
    metrics: readonly AdminRosterWorkspaceMetric[];
    sourceNotice?: ReactNode;
    beforeContent?: ReactNode;
    children: ReactNode;
};

export function AdminRosterWorkspace({
    eyebrow,
    title,
    subtitle,
    tabs,
    activeTab,
    onTabChange,
    metrics,
    sourceNotice,
    beforeContent,
    children,
}: AdminRosterWorkspaceProps) {
    return (
        <div className="min-w-0 space-y-4" data-admin-roster-workspace="creator-review" data-roster-mode="decision_queue">
            {beforeContent}
            <AdminPageHeader
                compact
                eyebrow={eyebrow}
                title={title}
                subtitle={subtitle}
                topSlot={
                    <div className="space-y-4">
                        <label className="grid gap-2 text-sm font-medium" data-admin-roster-review-control="decision-switcher" data-admin-roster-active-view={activeTab}>
                            Creator review
                            <NativeSelect value={activeTab} onChange={(event) => onTabChange(event.target.value)} aria-label="Creator review">
                                {tabs.map((tab) => <NativeSelectOption key={tab.key} value={tab.key}>{tab.label}</NativeSelectOption>)}
                            </NativeSelect>
                        </label>
                        <dl className="grid gap-4 sm:grid-cols-3">
                            {metrics.map((metric) => (
                                <div key={metric.label} className="min-w-0">
                                    <dt className="text-sm text-muted-foreground">{metric.label}</dt>
                                    <dd className="mt-1 break-words text-xl font-semibold">{metric.value}</dd>
                                    <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
                                </div>
                            ))}
                        </dl>
                    </div>
                }
            />
            {sourceNotice ? <aside>{sourceNotice}</aside> : null}
            <section className="flex min-w-0 flex-col gap-4 2xl:flex-row 2xl:items-start [&>div:first-child]:min-w-0 [&>div:first-child]:2xl:flex-1 [&>div:last-child]:min-w-0 [&>div:last-child]:2xl:w-96">
                {children}
            </section>
        </div>
    );
}
