"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { Card } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useAdminPrivacyPreflight } from "@/hooks/useAdminPrivacyPreflight";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import type {
    PrivacyConsoleOverallState,
    PrivacyConsoleRange,
    PrivacyPreflightCheck,
    PrivacyPreflightCheckState,
} from "@/lib/admin-privacy-console";

const RANGE_OPTIONS: Array<{ value: PrivacyConsoleRange; label: string }> = [
    { value: "1h", label: "1 hour" },
    { value: "24h", label: "24 hours" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
];

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
    return `${sampleLabel} · Evidence: ${check.evidenceState.replace(/_/g, " ")}`;
}

function rangeLabel(value: PrivacyConsoleRange) {
    return RANGE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function AdminPrivacyPreflight() {
    const { data, error, isLoading, range, setRange, adminSessionState } = useAdminPrivacyPreflight();
    const sourceData = adminSessionState === "ready" ? data : null;
    const checks = sourceData?.checks ?? [];
    const isLocalFixtureSourceMissing = adminSessionState === "local_fixture_source_missing";
    const passCount = checks.filter((check) => check.state === "pass").length;
    const reviewCount = checks.filter((check) => check.state === "review" || check.state === "unknown" || check.state === "not_configured").length;
    const errorCount = checks.filter((check) => check.state === "error").length;
    const quietCount = checks.filter((check) => check.state === "quiet").length;
    const overallState = isLocalFixtureSourceMissing
        ? "unavailable"
        : isLoading || adminSessionState !== "ready" ? "loading"
            : error ? "failed" : sourceData ? toAdminState(sourceData.overallState) : "unavailable";
    const safeErrorMessage = adminSessionState === "ready" && error
        ? sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable").operatorMessage
        : null;
    const lastEvidenceAtUtc = checks.reduce<string | null>((latest, check) => {
        if (!check.lastSeenAtUtc) return latest;
        if (!latest || Date.parse(check.lastSeenAtUtc) > Date.parse(latest)) return check.lastSeenAtUtc;
        return latest;
    }, null);

    return (
        <section
            className="min-w-0 space-y-3"
            data-privacy-console-generated-at-utc={sourceData?.generatedAtUtc ?? "pending"}
            data-privacy-console-range={range}
            data-privacy-console-source-range={sourceData?.range ?? "unavailable"}
            data-privacy-console-overall-state={isLocalFixtureSourceMissing ? "source_missing" : isLoading || adminSessionState !== "ready" ? "loading" : error ? "error" : sourceData?.overallState ?? "unknown"}
        >
            <Card className="min-w-0 gap-3 p-4 shadow-none">
                <div className="flex min-w-0 flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-[3_1_20rem] space-y-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h2 className="text-base font-semibold text-foreground">Evidence summary</h2>
                            <AdminStatusBadge state={overallState} className="max-w-full whitespace-normal break-words" />
                        </div>
                        <p id="privacy-evidence-source" className="break-words text-sm text-muted-foreground">
                            {sourceData
                                ? `Evidence window: ${rangeLabel(sourceData.range)} · Last evidence: ${formatLastSeen(lastEvidenceAtUtc)}`
                                : "Privacy source is not loaded yet."}
                        </p>
                        {sourceData ? (
                            <dl className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm">
                                <div className="flex gap-1"><dt className="text-muted-foreground">Pass</dt><dd className="tabular-nums text-foreground">{passCount}</dd></div>
                                <div className="flex gap-1"><dt className="text-muted-foreground">Review</dt><dd className="tabular-nums text-foreground">{reviewCount}</dd></div>
                                <div className="flex gap-1"><dt className="text-muted-foreground">Error</dt><dd className="tabular-nums text-foreground">{errorCount}</dd></div>
                                <div className="flex gap-1"><dt className="text-muted-foreground">Quiet</dt><dd className="tabular-nums text-foreground">{quietCount}</dd></div>
                            </dl>
                        ) : null}
                    </div>
                    <div className="min-w-0 flex-[1_1_12rem] space-y-2">
                        <label htmlFor="privacy-evidence-range" className="block text-sm font-medium text-foreground">Evidence range</label>
                        <NativeSelect
                            id="privacy-evidence-range"
                            value={range}
                            aria-describedby="privacy-evidence-source"
                            className="h-auto min-h-11"
                            onChange={(event) => {
                                const nextRange = RANGE_OPTIONS.find((option) => option.value === event.target.value);
                                if (nextRange) setRange(nextRange.value);
                            }}
                        >
                            {RANGE_OPTIONS.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
                        </NativeSelect>
                    </div>
                </div>
                {isLoading && adminSessionState === "ready" ? (
                    <p role="status" className="break-words text-sm text-muted-foreground">
                        Collecting privacy evidence for {rangeLabel(range)}.
                        {sourceData ? ` Showing ${rangeLabel(sourceData.range)} until new evidence arrives.` : null}
                    </p>
                ) : null}
            </Card>

            {adminSessionState === "waiting_for_admin_session" ? (
                <Card className="min-w-0 gap-0 p-4 text-sm text-muted-foreground shadow-none">collecting: admin access and source state are resolving.</Card>
            ) : null}
            {isLocalFixtureSourceMissing ? (
                <Card
                    className="min-w-0 gap-1 border border-warning/20 p-4 text-sm shadow-none"
                    data-admin-privacy-fixture-boundary="true"
                    data-admin-privacy-fixture-state="source_missing"
                >
                    <p className="font-semibold text-foreground">source_missing fixture.</p>
                    <p className="break-words leading-6 text-muted-foreground">
                        source_missing: privacy source is not loaded in this fixture. Protected reads stay blocked until verified admin access provides the source.
                    </p>
                </Card>
            ) : null}
            {safeErrorMessage ? (
                <Card role="alert" className="min-w-0 gap-0 break-words border border-destructive/40 p-4 text-sm shadow-none" data-privacy-console-safe-error="true">{safeErrorMessage}</Card>
            ) : null}

            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-3">
                {checks.map((check) => (
                    <Card
                        role="article"
                        key={check.id}
                        className="min-w-0 gap-3 p-4 shadow-none"
                        data-privacy-check-id={check.id}
                        data-privacy-check-state={check.state}
                        data-privacy-check-evidence-state={check.evidenceState}
                        data-privacy-check-sample-count={check.sampleCount ?? "unknown"}
                        data-privacy-check-last-seen-at-utc={check.lastSeenAtUtc ?? "none"}
                        data-privacy-check-reason-code={check.reasonCode}
                        data-privacy-check-source={check.source}
                    >
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                            <h3 className="min-w-0 break-words text-base font-semibold text-foreground">{check.label}</h3>
                            <AdminStatusBadge state={toAdminState(check.state)} className="max-w-full whitespace-normal break-words" />
                        </div>
                        <p className="break-words text-sm text-muted-foreground">{buildCheckSummary(check)}</p>
                        <p className="break-words text-sm text-foreground">{check.explanation}</p>
                        <div className="space-y-1 break-words text-sm">
                            <p className="text-muted-foreground">Last seen: {formatLastSeen(check.lastSeenAtUtc)}</p>
                            <p className="text-foreground">Next action: {check.nextAction}</p>
                        </div>
                        <Disclosure className="min-w-0 rounded-md border border-border text-sm text-muted-foreground">
                            <DisclosureSummary className="min-h-11 cursor-pointer break-words rounded-md px-3 py-3 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Details</DisclosureSummary>
                            <div className="space-y-1 break-words px-3 pb-3">
                                <p>Source: {check.source}</p>
                                <p>Reason: {check.reasonCode}</p>
                                <p>Severity: {check.severity}</p>
                            </div>
                        </Disclosure>
                    </Card>
                ))}
                {adminSessionState === "ready" && !isLoading && !error && checks.length === 0 ? (
                    <Card className="min-w-0 gap-0 border-dashed p-4 text-sm text-muted-foreground shadow-none">
                        No privacy console evidence is available yet.
                    </Card>
                ) : null}
            </div>
        </section>
    );
}
