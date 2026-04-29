import { cn } from "@/lib/utils";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import {
    type AdminAiDropCoverPreflightCheck,
    type AdminAiDropCoverReferenceAsset,
    type AdminAiDropCoverRuntimeDiagnostic,
    type AdminAiDropCoverRuntimeStatus,
} from "@/lib/ai-drop-covers";

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
            return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
        case "disabled":
            return "border-white/10 bg-white/5 text-gray-200";
        default:
            return "border-amber-400/20 bg-amber-500/10 text-amber-100";
    }
}

export function preflightTone(status?: AdminAiDropCoverPreflightCheck["status"]) {
    switch (status) {
        case "pass":
            return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
        case "fail":
            return "border-red-400/20 bg-red-500/10 text-red-100";
        default:
            return "border-amber-400/20 bg-amber-500/10 text-amber-100";
    }
}

export function diagnosticTone(severity?: AdminAiDropCoverRuntimeDiagnostic["severity"]) {
    switch (severity) {
        case "error":
            return "border-red-400/20 bg-red-500/10 text-red-100";
        case "warn":
            return "border-amber-400/20 bg-amber-500/10 text-amber-100";
        default:
            return "border-white/10 bg-white/5 text-gray-200";
    }
}

export function statTone(success: boolean) {
    return success
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : "border-white/10 bg-white/5 text-gray-200";
}

export function resolveAdminAiDataState(input: {
    data?: unknown;
    error?: unknown;
    isLoading?: boolean;
}): AdminSurfaceState {
    if (input.error) return "failed";
    if (input.data) return "live";
    if (input.isLoading) return "loading";
    return "unavailable";
}

export function formatAdminAiNullableNumber(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "[unavailable]";
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
    truthState?: AdminSurfaceState;
}) {
    const toneClassName = tone === "good"
        ? "border-emerald-400/20 bg-emerald-500/10"
        : tone === "warn"
            ? "border-amber-400/20 bg-amber-500/10"
            : "border-white/10 bg-white/[0.04]";

    return (
        <div className={cn("min-w-0 overflow-hidden rounded-[1.1rem] border p-3", toneClassName)}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{label}</p>
                <AdminStatusBadge state={truthState ?? "loading"} className="py-0.5" />
            </div>
            <div className="mt-1.5 break-words text-xl font-black text-white md:text-2xl">{value}</div>
            {meta ? <p className="mt-1 break-words text-xs text-gray-400">{meta}</p> : null}
        </div>
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
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{label}</div>
                {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
            </div>
            <textarea
                value={value}
                onChange={(event) => onChange?.(event.target.value)}
                rows={rows}
                readOnly={readOnly}
                className={cn(
                    "w-full rounded-[1rem] border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/40",
                    readOnly ? "cursor-default text-gray-300" : ""
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
        <div className="overflow-hidden rounded-[1.1rem] border border-dashed border-white/10 bg-black/25 px-4 py-5 text-sm text-gray-400">
            <div className="font-semibold text-white">{title}</div>
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
