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

function DropForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dropId = searchParams.get("id");
    const isEditMode = !!dropId;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditMode);

    // Default valid dates (starts now, ends in 7 days)
    const defaultStart = new Date();
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 7);

    const formatForInput = (date: Date) => date.toISOString().slice(0, 16);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        imageUrl: "",
        contentUrl: "",
        unlockCost: 100,
        validFrom: formatForInput(defaultStart),
        validUntil: formatForInput(defaultEnd),
        // New Fields
        type: "content",
        ctaText: "",
        actionUrl: "",
        accentColor: "#ec4899",
        fileMetadata: null as { size: number, type: string } | null
    });

    useEffect(() => {
        if (!dropId) return;

        async function fetchDrop() {
            try {
                const docRef = doc(db, "drops", dropId!);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as Drop;
                    setFormData({
                        title: data.title,
                        description: data.description,
                        imageUrl: data.imageUrl,
                        contentUrl: data.contentUrl,
                        unlockCost: data.unlockCost,
                        validFrom: formatForInput(new Date(data.validFrom)),
                        validUntil: formatForInput(new Date(data.validUntil)),
                        type: data.type || "content",
                        ctaText: data.ctaText || "",
                        actionUrl: data.actionUrl || "",
                        accentColor: data.accentColor || "#ec4899",
                        fileMetadata: data.fileMetadata || null
                    });
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
    }, [dropId, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUploadComplete = (field: "imageUrl" | "contentUrl") => (url: string, metadata?: { size: number, type: string }) => {
        setFormData(prev => {
            const updates: any = { [field]: url };
            if (field === "contentUrl" && metadata) {
                updates.fileMetadata = metadata;
            }
            return { ...prev, ...updates };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Convert datetime-local strings to timestamps
            const validFrom = new Date(formData.validFrom).getTime();
            const validUntil = new Date(formData.validUntil).getTime();

            if (isNaN(validFrom) || isNaN(validUntil)) {
                throw new Error("Invalid dates");
            }

            const dropData = {
                title: formData.title,
                description: formData.description,
                imageUrl: formData.imageUrl,
                contentUrl: formData.contentUrl,
                unlockCost: Number(formData.unlockCost),
                validFrom,
                validUntil,
                status: (Date.now() < validUntil) ? "active" : "expired",
                // Dynamic Fields
                type: formData.type as any,
                ctaText: formData.ctaText,
                actionUrl: formData.actionUrl,
                accentColor: formData.accentColor,
                fileMetadata: formData.fileMetadata,
            };

            if (isEditMode) {
                await updateDoc(doc(db, "drops", dropId!), dropData);
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
        } finally {
            setLoading(false);
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

            <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-3xl space-y-6">

                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                        <Type className="w-4 h-4" /> Drop Title
                    </label>
                    <input
                        type="text"
                        name="title"
                        required
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="e.g. Neon Lollipops Pack"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-pink/50 focus:ring-1 focus:ring-brand-pink/50 transition-all"
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-300">Description</label>
                    <textarea
                        name="description"
                        required
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe what's inside..."
                        rows={3}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-pink/50 focus:ring-1 focus:ring-brand-pink/50 transition-all resize-none"
                    />
                </div>

                {/* File Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Drop Type & Dynamic Fields */}
                    <div className="col-span-full space-y-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Drop Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-pink/50 transition-all"
                            >
                                <option value="content">Content Drop (Standard)</option>
                                <option value="promo">Promo / Ad</option>
                                <option value="external">External Link</option>
                            </select>
                        </div>

                        {formData.type !== 'content' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-300">Call to Action (Button)</label>
                                    <input
                                        type="text"
                                        name="ctaText"
                                        value={formData.ctaText}
                                        onChange={handleChange}
                                        placeholder="e.g. Visit Shop"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-pink/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-300">Action URL</label>
                                    <input
                                        type="url"
                                        name="actionUrl"
                                        value={formData.actionUrl}
                                        onChange={handleChange}
                                        placeholder="https://..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-pink/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2 col-span-full">
                                    <label className="text-sm font-bold text-gray-300">Accent Color</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            name="accentColor"
                                            value={formData.accentColor}
                                            onChange={handleChange}
                                            className="h-12 w-12 rounded-lg cursor-pointer bg-transparent border-none"
                                        />
                                        <input
                                            type="text"
                                            name="accentColor"
                                            value={formData.accentColor}
                                            onChange={handleChange}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <FileUpload
                        label="Drop Image (Cover)"
                        folder="drops/images"
                        accept="image/*"
                        helperText="Recommend 1:1 aspect ratio"
                        initialUrl={formData.imageUrl}
                        onUploadComplete={handleUploadComplete("imageUrl")}
                    />

                    <FileUpload
                        label="Content (The Drop)"
                        folder="drops/content"
                        helperText="Zip, Audio, Video, etc."
                        initialUrl={formData.contentUrl}
                        onUploadComplete={handleUploadComplete("contentUrl")}
                    />
                </div>

                {/* Hidden inputs to ensure required validation works if users type manually instead of upload, 
                    though FileUpload updates state. We can also add validation logic. */}
                <input type="hidden" name="imageUrl" required value={formData.imageUrl} />
                <input type="hidden" name="contentUrl" required value={formData.contentUrl} />


                {/* Cost & Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Cost (Drops)
                        </label>
                        <input
                            type="number"
                            name="unlockCost"
                            required
                            min="0"
                            value={formData.unlockCost}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-yellow/50 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Valid From
                        </label>
                        <input
                            type="datetime-local"
                            name="validFrom"
                            required
                            value={formData.validFrom}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-cyan/50 transition-all [color-scheme:dark]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Valid Until
                        </label>
                        <input
                            type="datetime-local"
                            name="validUntil"
                            required
                            value={formData.validUntil}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-cyan/50 transition-all [color-scheme:dark]"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-pink to-brand-purple font-bold text-white shadow-lg shadow-brand-pink/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {loading ? "Saving Drop..." : isEditMode ? "Update Drop" : "Create Drop"}
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
