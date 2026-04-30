"use client";

import { useMemo } from "react";

import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import type { ValidationItem } from "@/types/admin-analytics";

import { Pill, ScrollWrap, Section, type PillTone } from "./DebugPrimitives";

type ValidationResponse = {
    success?: boolean;
    generatedAtMs?: number;
    cacheState?: "miss" | "fresh" | "stale";
    cacheRevalidating?: boolean;
    validations?: ValidationItem[];
};

const DEBUG_VALIDATION_PATH = "/admin/debug?tab=advanced#data-validation";

function toneForStatus(status?: string): PillTone {
    if (status === "pass") return "good";
    if (status === "fail" || status === "unavailable") return "bad";
    return "warn";
}

function groupForCheck(check: ValidationItem) {
    const key = check.checkKey || check.label.toLowerCase().replaceAll(" ", "_");
    if (key.includes("ga") || key.includes("freshness") || key.includes("legacy")) return "Analytics source health";
    if (key.includes("purchase") || key.includes("creator")) return "Commerce parity";
    if (key.includes("unlock") || key.includes("watch") || key.includes("viewer")) return "Unlock/watch parity";
    if (key.includes("onboarding") || key.includes("task")) return "Onboarding/task parity";
    if (key.includes("module")) return "Module coverage";
    return "Telemetry parity";
}

function formatTimestamp(timestamp?: number) {
    if (!timestamp) return "Not validated";
    return new Date(timestamp).toLocaleString();
}

export function DebugAdvancedDataValidation() {
    const { data, error, isLoading } = useAdminPollingSWR<ValidationResponse>(
        "/api/admin/analytics/historical?section=dataValidation&period=30d",
        60000,
        {
            keepPreviousData: true,
            revalidateOnFocus: false,
        },
    );

    const validations = useMemo(() => data?.validations ?? [], [data?.validations]);
    const summary = useMemo(() => {
        const failCount = validations.filter((check) => check.status === "fail" || check.status === "unavailable").length;
        const warnCount = validations.filter((check) => check.status === "warn" || check.status === "stale" || check.status === "unknown").length;
        const staleValidationCount = validations.filter((check) => check.status === "stale" || check.freshnessState === "stale").length;
        const passBlockedCount = validations.filter((check) => check.passAllowed === false).length;
        const grouped = validations.reduce<Record<string, ValidationItem[]>>((accumulator, check) => {
            const group = groupForCheck(check);
            accumulator[group] = [...(accumulator[group] ?? []), check];
            return accumulator;
        }, {});

        return {
            failCount,
            warnCount,
            staleValidationCount,
            passBlockedCount,
            grouped,
            issueCount: failCount + warnCount,
        };
    }, [validations]);

    const defaultOpen = summary.issueCount > 0 || Boolean(error);

    return (
        <Section
            title="Data Validation"
            subtitle="Analytics validation and parity checks live in Debug, not the Analytics insight page."
            defaultOpen={defaultOpen}
            summary={(
                <>
                    <Pill label="Checks" value={validations.length || (isLoading ? "Loading" : 0)} />
                    <Pill label="Fail" value={summary.failCount} tone={summary.failCount > 0 ? "bad" : "good"} />
                    <Pill label="Warn" value={summary.warnCount} tone={summary.warnCount > 0 ? "warn" : "good"} />
                    <Pill label="Stale" value={summary.staleValidationCount} tone={summary.staleValidationCount > 0 ? "warn" : "good"} />
                    <Pill label="Blocked pass" value={summary.passBlockedCount} tone={summary.passBlockedCount > 0 ? "warn" : "good"} />
                </>
            )}
        >
            <div id="data-validation" className="space-y-3">
                {error ? (
                    <div className="rounded-[1rem] border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                        Validation unavailable. The Debug surface could not load the validation route.
                    </div>
                ) : null}
                {!error && validations.length === 0 ? (
                    <div className="rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                        {isLoading ? "Loading validation checks..." : "Validation unavailable for this range."}
                    </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                    <Pill label="Path" value={DEBUG_VALIDATION_PATH} />
                    <Pill label="Range" value="30d" />
                    <Pill label="Cache" value={data?.cacheState || "unknown"} tone={data?.cacheState === "stale" ? "warn" : "neutral"} />
                    <Pill label="Last validated" value={formatTimestamp(data?.generatedAtMs)} />
                </div>
                {Object.entries(summary.grouped).map(([group, checks]) => (
                    <div key={group} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-white">{group}</h3>
                            <Pill label="Rows" value={checks.length} />
                        </div>
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {checks.map((check) => (
                                    <div key={check.checkKey || check.label} className="space-y-2 px-3 py-2.5">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-white">{check.title || check.label}</p>
                                                <p className="text-xs text-gray-400">{check.source || "source unknown"} | {check.selectedRange || "range unknown"} | {formatTimestamp(check.lastValidatedAt || data?.generatedAtMs)}</p>
                                            </div>
                                            <Pill label="Status" value={check.status} tone={toneForStatus(check.status)} />
                                        </div>
                                        <p className="text-xs leading-5 text-gray-300">{check.detail}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Confidence" value={check.confidence ?? "n/a"} tone={(check.confidence ?? 100) < 70 ? "warn" : "neutral"} />
                                            <Pill label="Samples" value={check.sampleCount ?? 0} tone={check.sampleRequired && !check.sampleCount ? "warn" : "neutral"} />
                                            <Pill label="Pass allowed" value={check.passAllowed === false ? "no" : "yes"} tone={check.passAllowed === false ? "warn" : "good"} />
                                            {check.passBlockedReason ? <Pill label="Blocked" value={check.passBlockedReason} tone="warn" /> : null}
                                        </div>
                                        <p className="text-xs text-gray-400">{check.action || "No action recorded."}</p>
                                    </div>
                                ))}
                            </div>
                        </ScrollWrap>
                    </div>
                ))}
            </div>
        </Section>
    );
}
