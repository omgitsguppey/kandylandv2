"use client";

import type { ComponentType, ReactNode } from "react";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { Card } from "@/components/ui/card";
import { coerceAdminSurfaceState } from "@/lib/admin-parity";

type AdminAnalyticsIcon = ComponentType<{
    "aria-hidden"?: boolean | "true" | "false";
    className?: string;
}>;

export type AdminAnalyticsEvidenceFact = {
    detail: string;
    icon: AdminAnalyticsIcon;
    label: string;
    statusLabel?: string;
    truthState: string;
    value: string;
};

type AdminAnalyticsEvidenceCanvasProps = {
    alerts?: ReactNode;
    children: ReactNode;
    evidence?: ReactNode;
    facts?: AdminAnalyticsEvidenceFact[];
    filters?: ReactNode;
    fixture?: ReactNode;
    isPriming?: ReactNode;
};

export function AdminAnalyticsEvidenceCanvas({
    alerts,
    children,
    evidence,
    facts = [],
    filters,
    fixture,
    isPriming,
}: AdminAnalyticsEvidenceCanvasProps) {
    return (
        <section
            className="min-w-0 space-y-6"
            data-admin-mobile-surface="analytics"
            data-admin-analytics-layout="evidence-workspace"
            data-mobile-organization="summary-first"
            data-mobile-drilldown="true"
            data-desktop-flow-collapsed="true"
        >
            <AdminPageHeader compact eyebrow={null} title="Analytics"
                subtitle="Activity, commerce, and source quality."
 />

            {fixture ? <div className="min-w-0">{fixture}</div> : null}
            {filters ? <section className="min-w-0" aria-label="Analytics controls">{filters}</section> : null}

            {facts.length > 0 ? (
                <section className="min-w-0" aria-label="Analytics readout">
                    <Card className="min-w-0 gap-0 p-4 shadow-none">
                        <dl className="min-w-0 divide-y divide-border">
                            {facts.map((fact) => {
                                const Icon = fact.icon;
                                return (
                                    <div key={fact.label} className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0" data-admin-analytics-truth-state={fact.truthState}>
                                        <div className="min-w-0 flex-[1_1_12rem] space-y-1">
                                            <dt className="flex min-w-0 items-start gap-2 text-sm font-medium text-card-foreground"><Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 wrap-anywhere">{fact.label}</span></dt>
                                            <dd className="wrap-anywhere text-sm text-muted-foreground">{fact.detail}</dd>
                                        </div>
                                        <dd className="flex min-w-0 max-w-full flex-wrap items-start gap-2">
                                            <span className="min-w-0 wrap-anywhere font-semibold tabular-nums text-card-foreground">{fact.value}</span>
                                            {fact.statusLabel ? <AdminStatusBadge state={coerceAdminSurfaceState(fact.truthState)} label={fact.statusLabel} className="max-w-full overflow-visible whitespace-normal wrap-anywhere text-xs" /> : null}
                                        </dd>
                                    </div>
                                );
                            })}
                        </dl>
                    </Card>
                </section>
            ) : null}

            {alerts ? <div className="min-w-0 space-y-3">{alerts}</div> : null}
            {isPriming ? <div className="min-w-0">{isPriming}</div> : null}
            {evidence ? (
                <section className="min-w-0 border-b border-border pb-4" aria-label="Analytics source summary" data-admin-analytics-evidence-context="true">
                    {evidence}
                </section>
            ) : null}
            <section className="min-w-0 space-y-6" aria-label="Selected analytics view" data-mobile-drilldown="true">
                {children}
            </section>
        </section>
    );
}
