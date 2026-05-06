"use client";

import { ShieldCheck } from "lucide-react";

import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { useAdminPrivacyPreflight } from "@/hooks/useAdminPrivacyPreflight";
import type {
    PrivacyConsoleOverallState,
    PrivacyConsoleRange,
    PrivacyPreflightCheck,
    PrivacyPreflightCheckState,
} from "@/lib/admin-privacy-console";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS: PrivacyConsoleRange[] = ["1h", "24h", "7d", "30d"];

function toAdminState(state: PrivacyPreflightCheckState | PrivacyConsoleOverallState) {
    if (state === "pass" || state === "live") return "live" as const;
    if (state === "review" || state === "unknown") return "degraded" as const;
    if (state === "quiet") return "cached" as const;
    if (state === "not_configured") return "fallback" as const;
    if (state === "error") return "failed" as const;
    return "unavailable" as const;
}

function formatLastSeen(value: string | null) {
    return value ? new Date(value).toLocaleString() : "Not observed";
}

function buildCheckSummary(check: PrivacyPreflightCheck) {
    const sampleLabel = check.sampleCount === null ? "No count" : `${check.sampleCount} samples`;
    return `${sampleLabel} · ${check.evidenceState.replace(/_/g, " ")}`;
}

export function AdminPrivacyPreflight() {
    const {
        data,
        error,
        isLoading,
        range,
        setRange,
        adminSessionState,
    } = useAdminPrivacyPreflight();

    const checks = data?.checks ?? [];
    const passCount = checks.filter((check) => check.state === "pass").length;
    const reviewCount = checks.filter((check) => check.state === "review" || check.state === "unknown" || check.state === "not_configured").length;
    const errorCount = checks.filter((check) => check.state === "error").length;
    const quietCount = checks.filter((check) => check.state === "quiet").length;
    const overallState = data ? toAdminState(data.overallState) : isLoading ? "loading" : error ? "failed" : "unavailable";
    const lastEvidenceAtUtc = checks.reduce<string | null>((latest, check) => {
        if (!check.lastSeenAtUtc) return latest;
        if (!latest || Date.parse(check.lastSeenAtUtc) > Date.parse(latest)) {
            return check.lastSeenAtUtc;
        }
        return latest;
    }, null);

    return (
        <section
            className="space-y-4"
            data-privacy-console-generated-at-utc={data?.generatedAtUtc ?? "pending"}
            data-privacy-console-range={range}
            data-privacy-console-overall-state={data?.overallState ?? (isLoading ? "loading" : error ? "error" : "unknown")}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-purple/40 bg-brand-purple/20">
                        <ShieldCheck className="h-5 w-5 text-brand-purple" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-bold text-white">Privacy &amp; Consent Preflight</h2>
                            <AdminStatusBadge state={overallState} />
                        </div>
                        <p className="text-xs text-gray-400">Deterministic view of privacy, consent, dedupe, guest identity, and export truth.</p>
                        <p className="mt-1 text-xs text-gray-500">
                            Last evidence: {formatLastSeen(lastEvidenceAtUtc)} · Pass {passCount} · Review {reviewCount} · Error {errorCount} · Quiet {quietCount}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {RANGE_OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setRange(option)}
                            className={cn(
                                "min-h-11 rounded-full border px-3 text-xs font-bold uppercase tracking-[0.18em]",
                                range === option ? "border-brand-purple/40 bg-brand-purple/15 text-white" : "border-white/10 bg-white/[0.03] text-gray-400",
                            )}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>

            {adminSessionState === "waiting_for_admin_session" ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">Waiting for admin session...</div>
            ) : null}
            {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{error.message}</div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {checks.map((check) => (
                    <article
                        key={check.id}
                        className="rounded-2xl border border-white/10 bg-black/25 p-4"
                        data-privacy-check-id={check.id}
                        data-privacy-check-state={check.state}
                        data-privacy-check-evidence-state={check.evidenceState}
                        data-privacy-check-sample-count={check.sampleCount ?? "unknown"}
                        data-privacy-check-last-seen-at-utc={check.lastSeenAtUtc ?? "none"}
                        data-privacy-check-reason-code={check.reasonCode}
                        data-privacy-check-source={check.source}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-white">{check.label}</h3>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">{buildCheckSummary(check)}</p>
                            </div>
                            <AdminStatusBadge state={toAdminState(check.state)} />
                        </div>
                        <p className="mt-3 text-sm font-medium text-white">{check.explanation}</p>
                        <div className="mt-3 space-y-1 text-xs text-gray-400">
                            <p>Evidence: {check.evidenceState.replace(/_/g, " ")}</p>
                            <p>Last seen: {formatLastSeen(check.lastSeenAtUtc)}</p>
                            <p>Next action: {check.nextAction}</p>
                        </div>
                        <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-gray-400">
                            <summary className="cursor-pointer font-semibold text-gray-300">Source details</summary>
                            <div className="mt-2 space-y-1">
                                <p>Source: {check.source}</p>
                                <p>Reason: {check.reasonCode}</p>
                                <p>Severity: {check.severity}</p>
                            </div>
                        </details>
                    </article>
                ))}
                {!isLoading && !error && checks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                        No privacy console evidence is available yet.
                    </div>
                ) : null}
            </div>
        </section>
    );
}
