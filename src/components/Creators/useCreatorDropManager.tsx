"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Package, XCircle } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { type CreatorDropMetricsResolution } from "@/lib/drops/drop-metrics-resolver";
import { resolveDropStatus, type DropStatusResolution } from "@/lib/drops/drop-status-resolver";
import { trackEvent } from "@/lib/telemetry";
import { getMobileModuleClassNames } from "@/lib/frontend-hardening/ui/mobile-scale-contract";
import { createStaleRequestGuard, getMobileSkeletonClass, getModuleLoadingState } from "@/lib/frontend-hardening/ui/loading-state-contract";

type CreatorDropReviewStatus = "draft" | "submitted" | "pending_review" | "approved" | "needs_changes" | "rejected" | "expired";
type CreatorDropFilter = "all" | CreatorDropReviewStatus;

type CreatorDropRow = {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    status?: string;
    approvalStatus?: string;
    reviewStatus?: string;
    publicDiscovery?: boolean;
    rotationEligibility?: boolean;
    createdByRole?: string;
    submittedByCreatorId?: string;
    assignedCreatorIds?: string[];
    unlockCost?: number;
    validUntil?: number | null;
    expiresAt?: number | null;
    totalViews?: number | null;
    totalClicks?: number | null;
    totalUnlocks?: number | null;
    metrics?: CreatorDropMetricsResolution["serialized"];
    statusResolution?: DropStatusResolution;
    updatedAt?: number | string | null;
};

export const REVIEW_TABS: Array<{
    id: CreatorDropFilter;
    label: string;
    icon: typeof Package;
}> = [
    { id: "all", label: "All", icon: Package },
    { id: "draft", label: "Drafts", icon: Package },
    { id: "submitted", label: "Submitted", icon: Clock3 },
    { id: "pending_review", label: "Pending", icon: Clock3 },
    { id: "approved", label: "Approved", icon: CheckCircle2 },
    { id: "needs_changes", label: "Needs changes", icon: AlertCircle },
    { id: "rejected", label: "Rejected", icon: XCircle },
    { id: "expired", label: "Expired", icon: XCircle },
];

export const REVIEW_STATUS_LABELS: Record<CreatorDropReviewStatus, string> = {
    draft: "Draft",
    submitted: "Submitted",
    pending_review: "Waiting on admin review",
    approved: "Approved",
    needs_changes: "Needs changes",
    rejected: "Not approved",
    expired: "Expired",
};

export const creatorManagerModuleClassName = getMobileModuleClassNames("creator", "manager");
export const creatorDropListSkeletonClassName = getMobileSkeletonClass("creator", "list");
export const CREATOR_DROP_MANAGER_PANEL_CLASS_NAME = "rounded-2xl bg-card  ";

export function classifyDrop(drop: CreatorDropRow): CreatorDropReviewStatus {
    const status = drop.statusResolution ?? resolveDropStatus(drop);
    if (status.creatorStatusKey === "needs_changes") return "needs_changes";
    if (status.creatorStatusKey === "rejected") return "rejected";
    if (status.creatorStatusKey === "expired") return "expired";
    if (status.creatorStatusKey === "approved_live" || status.creatorStatusKey === "admin_created") return "approved";
    if (status.creatorStatusKey === "pending_review") return "pending_review";
    if (status.creatorStatusKey === "creator_submitted") return "submitted";
    return "draft";
}

export function statusToneClassName(tone: DropStatusResolution["statusTone"]) {
    if (tone === "success") return "border-success/30 bg-success/10 text-success";
    if (tone === "warning") return "border-warning/30 bg-warning/10 text-warning";
    if (tone === "danger") return "border-destructive/30 bg-destructive/10 text-destructive";
    if (tone === "info") return "border-info/30 bg-info/10 text-info";
    if (tone === "muted") return "border-border bg-secondary text-muted-foreground";
    return "border-border bg-secondary text-muted-foreground";
}

export function renderMetric(metric: CreatorDropMetricsResolution["views"]) {
    return metric.displayValue;
}

export function useCreatorDropManager() {
const { user } = useAuth();
const [drops, setDrops] = useState<CreatorDropRow[]>([]);
const [activeTab, setActiveTab] = useState<CreatorDropFilter>("all");
const [loading, setLoading] = useState(true);
const [isModalOpen, setIsModalOpen] = useState(false);
const openedTrackedRef = useRef(false);
const dropLoadGuardRef = useRef(createStaleRequestGuard());
const loadDrops = useCallback(async () => {
        const requestId = dropLoadGuardRef.current.next();
        setLoading(true);
        try {
            const response = await authFetch("/api/creator/drops?limit=100");
            const result = await response.json() as { drops?: CreatorDropRow[]; error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Unable to load creator drops.");
            }
            if (!dropLoadGuardRef.current.isFresh(requestId)) {
                return;
            }
            const loadedDrops = Array.isArray(result.drops) ? result.drops : [];
            setDrops(loadedDrops);
            const pendingReviewCount = loadedDrops.filter((drop) => classifyDrop(drop) === "pending_review").length;
            if (pendingReviewCount > 0) {
                trackEvent("creator_drop_pending_review_viewed", {
                    source_component: "CreatorDropManager",
                    surface: "creator_submission",
                    pending_review_count: pendingReviewCount,
                });
            }
            if (loadedDrops.length > 0) {
                trackEvent("creator_drop_status_viewed", {
                    source_component: "CreatorDropManager",
                    surface: "creator_submission",
                    drop_count: loadedDrops.length,
                });
            }
        } catch (error) {
            if (dropLoadGuardRef.current.isFresh(requestId)) {
                toast.error(error instanceof Error ? error.message : "Unable to load creator drops.");
            }
        } finally {
            if (dropLoadGuardRef.current.isFresh(requestId)) {
                setLoading(false);
            }
        }
    }, []);
useEffect(() => {
        void loadDrops();
    }, [loadDrops]);
useEffect(() => {
        if (openedTrackedRef.current) return;
        openedTrackedRef.current = true;
        trackEvent("creator_drop_manager_opened", {
            source_component: "CreatorDropManager",
            surface: "creator_submission",
            ui_density: "mobile_compact",
        });
        trackEvent("creator_drop_manager_viewed", {
            source_component: "CreatorDropManager",
            surface: "creator_submission",
            ui_density: "mobile_compact",
        });
    }, []);
const { tabCounts, dropsByTab } = useMemo(() => {
        const counts: Record<CreatorDropFilter, number> = {
            all: drops.length,
            draft: 0,
            submitted: 0,
            pending_review: 0,
            approved: 0,
            needs_changes: 0,
            rejected: 0,
            expired: 0,
        };
        const grouped: Record<CreatorDropFilter, CreatorDropRow[]> = {
            all: drops,
            draft: [],
            submitted: [],
            pending_review: [],
            approved: [],
            needs_changes: [],
            rejected: [],
            expired: [],
        };

        for (const drop of drops) {
            const status = classifyDrop(drop);
            counts[status] += 1;
            grouped[status].push(drop);
        }

        return { tabCounts: counts, dropsByTab: grouped };
    }, [drops]);
const visibleDrops = dropsByTab[activeTab];
const dropListLoadingState = getModuleLoadingState({ loading, hasData: visibleDrops.length > 0 });
const showDropListSkeleton = dropListLoadingState === "loading";
const openSubmitForm = useCallback(() => {
        trackEvent("creator_drop_submission_started", {
            source_component: "CreatorDropManager",
            surface: "creator_submission",
            ui_density: "mobile_compact",
        });
        setIsModalOpen(true);
    }, []);
return { user, activeTab, setActiveTab, isModalOpen, setIsModalOpen, loadDrops, tabCounts, visibleDrops, showDropListSkeleton, openSubmitForm };
}
