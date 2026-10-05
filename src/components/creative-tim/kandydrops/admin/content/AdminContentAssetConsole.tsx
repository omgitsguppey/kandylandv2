"use client";

import Image from "next/image";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useMemo, useState, type ChangeEvent } from "react";
import {
    Copy,
    ExternalLink,
    FileIcon,
    ImageIcon,
    Loader2,
    RefreshCw,
    Trash2,
    Upload,
    Video,
} from "lucide-react";

export type AdminContentAsset = {
    id: string;
    name: string;
    displayPath?: string;
    url?: string | null;
    size?: number;
    contentType?: string;
    timeCreated?: string;
};

type FileCategory = "All" | "Covers" | "Images" | "Videos" | "Documents";

type AdminContentAssetConsoleProps = {
    files: AdminContentAsset[];
    loading: boolean;
    uploading: boolean;
    error: string | null;
    isFixture: boolean;
    onRefresh: () => void;
    onUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
    onDelete: (fileId: string) => void | Promise<void>;
    onCopyUrl: (url: string) => void | Promise<void>;
};

const FILE_CATEGORIES: FileCategory[] = ["All", "Covers", "Images", "Videos", "Documents"];

function formatBytes(bytes?: number, decimals = 1) {
    if (bytes === undefined || bytes === null || bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const index = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, index)).toFixed(dm)) + " " + sizes[index];
}

function truncatePath(path: string, maxLength = 35) {
    if (path.length <= maxLength) return path;
    const parts = path.split("/");
    if (parts.length > 2) {
        return parts[0] + "/.../" + parts[parts.length - 1];
    }
    return path.substring(0, maxLength / 2) + "..." + path.substring(path.length - maxLength / 2);
}

function classifyFile(file: AdminContentAsset): FileCategory {
    const name = file.name.toLowerCase();
    if (name.includes("cover") || name.includes("thumb") || name.includes("preview") || name.includes("header")) return "Covers";
    const extension = name.split(".").pop() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) return "Images";
    if (["mp4", "mov", "webm", "ogg", "m4v"].includes(extension)) return "Videos";
    return "Documents";
}

function isImagePreview(file: AdminContentAsset, previewUrl: string) {
    return Boolean(previewUrl) && ["jpg", "jpeg", "png", "webp", "gif"].some((extension) => file.name.toLowerCase().endsWith(extension));
}

function isVideoPreview(file: AdminContentAsset, previewUrl: string) {
    return Boolean(previewUrl) && ["mp4", "webm", "ogg", "mov"].some((extension) => file.name.toLowerCase().endsWith(extension));
}

function AssetIcon({ filename }: { filename: string }) {
    const extension = filename.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
        return <ImageIcon className="h-6 w-6 text-brand-purple/70" aria-hidden="true" />;
    }
    if (["mp4", "mov", "webm"].includes(extension || "")) {
        return <Video className="h-6 w-6 text-brand-purple/70" aria-hidden="true" />;
    }
    return <FileIcon className="h-6 w-6 text-gray-500" aria-hidden="true" />;
}

function AssetPreview({ file, previewUrl }: { file: AdminContentAsset; previewUrl: string }) {
    return (
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-lg shadow-black/20">
            {isImagePreview(file, previewUrl) ? (
                <Image src={previewUrl} alt={file.name} fill sizes="80px" className="object-cover bg-black" />
            ) : isVideoPreview(file, previewUrl) ? (
                <video src={previewUrl} className="h-full w-full object-cover bg-black" muted loop playsInline />
            ) : (
                <AssetIcon filename={file.name} />
            )}
        </div>
    );
}

function EmptyAssetState({
    message,
    description,
}: {
    message: string;
    description?: string;
}) {
    return (
        <div className="flex min-h-64 flex-col items-center justify-center border-y border-dashed border-white/15 bg-black/15 px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-500">
                <FileIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-bold text-white">{message}</p>
            {description ? <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p> : null}
        </div>
    );
}

export function AdminContentAssetConsole({
    files,
    loading,
    uploading,
    error,
    isFixture,
    onRefresh,
    onUpload,
    onDelete,
    onCopyUrl,
}: AdminContentAssetConsoleProps) {
    const [activeTab, setActiveTab] = useState<FileCategory>("All");
    const categoryCounts = useMemo(
        () => FILE_CATEGORIES.reduce<Record<FileCategory, number>>((counts, category) => {
            counts[category] = category === "All"
                ? files.length
                : files.filter((file) => classifyFile(file) === category).length;
            return counts;
        }, {
            All: 0,
            Covers: 0,
            Images: 0,
            Videos: 0,
            Documents: 0,
        }),
        [files],
    );
    const filteredFiles = useMemo(
        () => files.filter((file) => activeTab === "All" || classifyFile(file) === activeTab),
        [activeTab, files],
    );

    return (
        <section className="min-w-0 space-y-4" aria-label="Content operations" data-admin-content-surface="operations-canvas">
            <AdminPageHeader compact eyebrow="Content operations" title="Ingest and inspection canvas"
                subtitle="Stage assets, inspect the existing storage record, and keep protected actions attached to their verified source."
                actions={(
                <div className="flex flex-wrap items-center gap-2" aria-label="Content operations">
                    <Button variant="outline"
                        type="button"
                        onClick={onRefresh}
                        className="gap-2"
                    >
                        <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} aria-hidden="true" />
                        Refresh source
                    </Button>
                    <label className={"inline-flex min-h-11 items-center gap-2 rounded-2xl border px-3 text-xs font-bold transition-colors " + (isFixture || uploading ? "cursor-not-allowed border-white/10 bg-white/[0.04] text-gray-500" : "cursor-pointer border-kandy-lilac/35 bg-kandy-lilac/12 text-kandy-lilac hover:bg-kandy-lilac/20")}>
                        <input
                            type="file"
                            onChange={onUpload}
                            className="sr-only"
                            disabled={uploading || isFixture}
                            aria-label="Upload content file"
                        />
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                        {isFixture ? "Upload needs admin" : uploading ? "Ingesting file" : "Ingest file"}
                    </label>
                </div>
                )}
            />

            <div className="relative grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
                <aside className="space-y-4">
                    <section className="border-l-2 border-kandy-lilac/45 bg-black/20 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-kandy-lilac/75">Source posture</p>
                        <dl className="mt-4 space-y-3">
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                                <dt className="text-xs text-gray-400">Storage source</dt>
                                <dd className="text-xs font-black text-white">{isFixture ? "source_missing" : error ? "failed" : loading ? "collecting" : "available"}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                                <dt className="text-xs text-gray-400">Visible records</dt>
                                <dd className="text-sm font-black text-white">{isFixture ? "--" : filteredFiles.length}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-xs text-gray-400">Inspection lens</dt>
                                <dd className="text-xs font-bold text-kandy-lilac">{activeTab}</dd>
                            </div>
                        </dl>
                    </section>

                    {isFixture ? (
                        <div
                            className="border-l-2 border-amber-400/60 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100"
                            data-admin-content-fixture-boundary="true"
                            data-admin-content-source-state="source_missing"
                        >
                            source_missing: storage source is not loaded in this fixture. Protected reads and writes stay blocked until verified admin access provides the source.
                        </div>
                    ) : null}

                    {error ? (
                        <div className="border-l-2 border-red-400/60 bg-red-500/10 px-4 py-3 text-sm text-red-200" data-admin-content-safe-error="true" role="alert">
                            {error}
                        </div>
                    ) : null}

                    <label className="grid gap-2 text-sm font-medium">
                        Inspection category
                        <NativeSelect value={activeTab} onChange={(event) => setActiveTab(event.target.value as FileCategory)} aria-label="Asset inspection category">
                            {FILE_CATEGORIES.map((category) => <NativeSelectOption key={category} value={category}>{category} {isFixture ? "--" : categoryCounts[category]}</NativeSelectOption>)}
                        </NativeSelect>
                    </label>
                </aside>

                <main className="min-w-0 border-y border-white/10 bg-black/15" aria-label="Asset inspection field">
                    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-kandy-lilac/75">Asset inspection</p>
                            <h2 className="mt-1 text-xl font-black tracking-tight text-white">Current storage records</h2>
                        </div>
                        <p className="text-xs text-gray-500">Preview, copy, and protected deletion stay attached to each record.</p>
                    </div>

                    {loading && files.length === 0 ? (
                        <div className="flex min-h-64 flex-col items-center justify-center text-gray-500">
                            <Loader2 className="mb-4 h-8 w-8 animate-spin text-brand-purple" aria-hidden="true" />
                            <p className="text-sm">Loading assets...</p>
                        </div>
                    ) : files.length === 0 ? (
                        <EmptyAssetState message={isFixture ? "Storage source unavailable." : "No drop assets found."} />
                    ) : filteredFiles.length === 0 ? (
                        <EmptyAssetState message={"No files match the " + activeTab + " category."} />
                    ) : (
                        <div className="grid gap-px bg-white/10 sm:grid-cols-2 2xl:grid-cols-3">
                            {filteredFiles.map((file) => {
                                const displayPath = file.displayPath || file.name;
                                const previewUrl = typeof file.url === "string" && file.url.length > 0 ? file.url : "";
                                const category = classifyFile(file);

                                return (
                                    <article key={file.id} className="group flex min-h-56 flex-col bg-[#100a17] p-4 transition-colors hover:bg-[#171020]">
                                        <div className="flex min-w-0 gap-3">
                                            <AssetPreview file={file} previewUrl={previewUrl} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="truncate text-sm font-black text-white" title={file.name}>{file.name}</p>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-kandy-lilac">{category}</span>
                                                </div>
                                                <p className="mt-2 truncate font-mono text-[11px] text-gray-500" title={displayPath}>{truncatePath(displayPath, 50)}</p>
                                                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                                                    {file.size ? <span>{formatBytes(file.size)}</span> : null}
                                                    {file.timeCreated ? <span>{new Date(file.timeCreated).toLocaleDateString()}</span> : null}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                                            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">Protected actions</span>
                                            <div className="flex shrink-0 items-center gap-2" role="group" aria-label={file.name + " actions"}>
                                                <button
                                                    type="button"
                                                    onClick={() => previewUrl ? window.open(previewUrl, "_blank", "noopener,noreferrer") : undefined}
                                                    className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-black/30 text-gray-300 transition-colors hover:border-kandy-lilac/45 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                                    title={previewUrl ? "Open preview" : "Preview unavailable"}
                                                    aria-label={previewUrl ? "Open preview for " + file.name : "Preview unavailable for " + file.name}
                                                    disabled={!previewUrl}
                                                >
                                                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => previewUrl ? void onCopyUrl(previewUrl) : undefined}
                                                    className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-black/30 text-gray-300 transition-colors hover:border-kandy-lilac/45 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                                    title={previewUrl ? "Copy preview link" : "Preview unavailable"}
                                                    aria-label={previewUrl ? "Copy preview link for " + file.name : "Preview unavailable for " + file.name}
                                                    disabled={!previewUrl}
                                                >
                                                    <Copy className="h-4 w-4" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void onDelete(file.id)}
                                                    className="inline-flex h-11 w-11 items-center justify-center border border-red-400/25 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                                                    title={isFixture ? "Delete requires verified admin access" : "Delete file"}
                                                    aria-label={isFixture ? "Delete requires verified admin access" : "Delete " + file.name}
                                                    disabled={isFixture}
                                                >
                                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </section>
    );
}
