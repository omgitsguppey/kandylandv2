"use client";

import { useState, useEffect, Suspense } from "react";
import { collection, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Save, Calendar, DollarSign, ArrowLeft, ChevronDown, ChevronUp, ImageIcon, FileAudio } from "lucide-react";

import { FileUpload } from "@/components/Admin/FileUpload";
import Link from "next/link";
import { Drop } from "@/types/db";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import { getDefaultCSTDates, toCSTString, fromCSTInput } from "@/lib/timezone";


// Validation Schema
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
    // Optional/Dynamic fields
    ctaText: z.string().optional(),
    actionUrl: z.string().optional(),
    accentColor: z.string().optional(),
    fileMetadata: z.object({
        size: z.number(),
        type: z.string()
    }).nullable().optional(),
    // Auto-Rotation
    rotationEnabled: z.boolean().optional(),
    rotationIntervalDays: z.coerce.number().min(1).optional(),
    rotationDurationDays: z.coerce.number().min(1).optional(),
    rotationMaxRotations: z.coerce.number().min(1).optional().or(z.literal("")).transform(v => v === "" ? undefined : v),
});

type DropFormData = z.infer<typeof dropSchema>;

const AVAILABLE_TAGS = ["Sweet", "Spicy", "RAW"];

function DropForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dropId = searchParams.get("id");
    const isEditMode = !!dropId;
    const [fetching, setFetching] = useState(isEditMode);

    // UI State
    const [uploadsOpen, setUploadsOpen] = useState(true);

    // React Hook Form
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
            rotationDurationDays: 3,
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
            try {
                const docRef = doc(db, "drops", dropId!);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as Drop;
                    // Populate form
                    setValue("title", data.title);
                    setValue("description", data.description);
                    setValue("imageUrl", data.imageUrl);
                    setValue("contentUrl", data.contentUrl);
                    setValue("unlockCost", data.unlockCost);
                    setValue("validFrom", toCSTString(data.validFrom));
                    if (data.validUntil) {
                        setValue("validUntil", toCSTString(data.validUntil));
                    }
                    // Load rotation config
                    if (data.rotationConfig) {
                        setValue("rotationEnabled", data.rotationConfig.enabled);
                        setValue("rotationIntervalDays", data.rotationConfig.intervalDays);
                        setValue("rotationDurationDays", data.rotationConfig.durationDays);
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

    const handleUploadComplete = (field: "imageUrl" | "contentUrl") => (url: string, metadata?: { size: number, type: string }) => {
        setValue(field, url, { shouldValidate: true });
        if (field === "contentUrl" && metadata) {
            setValue("fileMetadata", metadata);
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
            // Parse datetime-local inputs as CST → UTC ms
            const validFrom = fromCSTInput(data.validFrom);
            let validUntil: number | undefined = undefined;

            if (data.validUntil) {
                validUntil = fromCSTInput(data.validUntil);
                if (validFrom >= validUntil) {
                    alert("End date must be after start date");
                    return;
                }
            }

            // Determine status based on current time vs CST-parsed dates
            const now = Date.now();
            let status: string;
            if (now < validFrom) {
                status = "scheduled";
            } else if (validUntil && now >= validUntil) {
                status = "expired";
            } else {
                status = "active";
            }

            // Build rotation config if enabled
            const rotationConfig = data.rotationEnabled ? {
                enabled: true,
                intervalDays: data.rotationIntervalDays || 7,
                durationDays: data.rotationDurationDays || 3,
                maxRotations: data.rotationMaxRotations || undefined,
                rotationCount: 0,
            } : undefined;

            const dropData: Record<string, any> = {
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
                    body: JSON.stringify({ dropId: dropId!, dropData }),
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

            router.push("/admin/drops");
        } catch (error: any) {
            console.error("Error saving drop:", error);
            alert(error.message || "Failed to save drop. Check console.");
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
        <div className="max-w-xl mx-auto pb-24">
            <header className="mb-6 pt-4">
                <Link href="/admin/drops" className="inline-flex items-center gap-2 text-gray-400 mb-2 transition-colors text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back to Drops
                </Link>
                <h1 className="text-2xl font-bold text-white">{isEditMode ? "Edit Drop" : "Create Drop"}</h1>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* Main Info - Simplified container */}
                <div className="glass-panel p-5 rounded-3xl space-y-4">
                    {/* Title */}
                    <div>
                        <input
                            {...register("title")}
                            type="text"
                            placeholder="Drop Title"
                            className="w-full bg-transparent border-none p-0 text-xl font-bold text-white placeholder:text-gray-600 focus:ring-0"
                        />
                        {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <textarea
                            {...register("description")}
                            placeholder="Describe what's inside..."
                            rows={3}
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:bg-white/10 transition-all resize-none"
                        />
                        {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
                    </div>

                    {/* Compact Drop Type & Tags Row */}
                    <div className="flex flex-col gap-3">
                        <select
                            {...register("type")}
                            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:bg-white/10 transition-all"
                        >
                            <option value="content">Content Drop</option>
                            <option value="promo">Promo / Ad</option>
                            <option value="external">External Link</option>
                        </select>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_TAGS.map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-xs font-bold border transition-all",
                                        currentTags.includes(tag)
                                            ? "bg-brand-pink text-white border-brand-pink"
                                            : "bg-white/5 text-gray-500 border-white/5 "
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Collapsible Uploads Section */}
                <div className="glass-panel rounded-3xl overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setUploadsOpen(!uploadsOpen)}
                        className="w-full flex items-center justify-between p-5 transition-colors"
                    >
                        <div className="flex items-center gap-2 font-bold text-white text-sm">
                            <div className="flex gap-[-4px]">
                                <ImageIcon className="w-4 h-4 text-brand-cyan" />
                                <FileAudio className="w-4 h-4 text-brand-pink -ml-1" />
                            </div>
                            Files & Assets
                        </div>
                        {uploadsOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </button>

                    {uploadsOpen && (
                        <div className="p-5 pt-0 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1">
                                <FileUpload
                                    label="Cover"
                                    folder="drops/images"
                                    accept="image/*"
                                    helperText="1:1 Ratio"
                                    initialUrl={watch("imageUrl")}
                                    onUploadComplete={handleUploadComplete("imageUrl")}
                                />
                                {errors.imageUrl && <p className="text-red-400 text-xs">{errors.imageUrl.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <FileUpload
                                    label="Content"
                                    folder="drops/content"
                                    helperText="Zip/Media"
                                    initialUrl={watch("contentUrl")}
                                    onUploadComplete={handleUploadComplete("contentUrl")}
                                />
                                {errors.contentUrl && <p className="text-red-400 text-xs">{errors.contentUrl.message}</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Dynamic Fields (Conditional) */}
                {dropType !== 'content' && (
                    <div className="glass-panel p-5 rounded-3xl space-y-4 animate-in fade-in zoom-in-95">
                        <h3 className="text-xs font-bold text-gray-500 uppercase">Action Settings</h3>
                        <div className="grid grid-cols-1 gap-4">
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


                {/* Cost & Schedule - Compact Grid */}
                <div className="glass-panel p-5 rounded-3xl space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 flex items-center gap-1 uppercase">
                            <DollarSign className="w-3 h-3" /> Cost (Drops)
                        </label>
                        <input
                            {...register("unlockCost")}
                            type="number"
                            min="0"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-lg focus:outline-none focus:border-brand-purple/50 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 flex items-center gap-1 uppercase">
                                <Calendar className="w-3 h-3" /> Start (CST)
                            </label>
                            <input
                                {...register("validFrom")}
                                type="datetime-local"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-cyan/50 transition-all [color-scheme:dark]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 flex items-center gap-1 uppercase">
                                <Calendar className="w-3 h-3" /> End (CST)
                            </label>
                            <input
                                {...register("validUntil")}
                                type="datetime-local"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-cyan/50 transition-all [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    {/* Auto-Rotation Config */}
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                {...register("rotationEnabled")}
                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-pink focus:ring-brand-pink/50"
                            />
                            <span className="text-xs font-bold text-gray-500 uppercase transition-colors">
                                Auto-Rotate Schedule
                            </span>
                        </label>

                        {rotationEnabled && (
                            <div className="mt-3 grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 block">Cycle (days)</label>
                                    <input
                                        {...register("rotationIntervalDays")}
                                        type="number"
                                        min="1"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-purple/50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 block">Active (days)</label>
                                    <input
                                        {...register("rotationDurationDays")}
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
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-pink to-brand-purple font-bold text-white shadow-lg shadow-brand-pink/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    {isSubmitting ? "Saving..." : isEditMode ? "Update Drop" : "Create Drop"}
                </button>

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
