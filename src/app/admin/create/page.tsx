"use client";

import { useState, useEffect, Suspense } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Save, Calendar, DollarSign, ArrowLeft, ImageIcon, FileAudio, ChevronDown, ChevronUp } from "lucide-react";

import { AssetUploader, UploadAspectRatio } from "@/components/Admin/AssetUploader";
import Link from "next/link";
import { Drop } from "@/types/db";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import { getDefaultCSTDates, toCSTString, fromCSTInput } from "@/lib/timezone";

const dropSchema = z.object({
    title: z.string().min(3, "Title is too short"),
    description: z.string().min(10, "Description is too short"),
    imageUrl: z.string().url("Cover image is required"),
    contentUrl: z.string().url("Content file is required"),
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
    rotationEnabled: z.boolean().optional(),
    rotationIntervalDays: z.coerce.number().min(1).optional(),
    rotationMaxRotations: z.coerce.number().min(1).optional().or(z.literal("")).transform(v => v === "" ? undefined : v),
});

type DropFormData = z.infer<typeof dropSchema>;

const AVAILABLE_TAGS = ["Sweet", "Spicy", "RAW"];

interface UploadedAsset {
    id: string;
    url: string;
    type: string;
    size: number;
}

function DropForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dropId = searchParams.get("id");
    const isEditMode = !!dropId;
    const [fetching, setFetching] = useState(isEditMode);

    const [uploadsOpen, setUploadsOpen] = useState(true);
    const [coverAspectRatio, setCoverAspectRatio] = useState<UploadAspectRatio>("1:1");
    const [contentAspectRatio, setContentAspectRatio] = useState<UploadAspectRatio>("1:1");

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<DropFormData>({
        resolver: zodResolver(dropSchema) as any,
        defaultValues: {
            title: "",
            description: "",
            imageUrl: "",
            contentUrl: "",
            unlockCost: 100,
            type: "content",
            tags: [],
            accentColor: "#ec4899",
            ctaText: "",
            actionUrl: "",
            fileMetadata: null,
            rotationEnabled: false,
            rotationIntervalDays: 7,
            rotationMaxRotations: undefined,
            ...getDefaultCSTDates()
        }
    });

    const dropType = watch("type");
    const currentTags = watch("tags") || [];
    const rotationEnabled = watch("rotationEnabled");

    useEffect(() => {
        if (!dropId) return;

        async function fetchDrop() {
            const targetDropId = dropId;
            if (!targetDropId) return;
            try {
                const docRef = doc(db, "drops", targetDropId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as Drop;
                    setValue("title", data.title);
                    setValue("description", data.description);
                    setValue("imageUrl", data.imageUrl);
                    setValue("contentUrl", data.contentUrl);
                    setValue("unlockCost", data.unlockCost);
                    setValue("validFrom", toCSTString(data.validFrom));
                    if (data.validUntil) {
                        setValue("validUntil", toCSTString(data.validUntil));
                    }
                    if (data.rotationConfig) {
                        setValue("rotationEnabled", data.rotationConfig.enabled);
                        setValue("rotationIntervalDays", data.rotationConfig.intervalDays);
                        if (data.rotationConfig.maxRotations) {
                            setValue("rotationMaxRotations", data.rotationConfig.maxRotations);
                        }
                    }
                    setValue("type", data.type || "content");
                    setValue("tags", data.tags || []);
                    setValue("ctaText", data.ctaText || "");
                    setValue("actionUrl", data.actionUrl || "");
                    setValue("accentColor", data.accentColor || "#ec4899");
                    setValue("fileMetadata", data.fileMetadata || null);
                } else {
                    alert("Drop not found!");
                    router.push("/admin/drops");
                }
            } catch (err) {
                console.error("Error fetching drop:", err);
            } finally {
                setFetching(false);
            }
        }

        fetchDrop();
    }, [dropId, router, setValue]);

    const handleCoverAssetsChange = (assets: UploadedAsset[]) => {
        const primary = assets[0];
        setValue("imageUrl", primary?.url || "", { shouldValidate: true });
    };

    const handleContentAssetsChange = (assets: UploadedAsset[]) => {
        const primary = assets[0];
        setValue("contentUrl", primary?.url || "", { shouldValidate: true });

        if (primary) {
            setValue("fileMetadata", {
                size: primary.size,
                type: primary.type,
                dimensions: contentAspectRatio,
            }, { shouldValidate: true });
        } else {
            setValue("fileMetadata", null, { shouldValidate: false });
        }
    };

    const toggleTag = (tag: string) => {
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        setValue("tags", newTags);
    };

    const onSubmit: SubmitHandler<DropFormData> = async (data) => {
        try {
            const validFrom = fromCSTInput(data.validFrom);
            let validUntil: number | null = null;

            if (data.validUntil) {
                validUntil = fromCSTInput(data.validUntil);
                if (validFrom >= validUntil) {
                    alert("End date must be after start date");
                    return;
                }
            }

            const now = Date.now();
            const status = now < validFrom ? "scheduled" : validUntil && now >= validUntil ? "expired" : "active";

            const rotationConfig = data.rotationEnabled ? {
                enabled: true,
                intervalDays: data.rotationIntervalDays || 7,
                maxRotations: data.rotationMaxRotations || undefined,
                rotationCount: 0,
            } : undefined;

            const dropData: Record<string, unknown> = {
                title: data.title,
                description: data.description,
                imageUrl: data.imageUrl,
                contentUrl: data.contentUrl,
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

            if (rotationConfig) {
                dropData.rotationConfig = rotationConfig;
            }

            if (isEditMode) {
                const response = await authFetch("/api/admin/drops", {
                    method: "PUT",
                    body: JSON.stringify({ dropId, dropData }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
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
            }

            router.refresh();
            router.push("/admin/drops");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save drop.";
            console.error("Error saving drop:", error);
            alert(message);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto pb-32">
            <header className="mb-4 pt-3">
                <Link href="/admin/drops" className="inline-flex items-center gap-2 text-gray-400 mb-2 text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back to Drops
                </Link>
                <h1 className="text-2xl font-bold text-white">{isEditMode ? "Edit Drop" : "Create Drop"}</h1>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="glass-panel p-4 rounded-3xl space-y-4">
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
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:bg-white/10 transition-all resize-none"
                        />
                        {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
                    </div>

                    <div className="flex flex-col gap-3">
                        <select
                            {...register("type")}
                            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:bg-white/10"
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
                                            ? "bg-brand-pink text-white border-brand-pink"
                                            : "bg-white/5 text-gray-500 border-white/5"
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-3xl overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setUploadsOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between p-4"
                    >
                        <div className="flex items-center gap-2 font-bold text-white text-sm">
                            <ImageIcon className="w-4 h-4 text-brand-cyan" />
                            <FileAudio className="w-4 h-4 text-brand-pink" />
                            Files & Assets
                        </div>
                        {uploadsOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </button>

                    {uploadsOpen && (
                        <div className="p-4 pt-0 border-t border-white/5 space-y-3">
                            <AssetUploader
                                label="Cover"
                                folder="drops/images"
                                accept=".jpg,.jpeg,.png,.webp,.heic,.gif,.mp4,image/*,video/mp4"
                                helperText="Supports JPG, PNG, WEBP, HEIC, GIF, MP4"
                                aspectRatio={coverAspectRatio}
                                onAspectRatioChange={setCoverAspectRatio}
                                initialUrl={watch("imageUrl")}
                                onChange={handleCoverAssetsChange}
                            />
                            {errors.imageUrl && <p className="text-red-400 text-xs">{errors.imageUrl.message}</p>}

                            <AssetUploader
                                label="Content"
                                folder="drops/content"
                                multiple
                                accept=".jpg,.jpeg,.png,.webp,.heic,.gif,.mp4,.zip,image/*,video/mp4,application/zip,application/x-zip-compressed"
                                helperText="Upload one or more media/zip assets"
                                aspectRatio={contentAspectRatio}
                                onAspectRatioChange={setContentAspectRatio}
                                initialUrl={watch("contentUrl")}
                                initialType={watch("fileMetadata")?.type}
                                onChange={handleContentAssetsChange}
                            />
                            {errors.contentUrl && <p className="text-red-400 text-xs">{errors.contentUrl.message}</p>}
                        </div>
                    )}
                </div>

                <div className="glass-panel p-4 rounded-3xl space-y-3">
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
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-base focus:outline-none focus:border-brand-purple/50"
                        />
                        <p className="text-[11px] text-gray-500">Minimum 0 Drops</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 flex items-center gap-1 uppercase">
                                <Calendar className="w-3 h-3" /> Start (CST)
                            </label>
                            <input
                                {...register("validFrom")}
                                type="datetime-local"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-cyan/50 [color-scheme:dark]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 flex items-center gap-1 uppercase">
                                <Calendar className="w-3 h-3" /> End (CST)
                            </label>
                            <input
                                {...register("validUntil")}
                                type="datetime-local"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-cyan/50 [color-scheme:dark]"
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-4 rounded-3xl space-y-3">
                    <h3 className="text-sm font-bold text-white">Auto-Rotate</h3>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            {...register("rotationEnabled")}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-pink focus:ring-brand-pink/50"
                        />
                        <span className="text-xs font-bold text-gray-500 uppercase">Auto-Rotate Schedule</span>
                    </label>

                    {rotationEnabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 block">Gap Between Cycles (days)</label>
                                <input
                                    {...register("rotationIntervalDays")}
                                    type="number"
                                    min="1"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-purple/50"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 block">Max rotations</label>
                                <input
                                    {...register("rotationMaxRotations")}
                                    type="number"
                                    min="1"
                                    placeholder="∞"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-purple/50 placeholder:text-gray-600"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {dropType !== "content" && (
                    <div className="glass-panel p-4 rounded-3xl space-y-3 animate-in fade-in zoom-in-95">
                        <h3 className="text-xs font-bold text-gray-500 uppercase">Action Settings</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Button Text</label>
                                <input
                                    {...register("ctaText")}
                                    type="text"
                                    placeholder="Visit Shop"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-pink/50"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">URL</label>
                                <input
                                    {...register("actionUrl")}
                                    type="url"
                                    placeholder="https://..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-pink/50"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="sticky bottom-[calc(68px+env(safe-area-inset-bottom))] z-10">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-pink to-brand-purple font-bold text-white shadow-lg shadow-brand-pink/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {isSubmitting ? "Saving..." : isEditMode ? "Update Drop" : "Create Drop"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function CreateDropPage() {
    return (
        <Suspense fallback={<div className="text-white p-8">Loading...</div>}>
            <DropForm />
        </Suspense>
    );
}
