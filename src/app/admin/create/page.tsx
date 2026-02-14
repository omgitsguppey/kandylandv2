"use client";

import { useState, useEffect, Suspense } from "react";
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Save, Calendar, DollarSign, Type, ArrowLeft } from "lucide-react";
import { FileUpload } from "@/components/Admin/FileUpload";
import Link from "next/link";
import { Drop } from "@/types/db";
import { format } from "date-fns";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";


// Logic for default dates
const getDefaultDates = () => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    return {
        validFrom: start.toISOString().slice(0, 16),
        validUntil: end.toISOString().slice(0, 16)
    };
};

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
    // Optional/Dynamic fields
    ctaText: z.string().optional(),
    actionUrl: z.string().optional(),
    accentColor: z.string().optional(),
    fileMetadata: z.object({
        size: z.number(),
        type: z.string()
    }).nullable().optional()
});

type DropFormData = z.infer<typeof dropSchema>;

function DropForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dropId = searchParams.get("id");
    const isEditMode = !!dropId;
    const [fetching, setFetching] = useState(isEditMode);

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
            accentColor: "#ec4899",
            ctaText: "",
            actionUrl: "",
            fileMetadata: null,
            ...getDefaultDates()
        }
    });

    const dropType = watch("type");
    const accentColor = watch("accentColor");

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
                    setValue("validFrom", new Date(data.validFrom).toISOString().slice(0, 16));
                    if (data.validUntil) {
                        setValue("validUntil", new Date(data.validUntil).toISOString().slice(0, 16));
                    }
                    setValue("type", data.type || "content");
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

    const onSubmit: SubmitHandler<DropFormData> = async (data) => {
        try {
            const validFrom = new Date(data.validFrom).getTime();
            let validUntil: number | undefined = undefined;

            if (data.validUntil) {
                validUntil = new Date(data.validUntil).getTime();
                if (validFrom >= validUntil) {
                    alert("End date must be after start date");
                    return;
                }
            }


            const dropData = {
                title: data.title,
                description: data.description,
                imageUrl: data.imageUrl,
                contentUrl: data.contentUrl,
                unlockCost: data.unlockCost,
                validFrom,
                validUntil, // Can be undefined
                status: (!validUntil || Date.now() < validUntil) ? "active" : "expired",
                type: data.type,
                ctaText: data.ctaText,
                actionUrl: data.actionUrl,
                accentColor: data.accentColor,
                fileMetadata: data.fileMetadata,
            };

            if (isEditMode) {
                await updateDoc(doc(db, "drops", dropId!), dropData as any);
            } else {
                await addDoc(collection(db, "drops"), {
                    ...dropData,
                    totalUnlocks: 0,
                });
            }

            router.push("/admin/drops");
        } catch (error) {
            console.error("Error saving drop:", error);
            alert("Failed to save drop. Check console.");
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
        <div className="max-w-2xl mx-auto">
            <header className="mb-8">
                <Link href="/admin/drops" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Drops
                </Link>
                <h1 className="text-3xl font-bold text-white mb-2">{isEditMode ? "Edit Drop" : "Create New Drop"}</h1>
                <p className="text-gray-400">
                    {isEditMode ? "Update the details for this content drop." : "Configure a new content drop for your fans."}
                </p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="glass-panel p-8 rounded-3xl space-y-6">

                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                        <Type className="w-4 h-4" /> Drop Title
                    </label>
                    <input
                        {...register("title")}
                        type="text"
                        placeholder="e.g. Neon Lollipops Pack"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-pink/50 focus:ring-1 focus:ring-brand-pink/50 transition-all"
                    />
                    {errors.title && <p className="text-red-400 text-xs">{errors.title.message}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-300">Description</label>
                    <textarea
                        {...register("description")}
                        placeholder="Describe what's inside..."
                        rows={3}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-pink/50 focus:ring-1 focus:ring-brand-pink/50 transition-all resize-none"
                    />
                    {errors.description && <p className="text-red-400 text-xs">{errors.description.message}</p>}
                </div>

                {/* File Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Drop Type & Dynamic Fields */}
                    <div className="col-span-full space-y-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Drop Type</label>
                            <select
                                {...register("type")}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-pink/50 transition-all"
                            >
                                <option value="content">Content Drop (Standard)</option>
                                <option value="promo">Promo / Ad</option>
                                <option value="external">External Link</option>
                            </select>
                        </div>

                        {dropType !== 'content' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-300">Call to Action (Button)</label>
                                    <input
                                        {...register("ctaText")}
                                        type="text"
                                        placeholder="e.g. Visit Shop"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-pink/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-300">Action URL</label>
                                    <input
                                        {...register("actionUrl")}
                                        type="url"
                                        placeholder="https://..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-pink/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2 col-span-full">
                                    <label className="text-sm font-bold text-gray-300">Accent Color</label>
                                    <div className="flex gap-2">
                                        <input
                                            {...register("accentColor")}
                                            type="color"
                                            className="h-12 w-12 rounded-lg cursor-pointer bg-transparent border-none"
                                        />
                                        <input
                                            {...register("accentColor")}
                                            type="text"
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <FileUpload
                            label="Drop Image (Cover)"
                            folder="drops/images"
                            accept="image/*"
                            helperText="Recommend 1:1 aspect ratio"
                            initialUrl={watch("imageUrl")}
                            onUploadComplete={handleUploadComplete("imageUrl")}
                        />
                        {errors.imageUrl && <p className="text-red-400 text-xs">{errors.imageUrl.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <FileUpload
                            label="Content (The Drop)"
                            folder="drops/content"
                            helperText="Zip, Audio, Video, etc."
                            initialUrl={watch("contentUrl")}
                            onUploadComplete={handleUploadComplete("contentUrl")}
                        />
                        {errors.contentUrl && <p className="text-red-400 text-xs">{errors.contentUrl.message}</p>}
                    </div>
                </div>

                {/* Cost & Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Cost (Drops)
                        </label>
                        <input
                            {...register("unlockCost")}
                            type="number"
                            min="0"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-yellow/50 transition-all"
                        />
                        {errors.unlockCost && <p className="text-red-400 text-xs">{errors.unlockCost.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Valid From
                        </label>
                        <input
                            {...register("validFrom")}
                            type="datetime-local"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-cyan/50 transition-all [color-scheme:dark]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Valid Until
                        </label>
                        <input
                            {...register("validUntil")}
                            type="datetime-local"
                            placeholder="Leave empty for permanent"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-cyan/50 transition-all [color-scheme:dark]"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-pink to-brand-purple font-bold text-white shadow-lg shadow-brand-pink/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {isSubmitting ? "Saving Drop..." : isEditMode ? "Update Drop" : "Create Drop"}
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
