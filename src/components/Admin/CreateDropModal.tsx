"use client";

import { ReactNode, useState, useEffect, memo, useCallback, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Loader2, Save, Calendar, DollarSign, X, ImageIcon, FileAudio, ChevronDown, ChevronUp } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import { AiDropCoverGeneratorPanel } from "@/components/Admin/AiDropCoverGeneratorPanel";
import { AiDropDescriptionGeneratorPanel } from "@/components/Admin/AiDropDescriptionGeneratorPanel";
import { AssetUploader, UploadAspectRatio } from "@/components/Admin/AssetUploader";
import { useForm, SubmitHandler, useWatch, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import {
    buildDropFormValuesFromDrop,
    buildDropRequestPayload,
    createDefaultDropFormValues,
    dropFormSchema,
    type DropFormData,
} from "@/lib/admin-drop-form";
import type { UploadDraftSnapshot } from "@/lib/uploads/asset-upload-draft-contract";
import {
    toggleAdminDropFormSection,
    type AdminDropFormSectionId,
} from "@/lib/admin-drop-form-sections";
import { dispatchAdminOverviewSync } from "@/hooks/client-runtime";
import { reportClientIssue } from "@/lib/client-error-reporting";
import type { AdminAiDropCoverJobRecord } from "@/lib/ai-drop-covers";
import { trackEvent } from "@/lib/telemetry";
import { toast } from "sonner";

const AVAILABLE_TAGS = ["Sweet", "Spicy", "RAW"];

interface UploadedAsset {
    id: string;
    url: string;
    type: string;
    size: number;
    fileName?: string;
}

interface AssetUploadStateSummary {
    total: number;
    queued: number;
    uploading: number;
    success: number;
    failed: number;
    allComplete: boolean;
}

interface CreatorOption {
    uid: string;
    displayName: string;
    username: string;
    photoURL: string | null;
    role: string;
}

function inferAssetTypeFromUrl(url: string, fallbackType?: string): string {
    const normalizedFallback = fallbackType?.toLowerCase() || "application/octet-stream";

    try {
        const pathname = new URL(url).pathname.toLowerCase();
        if (pathname.match(/\.(mp4|m4v|mov|webm|ogg|ogv)$/)) return "video/mp4";
        if (pathname.match(/\.(jpg|jpeg)$/)) return "image/jpeg";
        if (pathname.match(/\.(png)$/)) return "image/png";
        if (pathname.match(/\.(gif)$/)) return "image/gif";
        if (pathname.match(/\.(webp)$/)) return "image/webp";
    } catch {
        const lowerUrl = url.split("?")[0].toLowerCase();
        if (lowerUrl.match(/\.(mp4|m4v|mov|webm|ogg|ogv)$/)) return "video/mp4";
        if (lowerUrl.match(/\.(jpg|jpeg)$/)) return "image/jpeg";
        if (lowerUrl.match(/\.(png)$/)) return "image/png";
        if (lowerUrl.match(/\.(gif)$/)) return "image/gif";
        if (lowerUrl.match(/\.(webp)$/)) return "image/webp";
    }

    return normalizedFallback;
}

function summarizeMediaCounts(assets: UploadedAsset[], fallbackType?: string) {
    return assets.reduce(
        (counts, asset) => {
            const type = inferAssetTypeFromUrl(asset.url, asset.type || fallbackType);
            if (type.startsWith("video/")) {
                counts.videos += 1;
            } else {
                counts.images += 1;
            }
            return counts;
        },
        { images: 0, videos: 0 },
    );
}

interface FilesAndAssetsSectionProps {
    uploadsOpen: boolean;
    onToggle: () => void;
    coverAspectRatio: UploadAspectRatio;
    contentAspectRatio: UploadAspectRatio;
    onCoverAspectRatioChange: (ratio: UploadAspectRatio) => void;
    onContentAspectRatioChange: (ratio: UploadAspectRatio) => void;
    imageUrl: string;
    initialCoverAssets: UploadedAsset[];
    contentUrl: string;
    contentType?: string;
    initialContentAssets: UploadedAsset[];
    onCoverAssetsChange: (assets: UploadedAsset[]) => void;
    onContentAssetsChange: (assets: UploadedAsset[]) => void;
    onCoverUploadStateChange: (state: AssetUploadStateSummary) => void;
    onContentUploadStateChange: (state: AssetUploadStateSummary) => void;
    onCoverDraftStateChange: (snapshot: UploadDraftSnapshot) => void;
    onContentDraftStateChange: (snapshot: UploadDraftSnapshot) => void;
    resetKey?: string;
    serverUploadEndpoint: string;
    aiPanel?: ReactNode;
    errors: FieldErrors<DropFormData>;
    errorSummary?: string;
}

function FormSectionCard({
    sectionId,
    title,
    summary,
    open,
    onToggle,
    icon,
    errorSummary,
    children,
}: {
    sectionId: AdminDropFormSectionId;
    title: string;
    summary?: string;
    open: boolean;
    onToggle: () => void;
    icon?: ReactNode;
    errorSummary?: string;
    children: ReactNode;
}) {
    return (
        <div className="glass-panel overflow-hidden rounded-[1.8rem] border border-white/6 bg-white/[0.02] shadow-lg">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                data-create-drop-section-trigger={sectionId}
                aria-expanded={open}
            >
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                        {icon}
                        <span>{title}</span>
                    </div>
                    {summary ? <p className="mt-1 text-xs text-gray-400">{summary}</p> : null}
                    {errorSummary ? <p className="mt-1 text-xs font-semibold text-red-300">{errorSummary}</p> : null}
                </div>
                {open ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />}
            </button>
            {open ? <div className="border-t border-white/6 px-4 pb-4 pt-3">{children}</div> : null}
        </div>
    );
}

const FilesAndAssetsSection = memo(function FilesAndAssetsSection({
    uploadsOpen,
    onToggle,
    coverAspectRatio,
    contentAspectRatio,
    onCoverAspectRatioChange,
    onContentAspectRatioChange,
    imageUrl,
    initialCoverAssets,
    contentUrl,
    contentType,
    initialContentAssets,
    onCoverAssetsChange,
    onContentAssetsChange,
    onCoverUploadStateChange,
    onContentUploadStateChange,
    onCoverDraftStateChange,
    onContentDraftStateChange,
    resetKey,
    serverUploadEndpoint,
    aiPanel,
    errors,
    errorSummary,
}: FilesAndAssetsSectionProps) {
    const contentAssetCount = initialContentAssets.length > 0 ? initialContentAssets.length : (contentUrl ? 1 : 0);
    const summary = [
        imageUrl ? "Cover ready" : "Add cover",
        `${contentAssetCount} ${contentAssetCount === 1 ? "asset" : "assets"}`,
    ].join(" · ");

    return (
        <div className="glass-panel overflow-hidden rounded-[1.8rem] border border-white/6 bg-white/[0.02] shadow-lg">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                data-create-drop-section-trigger="assets"
            >
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <ImageIcon className="h-4 w-4 text-brand-purple" />
                        <FileAudio className="h-4 w-4 text-brand-purple" />
                        Files & Assets
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{summary.replace(/[^\x20-\x7E]+/gu, " | ").replace(/\s+\|\s+\|/gu, " | ").trim()}</p>
                    {errorSummary ? <p className="mt-1 text-xs font-semibold text-red-300">{errorSummary}</p> : null}
                </div>
                {uploadsOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />}
            </button>

            {uploadsOpen ? (
                <div className="space-y-3 border-t border-white/6 px-4 pb-4 pt-3">
                    {aiPanel}
                    <div data-create-drop-field="imageUrl">
                        <AssetUploader
                            label="Cover"
                            folder="drops/images"
                            accept=".jpg,.jpeg,.png,.webp,.heic,.gif,.mp4,image/*,video/mp4"
                            helperText="Supports JPG, PNG, WEBP, HEIC, GIF, MP4"
                            aspectRatio={coverAspectRatio}
                            onAspectRatioChange={onCoverAspectRatioChange}
                            initialAssets={initialCoverAssets}
                            initialUrl={imageUrl}
                            initialType="image/png"
                            onChange={onCoverAssetsChange}
                            onUploadStateChange={onCoverUploadStateChange}
                            onDraftStateChange={onCoverDraftStateChange}
                            resetKey={resetKey}
                            serverUploadEndpoint={serverUploadEndpoint}
                        />
                    </div>
                    {errors.imageUrl && <p className="text-red-400 text-xs">{errors.imageUrl.message}</p>}

                    <div data-create-drop-field="contentUrls">
                        <AssetUploader
                            label="Content"
                            folder="drops/content"
                            multiple
                            accept=".jpg,.jpeg,.png,.webp,.heic,.gif,.mp4,.zip,image/*,video/mp4,application/zip,application/x-zip-compressed"
                            helperText="Upload one or more media/zip assets (up to 50)"
                            aspectRatio={contentAspectRatio}
                            onAspectRatioChange={onContentAspectRatioChange}
                            initialAssets={initialContentAssets}
                            initialUrl={contentUrl}
                            initialType={contentType}
                            onChange={onContentAssetsChange}
                            onUploadStateChange={onContentUploadStateChange}
                            onDraftStateChange={onContentDraftStateChange}
                            resetKey={resetKey}
                            disableCrop={true}
                            serverUploadEndpoint={serverUploadEndpoint}
                        />
                    </div>
                    {(errors.contentUrls || errors.contentUrl) && (
                        <p className="text-red-400 text-xs">{errors.contentUrls?.message || errors.contentUrl?.message}</p>
                    )}
                </div>
            ) : null}
        </div>
    );
});

export interface CreateDropModalProps {
    isOpen: boolean;
    onClose: () => void;
    dropId?: string | null;
    duplicateFromId?: string | null;
    onSuccess: () => void;
    mode?: "admin" | "creator";
    presentation?: "modal" | "inline";
    creatorIdOverride?: string | null;
    onSubmitFailure?: (message: string) => void;
}

type DropSaveApiResult = {
    error?: string;
    id?: string;
    errorClass?: string;
    recoveryAction?: string;
    details?: string[];
};

type DropFormFieldName = keyof DropFormData;
type CreateDropSubmitIssueKind = "validation" | "uploading" | "duplicate" | "route_blocked" | "api";

type CreateDropSubmitIssue = {
    kind: CreateDropSubmitIssueKind;
    section: AdminDropFormSectionId;
    field?: DropFormFieldName;
    route?: string;
    errorClass?: string;
    recoveryAction?: string;
    details?: string[];
    message: string;
};

type CreateDropSectionErrorMap = Partial<Record<AdminDropFormSectionId, CreateDropSubmitIssue>>;

const CREATE_DROP_SECTION_ORDER: readonly AdminDropFormSectionId[] = ["basics", "assets", "pricing", "actions"];

const CREATE_DROP_FIELD_ORDER: readonly DropFormFieldName[] = [
    "creatorId",
    "title",
    "description",
    "type",
    "imageUrl",
    "contentUrls",
    "contentUrl",
    "fileMetadata",
    "unlockCost",
    "validFrom",
    "validUntil",
    "requiresActiveSubscription",
    "autoQueueOnExpire",
    "ctaText",
    "actionUrl",
];

const CREATE_DROP_FIELD_SECTION: Record<DropFormFieldName, AdminDropFormSectionId> = {
    creatorId: "basics",
    title: "basics",
    description: "basics",
    type: "basics",
    tags: "basics",
    imageUrl: "assets",
    contentUrl: "assets",
    contentUrls: "assets",
    fileMetadata: "assets",
    coverFileName: "assets",
    contentFileNames: "assets",
    unlockCost: "pricing",
    validFrom: "pricing",
    validUntil: "pricing",
    requiresActiveSubscription: "pricing",
    autoQueueOnExpire: "pricing",
    ctaText: "actions",
    actionUrl: "actions",
    accentColor: "actions",
};

const CREATE_DROP_ERROR_CLASS_SECTION: Record<string, AdminDropFormSectionId> = {
    creator_not_configured: "basics",
    creator_permission_denied: "basics",
    invalid_creator_drop_payload: "basics",
    media_required: "assets",
    media_access_denied: "assets",
    expired_drop_unavailable: "pricing",
    missing_creator_drop_id: "basics",
    stale_creator_draft: "basics",
    approval_required: "basics",
    admin_review_conflict: "basics",
    creator_status_conflict: "basics",
    suspicious_creator_request: "basics",
};

const CREATE_DROP_ROUTE_BLOCKING_CLASSES = new Set([
    "creator_not_configured",
    "creator_permission_denied",
    "stale_creator_draft",
    "missing_creator_drop_id",
    "approval_required",
]);

function buildDropSaveErrorMessage(result: DropSaveApiResult, fallback: string) {
    const base = typeof result.error === "string" && result.error.trim().length > 0
        ? result.error.trim()
        : fallback;
    const recoveryAction = typeof result.recoveryAction === "string" && result.recoveryAction.trim().length > 0
        ? result.recoveryAction.trim()
        : "";
    return recoveryAction ? `${base} ${recoveryAction}` : base;
}

function getDropSaveRoute(mode: "admin" | "creator") {
    return mode === "creator" ? "/api/creator/drops" : "/api/admin/drops";
}

function readFieldErrorMessage(errors: FieldErrors<DropFormData>, field: DropFormFieldName) {
    const entry = errors[field];
    if (!entry || typeof entry !== "object") {
        return "";
    }

    const maybeMessage = "message" in entry ? entry.message : undefined;
    return typeof maybeMessage === "string" ? maybeMessage : "";
}

function resolveFirstFieldError(errors: FieldErrors<DropFormData>) {
    for (const field of CREATE_DROP_FIELD_ORDER) {
        const message = readFieldErrorMessage(errors, field);
        if (message) {
            return { field, message, section: CREATE_DROP_FIELD_SECTION[field] };
        }
    }

    return null;
}

function resolveSectionFromDetails(details?: string[]) {
    const combined = (details || []).join(" ").toLowerCase();
    if (!combined) {
        return null;
    }
    if (/(cover|content|media|file|asset|upload)/u.test(combined)) {
        return "assets" as const;
    }
    if (/(date|time|schedule|start|end|expiration|expired)/u.test(combined)) {
        return "pricing" as const;
    }
    if (/(destination|url|action|cta|button|path)/u.test(combined)) {
        return "actions" as const;
    }
    return null;
}

function resolveFieldFromSection(section: AdminDropFormSectionId, details?: string[]): DropFormFieldName | undefined {
    const combined = (details || []).join(" ").toLowerCase();
    if (section === "assets") {
        if (combined.includes("cover")) return "imageUrl";
        return "contentUrls";
    }
    if (section === "pricing") {
        if (combined.includes("end") || combined.includes("expiration")) return "validUntil";
        return "validFrom";
    }
    if (section === "actions") {
        return "actionUrl";
    }
    if (combined.includes("description")) return "description";
    if (combined.includes("title")) return "title";
    if (combined.includes("creator")) return "creatorId";
    return undefined;
}

function buildSectionErrorMap(issue: CreateDropSubmitIssue): CreateDropSectionErrorMap {
    return { [issue.section]: issue };
}

function focusCreateDropControl(section: AdminDropFormSectionId, field?: DropFormFieldName) {
    if (typeof window === "undefined") {
        return;
    }

    window.setTimeout(() => {
        const fieldControl = field
            ? document.querySelector<HTMLElement>(`[data-create-drop-field="${field}"] input, [data-create-drop-field="${field}"] textarea, [data-create-drop-field="${field}"] select, [data-create-drop-field="${field}"]`)
            : null;
        const sectionControl = document.querySelector<HTMLElement>(`[data-create-drop-section-trigger="${section}"]`);
        (fieldControl || sectionControl)?.focus();
    }, 0);
}

export function CreateDropModal({ isOpen, onClose, dropId, duplicateFromId, onSuccess, mode = "admin", presentation, creatorIdOverride = null, onSubmitFailure }: CreateDropModalProps) {
    const isEditMode = !!dropId;
    const resolvedPresentation = presentation ?? (mode === "admin" ? "inline" : "modal");
    const isInlineAdminPanel = mode === "admin" && resolvedPresentation === "inline";
    const diagnosticSurface = isInlineAdminPanel ? "admin_drop_action_panel" : "create_drop_modal";
    const diagnosticConsolePrefix = isInlineAdminPanel ? "[Admin Drop Action Panel]" : "[Create Drop Modal]";
    const [fetching, setFetching] = useState(isEditMode);
    const [contentAssets, setContentAssets] = useState<UploadedAsset[]>([]);
    const [coverAssets, setCoverAssets] = useState<UploadedAsset[]>([]);
    const [coverUploadState, setCoverUploadState] = useState<AssetUploadStateSummary | null>(null);
    const [contentUploadState, setContentUploadState] = useState<AssetUploadStateSummary | null>(null);
    const [coverDraftState, setCoverDraftState] = useState<UploadDraftSnapshot | null>(null);
    const [contentDraftState, setContentDraftState] = useState<UploadDraftSnapshot | null>(null);
    const [creatorOptions, setCreatorOptions] = useState<CreatorOption[]>([]);
    const [duplicateWarnings, setDuplicateWarnings] = useState<Array<{ dropId: string; title: string; duplicateFileNames: string[]; approvalStatus: string }>>([]);
    const [checkingDuplicateNames, setCheckingDuplicateNames] = useState(false);

    const [openSection, setOpenSection] = useState<AdminDropFormSectionId | null>(null);
    const [sectionErrorMap, setSectionErrorMap] = useState<CreateDropSectionErrorMap>({});
    const [submitIssue, setSubmitIssue] = useState<CreateDropSubmitIssue | null>(null);
    const [coverAspectRatio, setCoverAspectRatio] = useState<UploadAspectRatio>("1:1");
    const [contentAspectRatio, setContentAspectRatio] = useState<UploadAspectRatio>("1:1");
    const [selectedAiCoverJobId, setSelectedAiCoverJobId] = useState<string | null>(null);
    const [selectedAiDescriptionJobId, setSelectedAiDescriptionJobId] = useState<string | null>(null);
    const [draftSessionId, setDraftSessionId] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        control,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<DropFormData>({
        resolver: zodResolver(dropFormSchema) as any,
        defaultValues: createDefaultDropFormValues(creatorIdOverride),
    });

    const clearSubmitFeedback = useCallback(() => {
        setSubmitIssue((current) => current ? null : current);
        setSectionErrorMap((current) => Object.keys(current).length > 0 ? {} : current);
    }, []);

    const dropType = useWatch({ control, name: "type" });
    const creatorIdValue = useWatch({ control, name: "creatorId" }) || "";
    const watchedTags = useWatch({ control, name: "tags" });
    const currentTags = useMemo(() => watchedTags || [], [watchedTags]);
    const imageUrl = useWatch({ control, name: "imageUrl" }) || "";
    const contentUrl = useWatch({ control, name: "contentUrl" }) || "";
    const contentUrls = useWatch({ control, name: "contentUrls" }) || [];
    const fileMetadata = useWatch({ control, name: "fileMetadata" });
    const coverFileName = useWatch({ control, name: "coverFileName" }) || "";
    const titleValue = useWatch({ control, name: "title" }) || "";
    const unlockCostValue = useWatch({ control, name: "unlockCost" }) || 0;
    const validFromValue = useWatch({ control, name: "validFrom" }) || "";
    const validUntilValue = useWatch({ control, name: "validUntil" }) || "";
    const selectedCreator = useMemo(
        () => creatorOptions.find((option) => option.uid === creatorIdValue) ?? null,
        [creatorIdValue, creatorOptions],
    );
    const selectedCreatorName = selectedCreator?.displayName || null;

    const basicsSummary = useMemo(() => {
        const typeLabel = dropType === "promo" ? "Promo drop" : dropType === "external" ? "External drop" : "Content drop";
        const tagLabel = currentTags.length > 0 ? `${currentTags.length} tag${currentTags.length === 1 ? "" : "s"}` : "No tags";
        return `${typeLabel} · ${tagLabel}`;
    }, [currentTags.length, dropType]);

    const pricingSummary = useMemo(() => {
        const startLabel = validFromValue ? validFromValue.replace("T", " · ") : "No start time";
        const endLabel = validUntilValue ? validUntilValue.replace("T", " · ") : "No end time";
        return `${unlockCostValue} GD · ${startLabel} · ${endLabel}`;
    }, [unlockCostValue, validFromValue, validUntilValue]);

    const actionSummary = useMemo(() => {
        if (dropType === "content") {
            return "";
        }

        return dropType === "promo" ? "Configure ad CTA and destination." : "Configure off-platform destination.";
    }, [dropType]);

    const cleanBasicsSummary = useMemo(() => {
        const typeLabel = dropType === "promo" ? "Promo drop" : dropType === "external" ? "External drop" : "Content drop";
        const titleLabel = titleValue.trim().length > 0 ? titleValue.trim() : typeLabel;
        const tagLabel = currentTags.length > 0 ? `${currentTags.length} tag${currentTags.length === 1 ? "" : "s"}` : "No tags";
        return `${titleLabel} | ${tagLabel}`;
    }, [currentTags.length, dropType, titleValue]);

    const cleanPricingSummary = useMemo(() => {
        const startLabel = validFromValue ? validFromValue.replace("T", " | ") : "No start time";
        const endLabel = validUntilValue ? validUntilValue.replace("T", " | ") : "No end time";
        return `${unlockCostValue} GD | ${startLabel} | ${endLabel}`;
    }, [unlockCostValue, validFromValue, validUntilValue]);

    const cleanActionSummary = useMemo(() => {
        if (dropType === "content") {
            return "No CTA needed for content drops.";
        }

        return dropType === "promo" ? "Configure the ad button and destination." : "Configure the external destination and CTA.";
    }, [dropType]);
    const hasActiveUploads = Boolean(
        (coverDraftState && (
            coverDraftState.summary.queued > 0
            || coverDraftState.summary.uploading > 0
            || coverDraftState.summary.processing > 0
            || coverDraftState.assets.some((asset) => asset.uploadStatus === "local")
        ))
        || (contentDraftState && (
            contentDraftState.summary.queued > 0
            || contentDraftState.summary.uploading > 0
            || contentDraftState.summary.processing > 0
            || contentDraftState.assets.some((asset) => asset.uploadStatus === "local")
        )),
    );
    const hasFailedDrafts = Boolean(
        (coverDraftState && (coverDraftState.summary.failed > 0 || coverDraftState.summary.blocked > 0))
        || (contentDraftState && (contentDraftState.summary.failed > 0 || contentDraftState.summary.blocked > 0)),
    );
    const uploadsBusy = hasActiveUploads;
    const submitRoute = getDropSaveRoute(mode);
    const routeBlockedReason = mode === "creator" && !creatorIdOverride?.trim()
        ? "Creator account is still loading. Refresh if this does not resolve."
        : "";
    const invalidReason = submitIssue?.kind === "validation"
        ? "Fix the highlighted fields before submitting."
        : "";
    const duplicateReason = duplicateWarnings.length > 0
        ? "Resolve duplicate file names before saving."
        : "";
    const submitDisabledReason = isSubmitting
        ? "Saving drop..."
        : fetching
            ? "Loading drop details..."
            : uploadsBusy
                ? "Uploads are still finishing."
                : routeBlockedReason || duplicateReason || invalidReason;
    const submitIssueMessage = submitIssue?.message || submitDisabledReason;
    const submitDisabled = Boolean(isSubmitting || fetching || uploadsBusy || routeBlockedReason || duplicateReason || invalidReason);

    const basicsOpen = openSection === "basics";
    const uploadsOpen = openSection === "assets";
    const pricingOpen = openSection === "pricing";
    const actionSettingsOpen = openSection === "actions";

    const handleToggleSection = useCallback((section: AdminDropFormSectionId) => {
        setOpenSection((current) => toggleAdminDropFormSection(current, section));
    }, []);

    useEffect(() => {
        if (!isOpen || mode !== "admin") {
            return;
        }

        let cancelled = false;
        async function fetchCreatorOptions() {
            try {
                const response = await authFetch("/api/admin/creator-options");
                const result = await response.json() as { creators?: CreatorOption[] };
                if (!response.ok) {
                    throw new Error("Failed to load creator options");
                }

                if (!cancelled) {
                    setCreatorOptions(Array.isArray(result.creators) ? result.creators : []);
                }
            } catch (error) {
                reportClientIssue({
                    channel: "ui",
                    message: "Admin drop creator options fetch failed",
                    error,
                    detail: {
                        adminView: diagnosticSurface,
                        mode,
                    },
                    consoleLabel: `${diagnosticConsolePrefix} load creator options failed`,
                });
            }
        }

        void fetchCreatorOptions();
        return () => {
            cancelled = true;
        };
    }, [diagnosticConsolePrefix, diagnosticSurface, isOpen, mode, setValue]);

    useEffect(() => {
        if (isOpen) {
            setOpenSection("basics");
        }
    }, [dropId, duplicateFromId, isOpen]);

    useEffect(() => {
        if (isOpen && mode === "creator" && creatorIdOverride?.trim()) {
            setValue("creatorId", creatorIdOverride.trim(), { shouldValidate: false });
        }
    }, [creatorIdOverride, isOpen, mode, setValue]);

    useEffect(() => {
        if (!isOpen || !routeBlockedReason) {
            return;
        }

        const issue: CreateDropSubmitIssue = {
            kind: "route_blocked",
            section: "basics",
            field: "creatorId",
            route: submitRoute,
            errorClass: "creator_not_configured",
            recoveryAction: routeBlockedReason,
            message: routeBlockedReason,
        };
        setSubmitIssue(issue);
        setSectionErrorMap(buildSectionErrorMap(issue));
        reportClientIssue({
            channel: "ui",
            severity: "warn",
            message: "Create drop route blocked before submit",
            humanMessage: routeBlockedReason,
            detail: {
                component: "CreateDropModal",
                field: issue.field,
                section: issue.section,
                route: issue.route,
                errorClass: issue.errorClass,
                recoveryAction: issue.recoveryAction,
                mode,
            },
            consoleLabel: `${diagnosticConsolePrefix} route blocked`,
        });
    }, [diagnosticConsolePrefix, isOpen, mode, routeBlockedReason, submitRoute]);

    useEffect(() => {
        if (!isOpen) {
            setContentAssets([]);
            setCoverAssets([]);
            setOpenSection(null);
            setSectionErrorMap({});
            setSubmitIssue(null);
            setSelectedAiCoverJobId(null);
            setSelectedAiDescriptionJobId(null);
            setDraftSessionId(null);
            setCoverUploadState(null);
            setContentUploadState(null);
            setCoverDraftState(null);
            setContentDraftState(null);
            reset(createDefaultDropFormValues(creatorIdOverride));
            setDuplicateWarnings([]);
            return;
        }

        if (!dropId) {
            setDraftSessionId((current) => current || crypto.randomUUID());
        } else {
            setDraftSessionId(null);
        }

        if (!dropId && !duplicateFromId) {
            setFetching(false);
            return;
        }

        setFetching(true);
        async function fetchDrop() {
            try {
                const docRef = doc(db, "drops", (dropId || duplicateFromId) as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const prepared = buildDropFormValuesFromDrop(docSnap.data(), docSnap.id, {
                        creatorIdOverride,
                        duplicate: Boolean(duplicateFromId),
                    });
                    reset(prepared.values);
                    setContentAssets(prepared.contentAssets);
                    setCoverAssets(prepared.values.imageUrl ? [{
                        id: `cover-${docSnap.id}`,
                        url: prepared.values.imageUrl,
                        type: "image/png",
                        size: 0,
                        fileName: prepared.values.coverFileName || "cover.png",
                    }] : []);
                } else {
                    toast.error("Drop unavailable.");
                    onClose();
                }
            } catch (err) {
                reportClientIssue({
                    channel: "ui",
                    message: "Drop editor fetch failed",
                    error: err,
                    detail: {
                        adminView: diagnosticSurface,
                        mode,
                        dropId: dropId || duplicateFromId,
                        isDuplicate: Boolean(duplicateFromId),
                    },
                    consoleLabel: `${diagnosticConsolePrefix} fetch drop failed`,
                });
            } finally {
                setFetching(false);
            }
        }

        fetchDrop();
    }, [creatorIdOverride, diagnosticConsolePrefix, diagnosticSurface, duplicateFromId, dropId, isOpen, mode, onClose, reset]);

    useEffect(() => {
        if (dropType === "content" && openSection === "actions") {
            setOpenSection(null);
        }
    }, [dropType, openSection]);

    const handleCoverAssetsChange = useCallback((assets: UploadedAsset[]) => {
        clearSubmitFeedback();
        const primary = assets[0];
        setCoverAssets(assets);
        setValue("imageUrl", primary?.url || "", { shouldValidate: true });
        setValue("coverFileName", primary?.fileName || "", { shouldValidate: false });
        setSelectedAiCoverJobId((current) => primary?.id === current ? current : null);
    }, [clearSubmitFeedback, setValue]);

    const handleApplyAiDescription = useCallback((job: { id: string; descriptionText?: string | null }) => {
        if (typeof job.descriptionText === "string" && job.descriptionText.trim().length > 0) {
            setValue("description", job.descriptionText, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
            });
        }
        setSelectedAiDescriptionJobId(job.id);
    }, [setValue]);

    const handleApplyAiCover = useCallback((job: AdminAiDropCoverJobRecord) => {
        const coverAsset = job.imageUrl ? [{
            id: job.id,
            url: job.imageUrl,
            type: job.mimeType || "image/png",
            size: 0,
            fileName: job.fileName || "ai-cover.png",
        }] : [];
        setCoverAssets(coverAsset);
        setValue("imageUrl", job.imageUrl || "", { shouldValidate: true });
        setValue("coverFileName", job.fileName || "", { shouldValidate: false });
        setSelectedAiCoverJobId(job.id);
    }, [setValue]);

    const handleContentAssetsChange = useCallback((assets: UploadedAsset[]) => {
        clearSubmitFeedback();
        setContentAssets(assets);
        const urls = assets.map(a => a.url);
        const fileNames = assets.map((asset) => asset.fileName).filter((fileName): fileName is string => typeof fileName === "string" && fileName.length > 0);
        setValue("contentUrl", urls[0] || "", { shouldValidate: true });
        setValue("contentUrls", urls, { shouldValidate: true });
        setValue("contentFileNames", fileNames, { shouldValidate: false });

        const primary = assets[0];
        if (primary) {
            setValue("fileMetadata", {
                size: primary.size,
                type: primary.type,
                dimensions: contentAspectRatio,
            }, { shouldValidate: true });
        } else {
            setValue("fileMetadata", null, { shouldValidate: false });
        }
    }, [clearSubmitFeedback, contentAspectRatio, setValue]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const pendingNames = [
            ...contentAssets.map((asset) => asset.fileName).filter((fileName): fileName is string => typeof fileName === "string" && fileName.length > 0),
            ...(coverFileName ? [coverFileName] : []),
        ];

        if (pendingNames.length === 0) {
            setDuplicateWarnings([]);
            return;
        }

        const localNormalized = pendingNames.map((name) => name.trim().toLowerCase());
        const localDuplicates = localNormalized.filter((name, index) => localNormalized.indexOf(name) !== index);
        if (localDuplicates.length > 0) {
            setDuplicateWarnings([{
                dropId: "local",
                title: "Pending upload list",
                duplicateFileNames: Array.from(new Set(localDuplicates)),
                approvalStatus: "draft",
            }]);
            return;
        }

        const timeoutId = window.setTimeout(async () => {
            try {
                setCheckingDuplicateNames(true);
                const response = await authFetch("/api/drops/duplicate-filenames", {
                    method: "POST",
                    body: JSON.stringify({
                        fileNames: pendingNames,
                        excludeDropId: dropId || undefined,
                    }),
                });
                const result = await response.json() as {
                    duplicates?: Array<{ dropId: string; title: string; duplicateFileNames: string[]; approvalStatus: string }>;
                };
                if (!response.ok) {
                    throw new Error("Failed to check duplicate file names");
                }
                setDuplicateWarnings(Array.isArray(result.duplicates) ? result.duplicates : []);
            } catch (error) {
                reportClientIssue({
                    channel: "ui",
                    message: "Drop duplicate filename check failed",
                    error,
                    detail: {
                        adminView: diagnosticSurface,
                        mode,
                        dropId: dropId || undefined,
                    },
                    consoleLabel: `${diagnosticConsolePrefix} duplicate filename check failed`,
                });
            } finally {
                setCheckingDuplicateNames(false);
            }
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [contentAssets, coverFileName, diagnosticConsolePrefix, diagnosticSurface, dropId, isOpen, mode]);

    const toggleTag = useCallback((tag: string) => {
        clearSubmitFeedback();
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        setValue("tags", newTags);
    }, [clearSubmitFeedback, currentTags, setValue]);

    const trackCreatorSubmitFailure = useCallback((message: string) => {
        if (mode !== "creator") return;
        trackEvent("creator_drop_submit_failed", {
            source_component: "CreateDropModal",
            surface: "creator_submission",
            reason: message,
        });
        onSubmitFailure?.(message);
    }, [mode, onSubmitFailure]);

    const applySubmitIssue = useCallback((issue: CreateDropSubmitIssue, options?: { toast?: boolean; error?: unknown }) => {
        setSubmitIssue(issue);
        setSectionErrorMap(buildSectionErrorMap(issue));
        setOpenSection(issue.section);
        focusCreateDropControl(issue.section, issue.field);
        reportClientIssue({
            channel: "ui",
            severity: issue.kind === "api" || issue.kind === "route_blocked" ? "warn" : "info",
            message: "Create drop submit blocked",
            humanMessage: issue.message,
            error: options?.error,
            detail: {
                component: "CreateDropModal",
                field: issue.field,
                section: issue.section,
                route: issue.route,
                errorClass: issue.errorClass,
                recoveryAction: issue.recoveryAction,
                details: issue.details,
                mode,
                isEditMode,
            },
            consoleLabel: `${diagnosticConsolePrefix} submit blocked`,
        });
        trackCreatorSubmitFailure(issue.message);
        if (options?.toast !== false) {
            toast.error(issue.message);
        }
    }, [diagnosticConsolePrefix, isEditMode, mode, trackCreatorSubmitFailure]);

    const buildApiSubmitIssue = useCallback((result: DropSaveApiResult, fallback: string): CreateDropSubmitIssue => {
        const route = submitRoute;
        const section = resolveSectionFromDetails(result.details)
            || (result.errorClass ? CREATE_DROP_ERROR_CLASS_SECTION[result.errorClass] : null)
            || "basics";
        const recoveryAction = typeof result.recoveryAction === "string" ? result.recoveryAction : "";
        return {
            kind: CREATE_DROP_ROUTE_BLOCKING_CLASSES.has(result.errorClass || "") ? "route_blocked" : "api",
            section,
            field: resolveFieldFromSection(section, result.details),
            route,
            errorClass: result.errorClass,
            recoveryAction,
            details: result.details,
            message: buildDropSaveErrorMessage(result, fallback),
        };
    }, [submitRoute]);

    const onSubmit: SubmitHandler<DropFormData> = async (data) => {
        try {
            clearSubmitFeedback();
            if (routeBlockedReason) {
                applySubmitIssue({
                    kind: "route_blocked",
                    section: "basics",
                    field: "creatorId",
                    route: submitRoute,
                    errorClass: "creator_not_configured",
                    recoveryAction: routeBlockedReason,
                    message: routeBlockedReason,
                });
                return;
            }
            if (duplicateWarnings.length > 0) {
                const message = "Resolve duplicate file names before saving this drop.";
                applySubmitIssue({
                    kind: "duplicate",
                    section: "assets",
                    field: "contentUrls",
                    route: submitRoute,
                    errorClass: "duplicate_file_names",
                    recoveryAction: "Remove or rename duplicate files, then save again.",
                    message,
                    details: duplicateWarnings.flatMap((warning) => warning.duplicateFileNames),
                });
                return;
            }
            if (hasActiveUploads) {
                trackEvent("asset_batch_submit_blocked_uploads_in_progress", {
                    folder: "drops",
                    source_component: diagnosticSurface,
                    mode,
                });
                const message = "Uploads are still finishing. Wait for all files to upload before saving this drop.";
                applySubmitIssue({
                    kind: "uploading",
                    section: "assets",
                    field: "contentUrls",
                    route: submitRoute,
                    errorClass: "uploads_in_progress",
                    recoveryAction: "Wait for every upload to finish, then submit again.",
                    message,
                });
                return;
            }
            if (hasFailedDrafts) {
                const proceed = window.confirm("Some uploads failed or were canceled. Save this drop without them?");
                if (!proceed) {
                    applySubmitIssue({
                        kind: "uploading",
                        section: "assets",
                        field: "contentUrls",
                        route: submitRoute,
                        errorClass: "uploads_failed_or_canceled",
                        recoveryAction: "Retry failed uploads or remove them before saving.",
                        message: "Review failed uploads before saving this drop.",
                    });
                    return;
                }
            }

            const { dropData } = buildDropRequestPayload(data, {
                mode,
                creatorIdOverride,
                isEditMode,
            });
            const validFrom = Number(dropData.validFrom);
            const validUntil = typeof dropData.validUntil === "number" ? dropData.validUntil : null;

            if (validUntil !== null) {
                if (validFrom >= validUntil) {
                    applySubmitIssue({
                        kind: "validation",
                        section: "pricing",
                        field: "validUntil",
                        route: submitRoute,
                        errorClass: "invalid_drop_schedule",
                        recoveryAction: "Choose an end time after the start time.",
                        message: "End date must be after start date.",
                    });
                    return;
                }
            }

            dropData.mediaCounts = summarizeMediaCounts(contentAssets, data.fileMetadata?.type);

            let persistedDropId = dropId || null;
            if (mode === "creator") {
                trackEvent("creator_drop_submit_attempted", {
                    source_component: "CreateDropModal",
                    surface: "creator_submission",
                    is_edit_mode: isEditMode,
                });
            }

            if (isEditMode) {
                const response = await authFetch(mode === "creator" ? "/api/creator/drops" : "/api/admin/drops", {
                    method: "PUT",
                    body: JSON.stringify({ dropId, dropData }),
                });
                const result = await response.json() as DropSaveApiResult;
                if (!response.ok) {
                    applySubmitIssue(buildApiSubmitIssue(result, "Failed to update drop."), { error: result });
                    return;
                }
                toast.success(mode === "creator" ? "Drop submission updated successfully" : "Drop updated successfully");
            } else {
                const response = await authFetch(mode === "creator" ? "/api/creator/drops" : "/api/admin/drops", {
                    method: "POST",
                    body: JSON.stringify({
                        dropData: {
                            ...dropData,
                            totalUnlocks: 0,
                        },
                    }),
                });
                const result = await response.json() as DropSaveApiResult;
                if (!response.ok) {
                    applySubmitIssue(buildApiSubmitIssue(result, "Failed to save drop."), { error: result });
                    return;
                }
                persistedDropId = typeof result.id === "string" ? result.id : null;
                toast.success(mode === "creator" ? "Drop submitted for admin approval" : "Drop created successfully");
            }

            if (mode === "creator") {
                trackEvent("creator_drop_submit_succeeded", {
                    source_component: "CreateDropModal",
                    surface: "creator_submission",
                    drop_id: persistedDropId || undefined,
                    is_edit_mode: isEditMode,
                });
            }

            if (mode === "admin" && selectedAiCoverJobId && persistedDropId) {
                try {
                    const response = await authFetch("/api/admin/ai/drop-covers/feedback", {
                        method: "POST",
                        body: JSON.stringify({
                            jobId: selectedAiCoverJobId,
                            action: "link_drop",
                            dropId: persistedDropId,
                        }),
                    });
                    if (!response.ok) {
                        const result = await response.json().catch(() => ({})) as { error?: string };
                        throw new Error(result.error || "Failed to link AI cover history");
                    }
                } catch (linkError) {
                    reportClientIssue({
                        channel: "ui",
                        severity: "warn",
                        message: "AI drop cover history link failed after drop save",
                        error: linkError,
                        detail: {
                            adminView: diagnosticSurface,
                            selectedAiCoverJobId,
                            persistedDropId,
                        },
                        consoleLabel: `${diagnosticConsolePrefix} AI cover link failed`,
                    });
                }
            }

            if (mode === "admin" && selectedAiDescriptionJobId && persistedDropId) {
                try {
                    const response = await authFetch("/api/admin/ai/drop-descriptions/feedback", {
                        method: "POST",
                        body: JSON.stringify({
                            jobId: selectedAiDescriptionJobId,
                            action: "link_drop",
                            dropId: persistedDropId,
                        }),
                    });
                    if (!response.ok) {
                        const result = await response.json().catch(() => ({})) as { error?: string };
                        throw new Error(result.error || "Failed to link AI description history");
                    }
                } catch (linkError) {
                    reportClientIssue({
                        channel: "ui",
                        severity: "warn",
                        message: "AI drop description history link failed after drop save",
                        error: linkError,
                        detail: {
                            adminView: diagnosticSurface,
                            selectedAiDescriptionJobId,
                            persistedDropId,
                        },
                        consoleLabel: `${diagnosticConsolePrefix} AI description link failed`,
                    });
                }
            }

            if (mode === "admin") {
                dispatchAdminOverviewSync();
            }
            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error && error.message.trim().length > 0
                ? error.message
                : "Failed to save drop.";
            applySubmitIssue({
                kind: "api",
                section: "basics",
                route: submitRoute,
                errorClass: "unexpected_create_drop_submit_failure",
                recoveryAction: "Try again. If it keeps failing, check your permissions and upload status.",
                details: [
                    `mode:${mode}`,
                    `dropType:${data.type}`,
                    `isEditMode:${isEditMode}`,
                    dropId ? `dropId:${dropId}` : "newDrop",
                ],
                message,
            }, {
                error,
            });
        }
    };

    const onError = (errors: FieldErrors<DropFormData>) => {
        const firstError = resolveFirstFieldError(errors);
        const errorMessages = Object.values(errors)
            .map(e => e?.message)
            .filter(Boolean) as string[];

        if (errorMessages.length > 0) {
            const message = `Cannot submit drop due to missing or invalid fields: ${errorMessages.join(", ")}`;
            applySubmitIssue({
                kind: "validation",
                section: firstError?.section || "basics",
                field: firstError?.field,
                route: submitRoute,
                errorClass: "invalid_drop_form",
                recoveryAction: "Open the highlighted section and fix the required fields.",
                details: errorMessages,
                message,
            });
        } else {
            const message = "Please check the form for errors. Ensure all selected files have been fully uploaded.";
            applySubmitIssue({
                kind: "validation",
                section: "assets",
                field: "contentUrls",
                route: submitRoute,
                errorClass: "invalid_drop_form",
                recoveryAction: "Open Files & Assets and confirm every selected file is uploaded.",
                message,
            });
        }
    };

    if (!isOpen) return null;

    const titleLabel = isEditMode ? (mode === "creator" ? "Edit submission" : "Edit Drop") : (mode === "creator" ? "Submit drop for review" : "Create Drop");
    const titleId = "create-drop-form-title";
    const panelClassName = cn(
        "relative flex w-full flex-col overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl focus:outline-none focus:ring-2 focus:ring-brand-purple/50",
        resolvedPresentation === "inline"
            ? "mt-4 rounded-[1.5rem] shadow-black/20"
            : "max-h-[calc(100svh-0.5rem)] max-w-3xl rounded-[2rem] md:max-h-[92vh] md:rounded-3xl",
    );
    const panelBody = (
                    <>
                        {resolvedPresentation === "inline" ? (
                            <header className="shrink-0 border-b border-white/10 bg-black/35 px-4 py-3 md:px-5">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">Drop action</p>
                                <h2 id={titleId} className="mt-1 text-lg font-black text-white">
                                    {titleLabel}
                                </h2>
                                <p className="mt-1 text-xs text-gray-300">
                                    Create, edit, or duplicate Drops. Validation stays inside this form.
                                </p>
                            </header>
                        ) : (
                            <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-black/65 px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-md md:px-6 md:pb-5 md:pt-5">
                                <Dialog.Title className="shrink-0 text-xl font-bold text-white">
                                    {titleLabel}
                                </Dialog.Title>
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        aria-label="Close drop form"
                                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </Dialog.Close>
                            </header>
                        )}

                        <div className="custom-scrollbar flex-1 overflow-y-auto px-3 pb-24 pt-3 md:px-5 md:pb-6 md:pt-5">
                            {fetching ? (
                                <div className="flex items-center justify-center min-h-[300px]">
                                    <Loader2 className="w-8 h-8 animate-spin text-white" aria-hidden="true" />
                                </div>
                            ) : (
                                <form id="create-drop-form" onSubmit={handleSubmit(onSubmit, onError)} onChange={clearSubmitFeedback} className="space-y-3">
                                    <FormSectionCard
                                        sectionId="basics"
                                        title="Basics"
                                        summary={cleanBasicsSummary}
                                        errorSummary={sectionErrorMap.basics?.message}
                                        open={basicsOpen}
                                        onToggle={() => handleToggleSection("basics")}
                                    >
                                        <div className="space-y-3">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Creator name {mode === "admin" ? "(optional)" : ""}</label>
                                                <select
                                                    {...register("creatorId")}
                                                    disabled={mode === "creator"}
                                                    data-create-drop-field="creatorId"
                                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white disabled:opacity-80"
                                                >
                                                    <option value="">{mode === "creator" ? "Your creator account" : "Leave unassigned"}</option>
                                                    {creatorOptions.map((option) => (
                                                        <option key={option.uid} value={option.uid}>
                                                            {option.displayName}{option.username ? ` • @${option.username}` : ""}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Drop type</label>
                                                <select
                                                    {...register("type")}
                                                    data-create-drop-field="type"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-brand-purple/50"
                                                >
                                                    <option value="content">Content Drop</option>
                                                    <option value="promo">Promo / Ad</option>
                                                    <option value="external">External Link</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <input
                                                {...register("title")}
                                                type="text"
                                                placeholder="Drop Title"
                                                data-create-drop-field="title"
                                                className="w-full bg-transparent border-none p-0 text-lg font-bold text-white placeholder:text-gray-600 focus:ring-0"
                                            />
                                            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
                                        </div>

                                        <div>
                                            <textarea
                                                {...register("description")}
                                                placeholder="Describe what's inside..."
                                                rows={3}
                                                data-create-drop-field="description"
                                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-purple/50 transition-all resize-none shadow-inner"
                                            />
                                            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
                                        </div>

                                        {mode === "admin" ? (
                                            <AiDropDescriptionGeneratorPanel
                                                visible={basicsOpen}
                                                title={titleValue}
                                                creatorId={creatorIdValue || creatorIdOverride || null}
                                                creatorName={selectedCreatorName}
                                                dropId={dropId}
                                                draftSessionId={draftSessionId}
                                                selectedJobId={selectedAiDescriptionJobId}
                                                onApplyDescription={handleApplyAiDescription}
                                                onSelectedJobChange={setSelectedAiDescriptionJobId}
                                            />
                                        ) : null}

                                        <div className="flex flex-col gap-2">
                                            <div className="flex flex-wrap gap-2">
                                                {AVAILABLE_TAGS.map(tag => (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => toggleTag(tag)}
                                                        className={cn(
                                                            "px-3 py-1 rounded-full text-xs font-bold border",
                                                            currentTags.includes(tag)
                                                                ? "bg-brand-purple text-white border-brand-purple shadow-[0_0_10px_rgba(236,72,153,0.3)]"
                                                                : "bg-white/5 text-gray-500 border-white/5 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        </div>
                                    </FormSectionCard>

                                    {duplicateWarnings.length > 0 ? (
                                        <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-bold">Duplicate file names detected</p>
                                                    <p className="mt-1 text-xs text-amber-100/80">
                                                        Remove or rename duplicate files before saving this drop.
                                                    </p>
                                                </div>
                                                {checkingDuplicateNames ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                            </div>
                                            <div className="mt-3 space-y-2">
                                                {duplicateWarnings.map((warning) => (
                                                    <div key={`${warning.dropId}-${warning.title}`} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                                                        <p className="text-xs font-bold text-white">{warning.title}</p>
                                                        <p className="mt-1 text-[11px] text-amber-100/80">
                                                            {warning.duplicateFileNames.join(", ")}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}

                                    <FilesAndAssetsSection
                                        uploadsOpen={uploadsOpen}
                                        onToggle={() => handleToggleSection("assets")}
                                        coverAspectRatio={coverAspectRatio}
                                        contentAspectRatio={contentAspectRatio}
                                        onCoverAspectRatioChange={setCoverAspectRatio}
                                        onContentAspectRatioChange={setContentAspectRatio}
                                        imageUrl={imageUrl}
                                        initialCoverAssets={coverAssets}
                                        contentUrl={contentUrl}
                                        contentType={fileMetadata?.type}
                                        initialContentAssets={contentAssets}
                                          onCoverAssetsChange={handleCoverAssetsChange}
                                          onContentAssetsChange={handleContentAssetsChange}
                                          onCoverUploadStateChange={setCoverUploadState}
                                          onContentUploadStateChange={setContentUploadState}
                                          onCoverDraftStateChange={setCoverDraftState}
                                          onContentDraftStateChange={setContentDraftState}
                                          resetKey={draftSessionId || dropId || undefined}
                                          serverUploadEndpoint={mode === "creator" ? "/api/creator/drops/assets" : "/api/admin/content"}
                                          errorSummary={sectionErrorMap.assets?.message || (uploadsBusy ? "Uploads are still finishing." : undefined)}
                                          aiPanel={mode === "admin" ? (
                                            <AiDropCoverGeneratorPanel
                                                visible={uploadsOpen}
                                                title={titleValue}
                                                creatorId={creatorIdValue || creatorIdOverride || null}
                                                creatorName={selectedCreatorName}
                                                dropId={dropId}
                                                draftSessionId={draftSessionId}
                                                dropType={dropType}
                                                tags={currentTags}
                                                selectedJobId={selectedAiCoverJobId}
                                                onApplyCover={handleApplyAiCover}
                                                onSelectedJobChange={setSelectedAiCoverJobId}
                                            />
                                        ) : null}
                                        errors={errors}
                                    />

                                    <FormSectionCard
                                        sectionId="pricing"
                                        title="Pricing & Schedule"
                                        summary={cleanPricingSummary}
                                        errorSummary={sectionErrorMap.pricing?.message}
                                        open={pricingOpen}
                                        onToggle={() => handleToggleSection("pricing")}
                                        icon={<DollarSign className="h-4 w-4 text-brand-purple" />}
                                    >
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 flex items-center gap-1 uppercase">
                                                    <DollarSign className="w-3 h-3" /> Cost (Drops)
                                                </label>
                                                <input
                                                    {...register("unlockCost")}
                                                    type="number"
                                                    min="0"
                                                    inputMode="numeric"
                                                    data-create-drop-field="unlockCost"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-base focus:outline-none focus:border-brand-purple/50 shadow-inner"
                                                />
                                            </div>
                                            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-gray-300">
                                                <input
                                                    {...register("requiresActiveSubscription")}
                                                    type="checkbox"
                                                    data-create-drop-field="requiresActiveSubscription"
                                                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40 text-brand-purple focus:ring-brand-purple/50"
                                                />
                                                <span className="space-y-1">
                                                    <span className="block font-semibold text-white">Subscribers only</span>
                                                    <span className="block text-xs text-gray-400">
                                                        Active subscribers can access this creator drop without paying the normal unlock cost.
                                                    </span>
                                                </span>
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 flex items-center gap-1 uppercase">
                                                    <Calendar className="w-3 h-3" /> Start (CST)
                                                </label>
                                                <input
                                                    {...register("validFrom")}
                                                    type="datetime-local"
                                                    data-create-drop-field="validFrom"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-purple/50 shadow-inner [color-scheme:dark]"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 flex items-center gap-1 uppercase">
                                                    <Calendar className="w-3 h-3" /> End (CST)
                                                </label>
                                                <input
                                                    {...register("validUntil")}
                                                    type="datetime-local"
                                                    data-create-drop-field="validUntil"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-purple/50 shadow-inner [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>

                                            {mode === "admin" ? (
                                                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-gray-300">
                                                    <input
                                                        {...register("autoQueueOnExpire")}
                                                        type="checkbox"
                                                        data-create-drop-field="autoQueueOnExpire"
                                                        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40 text-brand-purple focus:ring-brand-purple/50"
                                                    />
                                                    <span className="space-y-1">
                                                        <span className="block font-semibold text-white">Auto queue when expired</span>
                                                        <span className="block text-xs text-gray-400">
                                                            Automatically add this drop back into the admin queue once its live window ends.
                                                        </span>
                                                    </span>
                                                </label>
                                            ) : null}
                                        </div>
                                    </FormSectionCard>

                                    {dropType !== "content" && (
                                        <FormSectionCard
                                            sectionId="actions"
                                            title="Action Settings"
                                            summary={cleanActionSummary}
                                            errorSummary={sectionErrorMap.actions?.message}
                                            open={actionSettingsOpen}
                                            onToggle={() => handleToggleSection("actions")}
                                            icon={<Calendar className="h-4 w-4 text-brand-purple" />}
                                        >
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Button Text</label>
                                                    <input
                                                        {...register("ctaText")}
                                                        type="text"
                                                        placeholder="Visit Shop"
                                                        data-create-drop-field="ctaText"
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-purple/50 shadow-inner"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">URL or app path</label>
                                                    <input
                                                        {...register("actionUrl")}
                                                        type="text"
                                                        inputMode="url"
                                                        placeholder="/drops/spring-promo or https://..."
                                                        data-create-drop-field="actionUrl"
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-purple/50 shadow-inner"
                                                    />
                                                    <p className="mt-1 text-[11px] text-gray-500">Supports on-site relative paths and full http/https destinations.</p>
                                                </div>
                                            </div>
                                        </FormSectionCard>
                                    )}
                                </form>
                            )}
                        </div>

                        <div
                            className="shrink-0 border-t border-white/10 bg-black/65 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur-md md:px-6 md:pb-6"
                            data-creator-drop-form-footer="mobile_safe"
                        >
                            {submitIssueMessage ? (
                                <p
                                    className="mb-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-200"
                                    data-create-drop-submit-reason={submitIssue?.kind || (submitDisabledReason ? "disabled" : "none")}
                                >
                                    {submitIssueMessage}
                                </p>
                            ) : null}
                            <div className="grid grid-cols-[minmax(6rem,0.4fr)_1fr] gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-gray-200 transition-colors hover:bg-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="create-drop-form"
                                disabled={submitDisabled}
                                data-create-drop-submit-disabled-reason={submitDisabledReason || ""}
                                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-purple to-[#d946ef] px-3 text-sm font-bold text-white shadow-[0_0_18px_rgba(236,72,153,0.25)] transition-all hover:shadow-[0_0_22px_rgba(236,72,153,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Save className="w-5 h-5" />}
                                {isSubmitting ? "Saving..." : isEditMode ? (mode === "creator" ? "Update submission" : "Update Drop") : (mode === "creator" ? "Submit for review" : "Create Drop")}
                            </button>
                            </div>
                        </div>
                    </>
    );

    if (resolvedPresentation === "inline") {
        return (
            <section
                className={panelClassName}
                aria-labelledby={titleId}
                data-admin-drop-create-panel="inline"
                data-admin-drop-form-presentation="inline"
            >
                {panelBody}
            </section>
        );
    }

    const panelContent = (
        <Dialog.Content className={panelClassName} aria-describedby={undefined}>
            {panelBody}
        </Dialog.Content>
    );

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
                <div className="fixed inset-0 z-50 flex items-end justify-center p-2 md:items-center md:p-4">
                    {panelContent}
                </div>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

