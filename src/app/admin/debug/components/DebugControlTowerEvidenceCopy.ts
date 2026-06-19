export type PublicBetaCapDisplayState =
    | "source_only"
    | "external_proof_required"
    | "admin_truth_sample_required"
    | "refresh_due"
    | "review";

export type PublicBetaCapDisplay = {
    state: PublicBetaCapDisplayState;
    label: string;
    detail: string;
};

export function resolvePublicBetaCapDetailForAdmin(detail?: string): PublicBetaCapDisplay {
    const normalized = String(detail ?? "").trim();
    const count = normalized.match(/\b\d+\b/u)?.[0];

    if (!normalized) {
        return { state: "review", label: "Readiness unavailable", detail: "The public beta evidence gate did not provide a reason." };
    }

    if (/targeted behavior tests/iu.test(normalized)) {
        return {
            state: "source_only",
            label: "Source-only evidence",
            detail: "Implemented behavior checks passed. Runtime smoke, provider smoke, admin samples, and UI visual checks stay separate.",
        };
    }

    if (/runtime\/provider smoke|provider smoke|runtime smoke/iu.test(normalized)) {
        const runtimeRecorded = /runtime smoke:\s*keep automated deployed runtime smoke evidence fresh|formal runtime smoke passed|runtimeartifactstatus=formal_runtime_smoke_passed|runtimegatepassed=true/iu.test(normalized);
        const providerProofDetail = runtimeRecorded
            ? "Attach redacted provider proof. Runtime smoke is recorded; keep it fresh."
            : "Attach redacted provider proof and deployed runtime smoke.";
        return {
            state: "external_proof_required",
            label: "External proof required",
            detail: /operator-confirmed|operator confirmed|paypal/iu.test(normalized)
                ? `The operator-confirmed payment is product context only. ${providerProofDetail}`
                : providerProofDetail,
        };
    }

    if (/admin truth|sample evidence|truth sample/iu.test(normalized)) {
        return {
            state: "admin_truth_sample_required",
            label: "Admin sample required",
            detail: "Attach a fresh redacted production admin truth sample before clearing this gate.",
        };
    }

    if (/report freshness|pr integrity|freshness window|current-head|current head/iu.test(normalized)) {
        return {
            state: "refresh_due",
            label: "Refresh due",
            detail: count ? `${count} required generated reports are outside the freshness window.` : "Required generated reports are outside the freshness window.",
        };
    }

    return {
        state: "review",
        label: "Needs review",
        detail: normalized
            .replace(/^Unknown evidence:\s*/iu, "")
            .replace(/^Stale evidence:\s*/iu, "")
            .replace(/^Runtime unverified:\s*/iu, "")
            .trim() || "Evidence needs review.",
    };
}

export function formatPublicBetaCapDetailForAdmin(detail?: string) {
    const display = resolvePublicBetaCapDetailForAdmin(detail);
    return `${display.label}: ${display.detail}`;
}

export function summarizePublicBetaCapDisplays(displays: PublicBetaCapDisplay[]) {
    const sourceOnlyCount = displays.filter((entry) => entry.state === "source_only").length;
    const externalProofCount = displays.filter((entry) => entry.state === "external_proof_required" || entry.state === "admin_truth_sample_required").length;
    const refreshCount = displays.filter((entry) => entry.state === "refresh_due").length;
    const reviewCount = displays.filter((entry) => entry.state === "review").length;
    const summary = [
        externalProofCount ? `${externalProofCount} formal proof gate${externalProofCount === 1 ? "" : "s"}` : null,
        refreshCount ? `${refreshCount} refresh item${refreshCount === 1 ? "" : "s"}` : null,
        sourceOnlyCount ? `${sourceOnlyCount} source check${sourceOnlyCount === 1 ? "" : "s"}` : null,
        reviewCount ? `${reviewCount} review item${reviewCount === 1 ? "" : "s"}` : null,
    ].filter(Boolean).join(", ");

    return {
        sourceOnlyCount,
        externalProofCount,
        refreshCount,
        reviewCount,
        needsFormalProof: externalProofCount > 0,
        needsRefresh: externalProofCount === 0 && refreshCount > 0,
        needsReview: externalProofCount === 0 && refreshCount === 0 && (sourceOnlyCount > 0 || reviewCount > 0),
        summary,
    };
}

export function formatPublicBetaReadinessStatusForAdmin(input: { status?: string | null; reason?: string | null; capDetails?: string[] }) {
    const status = String(input.status ?? "").trim();
    const combined = [status, input.reason, ...(input.capDetails ?? [])].filter(Boolean).join(" ");
    if (!combined.trim()) return "Readiness unavailable";
    if (/runtime\/provider smoke|provider smoke|runtime smoke|admin truth|sample evidence|truth sample|external proof|proof required/iu.test(combined)) return "External proof required";
    if (/report freshness|pr integrity|freshness window|current-head|current head|generated reports? are older/iu.test(combined)) return "Report refresh needed";
    if (/targeted behavior tests|source checks/iu.test(combined)) return "Source checks only";
    if (/unknown evidence/iu.test(combined)) return "Evidence needs classification";
    if (/stale evidence/iu.test(combined)) return "Refresh or proof needed";
    if (/ready/iu.test(status)) return "Ready";
    return status.replaceAll("_", " ").replace(/\b\w/gu, (char) => char.toUpperCase());
}
