"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Database, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { summarizeAdminIssueForOperator } from "@/lib/admin-copy/admin-truth-copy";
import { type AdminModuleVerification, type AdminSurfaceState } from "@/lib/admin-parity";
import { coerceAdminTruthState, resolveAdminTruthState } from "@/lib/admin-truth-state";

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
    const hasUsableFallback = Boolean(
        verification.fallbackSource
        || verification.freshnessTimestamp
        || (verification.countComposition && Object.keys(verification.countComposition).length > 0),
    );
    const truthState = resolveAdminTruthState({
        hasUsableValue: verification.status === "failed" ? hasUsableFallback : true,
        sourceConfigured: Boolean(verification.canonicalSource),
        transportState: coerceAdminTruthState(verification.status) ?? "unavailable",
        valueState: verification.verificationState === "fallback"
            ? "legacy_fallback"
            : coerceAdminTruthState(verification.status) ?? "unavailable",
        reviewRequired: Boolean(verification.degradedReason),
        sourceIssue: verification.status === "degraded" || verification.status === "failed",
    });
    
    return (
        <div className={cn("rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 transition-all hover:bg-white/[0.07]", className)}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-bold text-white">{title}</h3>
                    {description && (
                        <p className="mt-1 text-sm text-gray-400">{description}</p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <StatusIcon className="h-3 w-3" />
                    <AdminTruthBadge
                        state={truthState}
                        pendingInitialLoad={verification.status === "loading"}
                        hasUsableValue={verification.status === "failed" ? hasUsableFallback : true}
                    />
                </div>
            </div>

            <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 text-sm">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                    <span className="text-gray-500 font-medium">Display source</span>
                    <span className="text-gray-200">
                        Primary verified source
                        {verification.verificationState === "canonical" && (
                            <span className="ml-2 text-[10px] text-emerald-300">Fresh source verified</span>
                        )}
                    </span>
                </div>

                {verification.fallbackSource && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                        <span className="text-gray-500 font-medium">Backup source</span>
                        <span className="text-gray-200">
                        Last verified data available
                        {verification.verificationState === "fallback" && (
                                <span className="ml-2 text-[10px] text-orange-300">Fallback labeled</span>
                        )}
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                    <span className="text-gray-500 font-medium">Freshness</span>
                    <span className="text-gray-200">
                        {verification.freshnessTimestamp && verification.freshnessTimestamp > 0 ? (
                            <span title={new Date(verification.freshnessTimestamp).toLocaleString()}>
                                {formatDistanceToNow(verification.freshnessTimestamp, { addSuffix: true })}
                            </span>
                        ) : (
                            <span className="text-gray-500 italic">Unknown</span>
                        )}
                    </span>
                </div>

                {verification.degradedReason && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                        <span className="text-gray-500 font-medium">Needs review</span>
                        <span className="text-orange-300">{operatorIssue}</span>
                    </div>
                )}

                <details className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-semibold text-gray-200">Technical source details</summary>
                    <div className="mt-3 grid gap-2 text-xs">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                            <span className="text-gray-500 font-medium">Source path</span>
                            <span className="break-all font-mono text-gray-300">{verification.canonicalSource}</span>
                        </div>
                        {verification.fallbackSource && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                                <span className="text-gray-500 font-medium">Backup path</span>
                                <span className="break-all font-mono text-gray-300">{verification.fallbackSource}</span>
                            </div>
                        )}
                        {verification.degradedReason && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                                <span className="text-gray-500 font-medium">Technical reason</span>
                                <span className="text-orange-200">{verification.degradedReason}</span>
                            </div>
                        )}
                        {verification.dedupeKey && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                                <span className="text-gray-500 font-medium">Dedupe key</span>
                                <span className="font-mono text-gray-400">{verification.dedupeKey}</span>
                            </div>
                        )}
                        {verification.clusteringSignature && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[140px_1fr]">
                                <span className="text-gray-500 font-medium">Cluster signature</span>
                                <span className="break-all font-mono text-gray-400">{verification.clusteringSignature}</span>
                            </div>
                        )}
                    </div>
                </details>
            </div>

            {verification.countComposition && Object.keys(verification.countComposition).length > 0 && (
                <div className="mt-4 rounded-xl border border-white/5 bg-black/40 p-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Count detail</h4>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(verification.countComposition).map(([key, count]) => (
                            <div key={key} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs">
                                <span className="text-gray-400">{key}:</span>
                                <span className="font-bold text-white">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
