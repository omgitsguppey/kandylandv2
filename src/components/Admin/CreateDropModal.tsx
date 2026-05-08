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
}

function FormSectionCard({
    title,
    summary,
    open,
    onToggle,
    icon,
    children,
}: {
    title: string;
    summary?: string;
    open: boolean;
    onToggle: () => void;
    icon?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="glass-panel overflow-hidden rounded-[1.8rem] border border-white/6 bg-white/[0.02] shadow-lg">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
            >
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                        {icon}
                        <span>{title}</span>
                    </div>
                    {summary ? <p className="mt-1 text-xs text-gray-400">{summary}</p> : null}
                </div>
                {open ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />}
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
            >
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <ImageIcon className="h-4 w-4 text-brand-purple" />
                        <FileAudio className="h-4 w-4 text-brand-purple" />
                        Files & Assets
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{summary.replace(/[^\x20-\x7E]+/gu, " | ").replace(/\s+\|\s+\|/gu, " | ").trim()}</p>
                </div>
                {uploadsOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />}
            </button>

            {uploadsOpen ? (
                <div className="space-y-3 border-t border-white/6 px-4 pb-4 pt-3">
                    {aiPanel}
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
                    {errors.imageUrl && <p className="text-red-400 text-xs">{errors.imageUrl.message}</p>}

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
    creatorIdOverride?: string | null;
}

export function CreateDropModal({ isOpen, onClose, dropId, duplicateFromId, onSuccess, mode = "admin", creatorIdOverride = null }: CreateDropModalProps) {
    const isEditMode = !!dropId;
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
                        adminView: "create_drop_modal",
                        mode,
                    },
                    consoleLabel: "[Create Drop Modal] load creator options failed",
                });
            }
        }

        void fetchCreatorOptions();
        return () => {
            cancelled = true;
        };
    }, [isOpen, mode, setValue]);

    useEffect(() => {
        if (!isOpen) {
            setContentAssets([]);
            setCoverAssets([]);
            setOpenSection(null);
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
                        adminView: "create_drop_modal",
                        mode,
                        dropId: dropId || duplicateFromId,
                        isDuplicate: Boolean(duplicateFromId),
                    },
                    consoleLabel: "[Create Drop Modal] fetch drop failed",
                });
            } finally {
                setFetching(false);
            }
        }

        fetchDrop();
    }, [creatorIdOverride, duplicateFromId, dropId, isOpen, mode, onClose, reset]);

    useEffect(() => {
        if (dropType === "content" && openSection === "actions") {
            setOpenSection(null);
        }
    }, [dropType, openSection]);

    const handleCoverAssetsChange = useCallback((assets: UploadedAsset[]) => {
        const primary = assets[0];
        setCoverAssets(assets);
        setValue("imageUrl", primary?.url || "", { shouldValidate: true });
        setValue("coverFileName", primary?.fileName || "", { shouldValidate: false });
        setSelectedAiCoverJobId((current) => primary?.id === current ? current : null);
    }, [setValue]);

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
    }, [contentAspectRatio, setValue]);

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
                        adminView: "create_drop_modal",
                        mode,
                        dropId: dropId || undefined,
                    },
                    consoleLabel: "[Create Drop Modal] duplicate filename check failed",
                });
            } finally {
                setCheckingDuplicateNames(false);
            }
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [contentAssets, coverFileName, dropId, isOpen, mode]);

    const toggleTag = useCallback((tag: string) => {
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        setValue("tags", newTags);
    }, [currentTags, setValue]);

    const onSubmit: SubmitHandler<DropFormData> = async (data) => {
        try {
            if (duplicateWarnings.length > 0) {
                toast.error("Resolve duplicate file names before saving this drop.");
                return;
            }
            if (hasActiveUploads) {
                trackEvent("asset_batch_submit_blocked_uploads_in_progress", {
                    folder: "drops",
                    source_component: "create_drop_modal",
                    mode,
                });
                toast.error("Uploads are still finishing. Wait for all files to upload before saving this drop.");
                return;
            }
            if (hasFailedDrafts) {
                const proceed = window.confirm("Some uploads failed or were canceled. Save this drop without them?");
                if (!proceed) {
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
                    toast.error("End date must be after start date");
                    return;
                }
            }

            dropData.mediaCounts = summarizeMediaCounts(contentAssets, data.fileMetadata?.type);

            let persistedDropId = dropId || null;

            if (isEditMode) {
                const response = await authFetch(mode === "creator" ? "/api/creator/drops" : "/api/admin/drops", {
                    method: "PUT",
                    body: JSON.stringify({ dropId, dropData }),
                });
                const result = await response.json() as { error?: string };
                if (!response.ok) throw new Error(result.error);
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
                const result = await response.json() as { error?: string; id?: string };
                if (!response.ok) throw new Error(result.error);
                persistedDropId = typeof result.id === "string" ? result.id : null;
                toast.success(mode === "creator" ? "Drop submitted for admin approval" : "Drop created successfully");
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
                            adminView: "create_drop_modal",
                            selectedAiCoverJobId,
                            persistedDropId,
                        },
                        consoleLabel: "[Create Drop Modal] AI cover link failed",
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
                            adminView: "create_drop_modal",
                            selectedAiDescriptionJobId,
                            persistedDropId,
                        },
                        consoleLabel: "[Create Drop Modal] AI description link failed",
                    });
                }
            }

            if (mode === "admin") {
                dispatchAdminOverviewSync();
            }
            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save drop.";
            reportClientIssue({
                channel: "ui",
                message: "Drop save failed",
                error,
                detail: {
                    adminView: "create_drop_modal",
                    mode,
                    dropId: dropId || undefined,
                    isEditMode,
                    dropType: data.type,
                },
                consoleLabel: "[Create Drop Modal] save drop failed",
            });
            toast.error(message);
        }
    };

    const onError = (errors: FieldErrors<DropFormData>) => {
        const errorMessages = Object.values(errors)
            .map(e => e?.message)
            .filter(Boolean) as string[];

        if (errorMessages.length > 0) {
            toast.error(`Cannot submit drop due to missing or invalid fields: ${errorMessages.join(", ")}`);
        } else {
            toast.error("Please check the form for errors. Ensure all selected files have been fully uploaded.");
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
                <div className="fixed inset-0 z-50 flex items-end justify-center p-2 md:items-center md:p-4">
                    <Dialog.Content
                        className="relative flex max-h-[calc(100svh-0.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a] shadow-2xl focus:outline-none focus:ring-2 focus:ring-brand-purple/50 md:max-h-[92vh] md:rounded-3xl"
                        aria-describedby={undefined}
                    >
                        <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-black/65 px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-md md:px-6 md:pb-5 md:pt-5">
                            <Dialog.Title className="shrink-0 text-xl font-bold text-white">
                                {isEditMode ? (mode === "creator" ? "Edit Submission" : "Edit Drop") : (mode === "creator" ? "Submit Creator Drop" : "Create Drop")}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </Dialog.Close>
                        </header>

                        <div className="custom-scrollbar flex-1 overflow-y-auto px-3 pb-24 pt-3 md:px-5 md:pb-6 md:pt-5">
                            {fetching ? (
                                <div className="flex items-center justify-center min-h-[300px]">
                                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                                </div>
                            ) : (
                                <form id="create-drop-form" onSubmit={handleSubmit(onSubmit, onError)} className="space-y-3">
                                    <FormSectionCard
                                        title="Basics"
                                        summary={cleanBasicsSummary}
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
                                                className="w-full bg-transparent border-none p-0 text-lg font-bold text-white placeholder:text-gray-600 focus:ring-0"
                                            />
                                            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
                                        </div>

                                        <div>
                                            <textarea
                                                {...register("description")}
                                                placeholder="Describe what's inside..."
                                                rows={3}
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
                                                {checkingDuplicateNames ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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
                                        title="Pricing & Schedule"
                                        summary={cleanPricingSummary}
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
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-base focus:outline-none focus:border-brand-purple/50 shadow-inner"
                                                />
                                            </div>
                                            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-gray-300">
                                                <input
                                                    {...register("requiresActiveSubscription")}
                                                    type="checkbox"
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
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-purple/50 shadow-inner [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>

                                            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-gray-300">
                                            <input
                                                {...register("autoQueueOnExpire")}
                                                type="checkbox"
                                                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40 text-brand-purple focus:ring-brand-purple/50"
                                            />
                                            <span className="space-y-1">
                                                <span className="block font-semibold text-white">Auto queue when expired</span>
                                                <span className="block text-xs text-gray-400">
                                                    Automatically add this drop back into the admin queue once its live window ends.
                                                </span>
                                            </span>
                                            </label>
                                        </div>
                                    </FormSectionCard>

                                    {dropType !== "content" && (
                                        <FormSectionCard
                                            title="Action Settings"
                                            summary={cleanActionSummary}
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

                        <div className="shrink-0 border-t border-white/10 bg-black/65 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur-md md:px-6 md:pb-6">
                            <button
                                type="submit"
                                form="create-drop-form"
                                disabled={isSubmitting || fetching || uploadsBusy}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-purple to-[#d946ef] font-bold text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {isSubmitting ? "Saving..." : isEditMode ? (mode === "creator" ? "Update Submission" : "Update Drop") : (mode === "creator" ? "Submit For Approval" : "Create Drop")}
                            </button>
                        </div>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

