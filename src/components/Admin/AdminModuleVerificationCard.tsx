"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


import React from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Database, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { summarizeAdminIssueForOperator } from "@/lib/admin/copy/admin-truth-copy";
import { type AdminModuleVerification, type AdminSurfaceState } from "@/lib/admin-parity";
import { resolveAdminVerificationTruthState } from "@/lib/admin-truth-state";

interface AdminModuleVerificationCardProps {
    verification: AdminModuleVerification;
    title: string;
    description?: string;
    className?: string;
}

const STATE_ICONS: Record<AdminSurfaceState, React.ElementType> = {
    loading: Clock,
    live: CheckCircle2,
    cached: Database,
    fallback: Database,
    stale: Clock,
    degraded: AlertTriangle,
    failed: XCircle,
    unavailable: HelpCircle,
};

export function AdminModuleVerificationCard({
    verification,
    title,
    description,
    className,
}: AdminModuleVerificationCardProps) {
    const StatusIcon = STATE_ICONS[verification.status] || HelpCircle;
    const operatorIssue = verification.degradedReason
        ? summarizeAdminIssueForOperator(verification.degradedReason)
        : null;
    const verificationTruth = resolveAdminVerificationTruthState({
        status: verification.status,
        canonicalSource: verification.canonicalSource,
        fallbackSource: verification.fallbackSource,
        freshnessTimestamp: verification.freshnessTimestamp,
        countComposition: verification.countComposition,
        verificationState: verification.verificationState,
        degradedReason: verification.degradedReason,
    });
    
    return (
        <div className={cn("rounded-2xl border border-border bg-secondary p-4 sm:p-5 transition-all hover:bg-secondary", className)}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    {description && (
                        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <StatusIcon className="h-3 w-3" />
                    <AdminTruthBadge
                        state={verificationTruth.truthState}
                        pendingInitialLoad={verificationTruth.pendingInitialLoad}
                        hasUsableValue={verificationTruth.hasUsableValue}
                    />
                </div>
            </div>

            <div className="mt-5 grid gap-3 border-t border-border pt-4 text-sm">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                    <span className="text-muted-foreground font-medium">Display source</span>
                    <span className="text-foreground">
                        Primary verified source
                        {verification.verificationState === "canonical" && (
                            <span className="ml-2 text-[10px] text-success">Fresh source verified</span>
                        )}
                    </span>
                </div>

                {verification.fallbackSource && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                        <span className="text-muted-foreground font-medium">Backup source</span>
                        <span className="text-foreground">
                        Last verified data available
                        {verification.verificationState === "fallback" && (
                                <span className="ml-2 text-[10px] text-warning">Source labeled</span>
                        )}
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                    <span className="text-muted-foreground font-medium">Freshness</span>
                    <span className="text-foreground">
                        {verification.freshnessTimestamp && verification.freshnessTimestamp > 0 ? (
                            <span title={new Date(verification.freshnessTimestamp).toLocaleString()}>
                                {formatDistanceToNow(verification.freshnessTimestamp, { addSuffix: true })}
                            </span>
                        ) : (
                            <span className="text-muted-foreground italic">Unknown</span>
                        )}
                    </span>
                </div>

                {verification.degradedReason && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                        <span className="text-muted-foreground font-medium">Needs review</span>
                        <span className="text-warning">{operatorIssue}</span>
                    </div>
                )}

                <Disclosure className="rounded-xl border border-border bg-background/20 px-3 py-2">
                    <DisclosureSummary className="cursor-pointer text-xs font-semibold text-foreground">Technical source details</DisclosureSummary>
                    <div className="mt-3 grid gap-2 text-xs">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                            <span className="text-muted-foreground font-medium">Source path</span>
                            <span className="break-all font-mono text-muted-foreground">{verification.canonicalSource}</span>
                        </div>
                        {verification.fallbackSource && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                                <span className="text-muted-foreground font-medium">Backup path</span>
                                <span className="break-all font-mono text-muted-foreground">{verification.fallbackSource}</span>
                            </div>
                        )}
                        {verification.degradedReason && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                                <span className="text-muted-foreground font-medium">Technical reason</span>
                                <span className="text-warning">{verification.degradedReason}</span>
                            </div>
                        )}
                        {verification.dedupeKey && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                                <span className="text-muted-foreground font-medium">Dedupe key</span>
                                <span className="font-mono text-muted-foreground">{verification.dedupeKey}</span>
                            </div>
                        )}
                        {verification.clusteringSignature && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                                <span className="text-muted-foreground font-medium">Cluster signature</span>
                                <span className="break-all font-mono text-muted-foreground">{verification.clusteringSignature}</span>
                            </div>
                        )}
                    </div>
                </Disclosure>
            </div>

            {verification.countComposition && Object.keys(verification.countComposition).length > 0 && (
                <div className="mt-4 rounded-xl border border-border bg-background/40 p-3">
                    <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Count detail</h4>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(verification.countComposition).map(([key, count]) => (
                            <div key={key} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2 py-1 text-xs">
                                <span className="text-muted-foreground">{key}:</span>
                                <span className="font-semibold text-foreground">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
