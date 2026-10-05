import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AdminMetricCard } from "@/components/Admin/AdminMetricCard";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import { adminMetricStateToSurfaceState } from "@/lib/admin-metric-truth-state";
import {
    resolveAdminInputTruthState,
    resolveAdminMetricTruthState,
    type AdminTruthState,
} from "@/lib/admin-truth-state";
import {
    type AdminAiDropCoverPreflightCheck,
    type AdminAiDropCoverReferenceAsset,
    type AdminAiDropCoverRuntimeDiagnostic,
    type AdminAiDropCoverRuntimeStatus,
} from "@/lib/ai-drop-covers";

export const ADMIN_AI_NO_SOURCE_VALUE = "No source";
export const ADMIN_AI_NO_VERIFIED_RUNS_VALUE = "No verified runs";

export function formatTimestamp(timestamp?: number | null) {
    if (!timestamp) return "Not recorded";
    return new Date(timestamp).toLocaleString();
}

export function formatCompactTimestamp(timestamp?: number | null) {
    if (!timestamp) return "Not recorded";
    return new Date(timestamp).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export function runtimeTone(status?: AdminAiDropCoverRuntimeStatus) {
    switch (status) {
        case "ready":
            return "border-success/20 bg-success/10 text-success";
        case "disabled":
            return "border-border bg-secondary text-foreground";
        default:
            return "border-warning/20 bg-warning/10 text-warning";
    }
}

export function preflightTone(status?: AdminAiDropCoverPreflightCheck["status"]) {
    switch (status) {
        case "pass":
            return "border-success/20 bg-success/10 text-success";
        case "fail":
            return "border-destructive/20 bg-destructive/10 text-destructive";
        default:
            return "border-warning/20 bg-warning/10 text-warning";
    }
}

export function diagnosticTone(severity?: AdminAiDropCoverRuntimeDiagnostic["severity"]) {
    switch (severity) {
        case "error":
            return "border-destructive/20 bg-destructive/10 text-destructive";
        case "warn":
            return "border-warning/20 bg-warning/10 text-warning";
        default:
            return "border-border bg-secondary text-foreground";
    }
}

export function statTone(success: boolean) {
    return success
        ? "border-success/20 bg-success/10 text-success"
        : "border-border bg-secondary text-foreground";
}

export function resolveAdminAiDataState(input: {
    data?: unknown;
    error?: unknown;
    isLoading?: boolean;
}): AdminSurfaceState {
    const truthState = resolveAdminMetricTruthState({
        value: input.data,
        truthState: input.error ? "failed" : input.isLoading && !input.data ? "unavailable" : undefined,
    });
    return adminMetricStateToSurfaceState(truthState);
}

export function formatAdminAiNullableNumber(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "Not recorded";
}

export function formatAdminAiSnapshotNumber(value: number | null | undefined, hasSnapshot: boolean) {
    if (!hasSnapshot) return ADMIN_AI_NO_SOURCE_VALUE;
    return formatAdminAiNullableNumber(value);
}

export function formatAdminAiSnapshotPercent(value: number | null | undefined, hasSnapshot: boolean) {
    if (!hasSnapshot) return ADMIN_AI_NO_SOURCE_VALUE;
    return typeof value === "number" && Number.isFinite(value) ? `${value}%` : ADMIN_AI_NO_VERIFIED_RUNS_VALUE;
}

export function parseMultilineInput(value: string) {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

export function MetricCard({ label, value, meta, tone = "neutral", truthState }: {
    label: string;
    value: string | number;
    meta?: string;
    tone?: "neutral" | "good" | "warn";
    truthState?: AdminTruthState | AdminSurfaceState | "loading";
}) {
    const resolvedTruth = resolveAdminInputTruthState({
        truthState,
        value,
        pendingInitialLoad: truthState === "loading",
    });

    return (
        <AdminMetricCard
            label={label}
            value={value}
            meta={meta}
            tone={tone}
            truthState={resolvedTruth.truthState}
            hasUsableValue={resolvedTruth.hasUsableValue}
            pendingInitialLoad={resolvedTruth.pendingInitialLoad}
        />
    );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold break-words", className)}>
            {children}
        </span>
    );
}

export function TextAreaBlock({
    label,
    value,
    onChange,
    rows = 5,
    readOnly = false,
    helper,
}: {
    label: string;
    value: string;
    onChange?: (value: string) => void;
    rows?: number;
    readOnly?: boolean;
    helper?: string;
}) {
    return (
        <label className="block space-y-2">
            <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
                {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
            </div>
            <Textarea
                value={value}
                onChange={(event) => onChange?.(event.target.value)}
                rows={rows}
                readOnly={readOnly}
                className={cn(
                    "w-full rounded-[1rem] border border-border bg-background/35 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/40",
                    readOnly ? "cursor-default text-muted-foreground" : ""
                )}
            />
        </label>
    );
}

export function EmptyState({
    title,
    detail,
    action,
}: {
    title: string;
    detail: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-[1.1rem] border border-dashed border-border bg-background/25 px-4 py-5 text-sm text-muted-foreground">
            <div className="font-semibold text-foreground">{title}</div>
            <p className="mt-1 break-words">{detail}</p>
            {action ? <div className="mt-3">{action}</div> : null}
        </div>
    );
}

export function getReferenceSourceLabel(asset: AdminAiDropCoverReferenceAsset) {
    if (asset.primary) return "Primary style";
    if (asset.source === "house_reference") return asset.pinned ? "Pinned reference" : "House reference";
    if (asset.source === "retained_ai_cover") return asset.retentionReason === "accepted" ? "Accepted output" : "Liked output";
    if (asset.source === "catalog_drop_cover") return "Catalog cover";
    if (asset.source === "recent_drop_cover") return "Recent cover";
    return "Template";
}

export function getReferenceSelectionReason(asset: AdminAiDropCoverReferenceAsset) {
    if (asset.primary) return "Primary style lock for typography, composition, and poster rhythm.";
    if (asset.pinned) return "Pinned reference ranked ahead of retained and catalog assets.";
    if (asset.selectionReasons && asset.selectionReasons.length > 0) return asset.selectionReasons.join(" | ");
    if (asset.source === "retained_ai_cover") return "Positive prior output retained for style continuity without forcing subject reuse.";
    if (asset.source === "catalog_drop_cover") return "Published catalog cover used as a lower-priority fallback reference.";
    return "Active library reference available for the auto-ranked set.";
}
