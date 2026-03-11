"use client";

import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { Loader2, Save, Calendar, DollarSign, X, ImageIcon, FileAudio, ChevronDown, ChevronUp } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import { AssetUploader, UploadAspectRatio } from "@/components/Admin/AssetUploader";
import { Drop } from "@/types/db";
import { useForm, SubmitHandler, useWatch, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import { getDefaultCSTDates, toCSTString, fromCSTInput } from "@/lib/timezone";
import { toast } from "sonner";

const dropSchema = z.object({
    title: z.string().min(3, "Title is too short"),
    description: z.string().min(10, "Description is too short"),
    imageUrl: z.string().url("Cover image is required"),
    contentUrl: z.string().url().optional().or(z.literal("")),
    contentUrls: z.array(z.string().url()).min(1, "At least one content file is required"),
    unlockCost: z.coerce.number().min(0, "Cost cannot be negative"),
    validFrom: z.string(),
    validUntil: z.string().optional().or(z.literal("")),
    type: z.enum(["content", "promo", "external"]),
    tags: z.array(z.string()).optional(),
    ctaText: z.string().optional(),
    actionUrl: z.string().optional(),
    accentColor: z.string().optional(),
    fileMetadata: z.object({
        size: z.number(),
        type: z.string(),
        dimensions: z.string().optional(),
    }).nullable().optional(),
});

type DropFormData = z.infer<typeof dropSchema>;

const AVAILABLE_TAGS = ["Sweet", "Spicy", "RAW"];

interface UploadedAsset {
    id: string;
    url: string;
    type: string;
    size: number;
}

interface FilesAndAssetsSectionProps {
    uploadsOpen: boolean;
    onToggle: () => void;
    coverAspectRatio: UploadAspectRatio;
    contentAspectRatio: UploadAspectRatio;
    onCoverAspectRatioChange: (ratio: UploadAspectRatio) => void;
    onContentAspectRatioChange: (ratio: UploadAspectRatio) => void;
    imageUrl: string;
    contentUrl: string;
    contentType?: string;
    onCoverAssetsChange: (assets: UploadedAsset[]) => void;
    onContentAssetsChange: (assets: UploadedAsset[]) => void;
    errors: FieldErrors<DropFormData>;
}

const FilesAndAssetsSection = memo(function FilesAndAssetsSection({
    uploadsOpen,
    onToggle,
    coverAspectRatio,
    contentAspectRatio,
    onCoverAspectRatioChange,
    onContentAspectRatioChange,
    imageUrl,
    contentUrl,
    contentType,
    onCoverAssetsChange,
    onContentAssetsChange,
    errors,
}: FilesAndAssetsSectionProps) {
    return (
        <div className="glass-panel rounded-3xl overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4"
            >
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <ImageIcon className="w-4 h-4 text-brand-purple" />
                    <FileAudio className="w-4 h-4 text-brand-purple" />
                    Files & Assets
                </div>
                {uploadsOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {uploadsOpen ? (
                <div className="p-4 pt-0 border-t border-white/5 space-y-3">
                    <AssetUploader
                        label="Cover"
                        folder="drops/images"
                        accept=".jpg,.jpeg,.png,.webp,.heic,.gif,.mp4,image/*,video/mp4"
                        helperText="Supports JPG, PNG, WEBP, HEIC, GIF, MP4"
                        aspectRatio={coverAspectRatio}
                        onAspectRatioChange={onCoverAspectRatioChange}
                        initialUrl={imageUrl}
                        onChange={onCoverAssetsChange}
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
                        initialUrl={contentUrl}
                        initialType={contentType}
                        onChange={onContentAssetsChange}
                        disableCrop={true}
                    />
                    {errors.contentUrl && <p className="text-red-400 text-xs">{errors.contentUrl.message}</p>}
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
}

export function CreateDropModal({ isOpen, onClose, dropId, duplicateFromId, onSuccess }: CreateDropModalProps) {
    const isEditMode = !!dropId;
    const [fetching, setFetching] = useState(isEditMode);

    const [uploadsOpen, setUploadsOpen] = useState(true);
    const [coverAspectRatio, setCoverAspectRatio] = useState<UploadAspectRatio>("1:1");
    const [contentAspectRatio, setContentAspectRatio] = useState<UploadAspectRatio>("1:1");

    const {
        register,
        handleSubmit,
        setValue,
        control,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<DropFormData>({
        resolver: zodResolver(dropSchema) as any,
        defaultValues: {
            title: "",
            description: "",
            imageUrl: "",
            contentUrl: "",
            contentUrls: [],
            unlockCost: 100,
            type: "content",
            tags: [],
            accentColor: "#ec4899",
            ctaText: "",
            actionUrl: "",
            fileMetadata: null,
            ...getDefaultCSTDates()
        }
    });

    const dropType = useWatch({ control, name: "type" });
    const watchedTags = useWatch({ control, name: "tags" });
    const currentTags = useMemo(() => watchedTags || [], [watchedTags]);
    const imageUrl = useWatch({ control, name: "imageUrl" }) || "";
    const contentUrl = useWatch({ control, name: "contentUrl" }) || "";
    const fileMetadata = useWatch({ control, name: "fileMetadata" });

    useEffect(() => {
        if (!isOpen) {
            reset({
                title: "",
                description: "",
                imageUrl: "",
                contentUrl: "",
                contentUrls: [],
                unlockCost: 100,
                type: "content",
                tags: [],
                accentColor: "#ec4899",
                ctaText: "",
                actionUrl: "",
                fileMetadata: null,
                ...getDefaultCSTDates()
            });
            return;
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
                    const data = docSnap.data() as Drop;
                    setValue("title", data.title + (duplicateFromId ? " (Copy)" : ""));
                    setValue("description", data.description);
                    setValue("imageUrl", data.imageUrl);
                    setValue("contentUrl", data.contentUrl || "");
                    setValue("contentUrls", data.contentUrls || (data.contentUrl ? [data.contentUrl] : []));
                    setValue("unlockCost", data.unlockCost);

                    if (dropId) {
                        setValue("validFrom", toCSTString(data.validFrom));
                        if (data.validUntil) {
                            setValue("validUntil", toCSTString(data.validUntil));
                        }
                    } else {
                        // Inherit current time for duplication
                        const defaults = getDefaultCSTDates();
                        setValue("validFrom", defaults.validFrom);
                        setValue("validUntil", defaults.validUntil);
                    }

                    setValue("type", data.type || "content");
                    setValue("tags", data.tags || []);
                    setValue("ctaText", data.ctaText || "");
                    setValue("actionUrl", data.actionUrl || "");
                    setValue("accentColor", data.accentColor || "#ec4899");
                    setValue("fileMetadata", data.fileMetadata || null);
                } else {
                    toast.error("Drop not found!");
                    onClose();
                }
            } catch (err) {
                console.error("Error fetching drop:", err);
            } finally {
                setFetching(false);
            }
        }

        fetchDrop();
    }, [isOpen, dropId, duplicateFromId, reset, setValue, onClose]);

    const handleCoverAssetsChange = useCallback((assets: UploadedAsset[]) => {
        const primary = assets[0];
        setValue("imageUrl", primary?.url || "", { shouldValidate: true });
    }, [setValue]);

    const handleContentAssetsChange = useCallback((assets: UploadedAsset[]) => {
        const urls = assets.map(a => a.url);
        setValue("contentUrl", urls[0] || "", { shouldValidate: true });
        setValue("contentUrls", urls, { shouldValidate: true });

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

    const handleToggleUploads = useCallback(() => {
        setUploadsOpen((prev) => !prev);
    }, []);

    const toggleTag = useCallback((tag: string) => {
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        setValue("tags", newTags);
    }, [currentTags, setValue]);

    const onSubmit: SubmitHandler<DropFormData> = async (data) => {
        try {
            const validFrom = fromCSTInput(data.validFrom);
            let validUntil: number | null = null;

            if (data.validUntil) {
                validUntil = fromCSTInput(data.validUntil);
                if (validFrom >= validUntil) {
                    toast.error("End date must be after start date");
                    return;
                }
            }

            const now = Date.now();
            const status = now < validFrom ? "scheduled" : validUntil && now >= validUntil ? "expired" : "active";

            const dropData: Record<string, unknown> = {
                title: data.title,
                description: data.description,
                imageUrl: data.imageUrl,
                contentUrl: data.contentUrl,
                contentUrls: data.contentUrls,
                unlockCost: data.unlockCost,
                validFrom,
                validUntil,
                status,
                type: data.type,
                tags: data.tags,
                ctaText: data.ctaText,
                actionUrl: data.actionUrl,
                accentColor: data.accentColor,
                fileMetadata: data.fileMetadata,
            };

            if (isEditMode) {
                const response = await authFetch("/api/admin/drops", {
                    method: "PUT",
                    body: JSON.stringify({ dropId, dropData }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                toast.success("Drop updated successfully");
            } else {
                const response = await authFetch("/api/admin/drops", {
                    method: "POST",
                    body: JSON.stringify({
                        dropData: {
                            ...dropData,
                            totalUnlocks: 0,
                        },
                    }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                toast.success("Drop created successfully");
            }

            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save drop.";
            console.error("Error saving drop:", error);
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <Dialog.Content
                        className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden relative max-h-[90vh] flex flex-col shadow-2xl focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
                        aria-describedby={undefined}
                    >
                        <header className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/50 sticky top-0 z-10 backdrop-blur-md">
                            <Dialog.Title className="text-xl font-bold text-white shrink-0">
                                {isEditMode ? "Edit Drop" : "Create Drop"}
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

                        <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
                            {fetching ? (
                                <div className="flex items-center justify-center min-h-[300px]">
                                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                                </div>
                            ) : (
                                <form id="create-drop-form" onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
                                    <div className="glass-panel p-4 rounded-3xl space-y-4 shadow-lg border-white/5 bg-white/[0.02]">
                                        <div>
                                            <input
                                                {...register("title")}
                                                type="text"
                                                placeholder="Drop Title"
                                                className="w-full bg-transparent border-none p-0 text-xl font-bold text-white placeholder:text-gray-600 focus:ring-0"
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

                                        <div className="flex flex-col gap-3">
                                            <select
                                                {...register("type")}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-purple/50"
                                            >
                                                <option value="content">Content Drop</option>
                                                <option value="promo">Promo / Ad</option>
                                                <option value="external">External Link</option>
                                            </select>

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

                                    <FilesAndAssetsSection
                                        uploadsOpen={uploadsOpen}
                                        onToggle={handleToggleUploads}
                                        coverAspectRatio={coverAspectRatio}
                                        contentAspectRatio={contentAspectRatio}
                                        onCoverAspectRatioChange={setCoverAspectRatio}
                                        onContentAspectRatioChange={setContentAspectRatio}
                                        imageUrl={imageUrl}
                                        contentUrl={contentUrl}
                                        contentType={fileMetadata?.type}
                                        onCoverAssetsChange={handleCoverAssetsChange}
                                        onContentAssetsChange={handleContentAssetsChange}
                                        errors={errors}
                                    />

                                    <div className="glass-panel p-4 rounded-3xl space-y-3 shadow-lg border-white/5 bg-white/[0.02]">
                                        <h3 className="text-sm font-bold text-white">Pricing & Schedule</h3>

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
                                            <p className="text-[11px] text-gray-500">Minimum 0 Drops</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
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
                                    </div>

                                    {dropType !== "content" && (
                                        <div className="glass-panel p-4 rounded-3xl space-y-3 animate-in fade-in zoom-in-95 shadow-lg border-white/5 bg-white/[0.02]">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase">Action Settings</h3>
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
                                                    <label className="text-xs text-gray-400 mb-1 block">URL</label>
                                                    <input
                                                        {...register("actionUrl")}
                                                        type="url"
                                                        placeholder="https://..."
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-purple/50 shadow-inner"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>

                        <div className="p-4 md:p-6 border-t border-white/10 shrink-0 bg-black/50 backdrop-blur-md">
                            <button
                                type="submit"
                                form="create-drop-form"
                                disabled={isSubmitting || fetching}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-purple to-[#d946ef] font-bold text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {isSubmitting ? "Saving..." : isEditMode ? "Update Drop" : "Create Drop"}
                            </button>
                        </div>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

