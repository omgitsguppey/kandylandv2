"use client";

import { useState, useEffect } from "react";
import { Loader2, Upload, Trash2, Copy, FileIcon, ImageIcon, Video, RefreshCw, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import { toast } from "sonner";

import Image from "next/image";

interface StorageFile {
    id: string;
    name: string;
    displayPath?: string;
    url?: string | null;
    size?: number;
    contentType?: string;
    timeCreated?: string;
}

function formatBytes(bytes?: number, decimals = 1) {
    if (bytes === undefined || bytes === null || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function truncatePath(path: string, maxLength = 35) {
    if (path.length <= maxLength) return path;
    const parts = path.split('/');
    if (parts.length > 2) {
        return `${parts[0]}/.../${parts[parts.length - 1]}`;
    }
    return `${path.substring(0, maxLength / 2)}...${path.substring(path.length - maxLength / 2)}`;
}

type FileCategory = "All" | "Covers" | "Images" | "Videos" | "Documents";

function classifyFile(file: StorageFile): FileCategory {
    const name = file.name.toLowerCase();
    if (name.includes("cover") || name.includes("thumb") || name.includes("preview") || name.includes("header")) return "Covers";
    const ext = name.split('.').pop() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return "Images";
    if (['mp4', 'mov', 'webm', 'ogg', 'm4v'].includes(ext)) return "Videos";
    return "Documents";
}

function getAdminContentSafeErrorMessage(error: unknown, fallback: string) {
    const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
    return safeError.errorKey === "unknown_error" ? fallback : safeError.operatorMessage;
}

export default function ContentManagerPage() {
    const [files, setFiles] = useState<StorageFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<FileCategory>("All");

    useEffect(() => {
        fetchFiles();
    }, [refreshTrigger]);

    const fetchFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await authFetch("/api/admin/content", { cache: "no-store" });
            const payload = await response.json() as { error?: string; files?: StorageFile[] };
            if (!response.ok) {
                throw new Error(payload.error || "Failed to load content files.");
            }

            setFiles(Array.isArray(payload.files) ? payload.files : []);
        } catch (error) {
            reportClientIssue({
                channel: "network",
                message: "Admin content fetch failed",
                error,
                detail: {
                    action: "fetch_files",
                },
                consoleLabel: "[Admin Content] fetch files failed",
            });
            setError(getAdminContentSafeErrorMessage(error, "Failed to load content files."));
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        setError(null);

        try {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append("file", file);

            const response = await authFetch("/api/admin/content", {
                method: "POST",
                body: formData,
            });
            const payload = await response.json() as { error?: string; file?: StorageFile };
            const uploadedFile = payload.file;
            if (!response.ok || !uploadedFile) {
                throw new Error(payload.error || "Upload failed.");
            }

            setFiles((current) => [uploadedFile, ...current.filter((entry) => entry.id !== uploadedFile.id)]);
            toast.success("File uploaded.");
        } catch (error) {
            reportClientIssue({
                channel: "network",
                message: "Admin content upload failed",
                error,
                detail: {
                    action: "upload_file",
                },
                consoleLabel: "[Admin Content] upload failed",
            });
            const message = getAdminContentSafeErrorMessage(error, "Upload failed.");
            setError(message);
            toast.error(message);
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const handleDelete = async (fileId: string) => {
        if (!confirm("Are you sure you want to permanently delete this file?")) return;
        setError(null);
        try {
            const response = await authFetch("/api/admin/content", {
                method: "DELETE",
                body: JSON.stringify({ fileId }),
            });
            const payload = await response.json() as { error?: string };
            if (!response.ok) {
                throw new Error(payload.error || "Delete failed.");
            }

            setFiles((current) => current.filter((file) => file.id !== fileId));
            toast.success("File deleted.");
        } catch (error) {
            reportClientIssue({
                channel: "network",
                message: "Admin content delete failed",
                error,
                detail: {
                    action: "delete_file",
                    fileId,
                },
                consoleLabel: "[Admin Content] delete failed",
            });
            const message = getAdminContentSafeErrorMessage(error, "Delete failed.");
            setError(message);
            toast.error(message);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("URL copied to clipboard.");
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "warn",
                message: "Admin content clipboard copy failed",
                error,
                detail: {
                    action: "copy_asset_url",
                },
                consoleLabel: "[Admin Content] clipboard copy failed",
            });
            const message = getAdminContentSafeErrorMessage(error, "Failed to copy URL.");
            setError(message);
            toast.error(message);
        }
    };

    const getFileIcon = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="w-6 h-6 text-brand-purple/70" />;
        if (['mp4', 'mov', 'webm'].includes(ext || '')) return <Video className="w-6 h-6 text-brand-purple/70" />;
        return <FileIcon className="w-6 h-6 text-gray-500" />;
    };

    const filteredFiles = files.filter(f => activeTab === "All" || classifyFile(f) === activeTab);
    const tabs: FileCategory[] = ["All", "Covers", "Images", "Videos", "Documents"];

    return (
        <div className="space-y-4 md:space-y-5">
            <PageViewEvent eventName="admin_content_viewed" />
            <AdminPageHeader
                eyebrow="Admin Storage"
                title="Content Manager"
                subtitle="Manage Firebase Storage assets."
                compact
                actions={
                    <>
                    <Button variant="ghost" onClick={() => setRefreshTrigger(prev => prev + 1)}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <div className="relative">
                        <input
                            type="file"
                            onChange={handleUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploading}
                        />
                        <Button variant="brand" disabled={uploading}>
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Upload File
                        </Button>
                    </div>
                    </>
                }
            />

            {error ? (
                <div
                    className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
                    data-admin-content-safe-error="true"
                >
                    {error}
                </div>
            ) : null}

            {/* Compact Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {tabs.map((tab) => {
                    const count = tab === "All" ? files.length : files.filter(f => classifyFile(f) === tab).length;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                activeTab === tab
                                    ? "bg-white text-black"
                                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            {tab}
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === tab ? "bg-black/10 text-black" : "bg-black/30 text-gray-300"}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Asset List */}
            <div className="space-y-3">
                {loading && files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Loader2 className="w-8 h-8 text-brand-purple animate-spin mb-4" />
                        <p className="text-sm">Loading assets...</p>
                    </div>
                ) : files.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-gray-500">
                        No files found in &apos;drops&apos; folder.
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-gray-500">
                        No files match the {activeTab} category.
                    </div>
                ) : (
                    filteredFiles.map((file) => {
                        const displayPath = file.displayPath || file.name;
                        const previewUrl = typeof file.url === "string" && file.url.length > 0 ? file.url : "";
                        const isImagePreview = Boolean(previewUrl) && ['jpg', 'jpeg', 'png', 'webp', 'gif'].some(ext => file.name.toLowerCase().endsWith(ext));
                        const isVideoPreview = Boolean(previewUrl) && ['mp4', 'webm', 'ogg', 'mov'].some(ext => file.name.toLowerCase().endsWith(ext));

                        return (
                        <div key={file.id} className="group relative flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 rounded-2xl border border-white/10 bg-black/35 p-3 md:p-4 transition-all hover:border-white/20 hover:bg-white/[0.03]">
                            
                            <div className="flex items-start gap-3 w-full sm:w-auto overflow-hidden">
                                <div className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl bg-black/50 overflow-hidden flex items-center justify-center border border-white/5 relative">
                                    {isImagePreview ? (
                                        <Image src={previewUrl} alt={file.name} fill sizes="(max-width: 768px) 64px, 80px" className="object-cover bg-black" />
                                    ) : isVideoPreview ? (
                                        <video src={previewUrl} className="w-full h-full object-cover bg-black" muted loop playsInline />
                                    ) : (
                                        getFileIcon(file.name)
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 sm:hidden">
                                    {/* Mobile layout title/metadata */}
                                    <div className="font-semibold text-sm text-white truncate w-full" title={file.name}>{file.name}</div>
                                    <div className="mt-1 text-[11px] text-gray-500 font-mono truncate" title={displayPath}>{truncatePath(displayPath, 35)}</div>
                                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-400">
                                        {file.size ? <span className="bg-white/5 px-1.5 py-0.5 rounded uppercase">{formatBytes(file.size)}</span> : null}
                                        {file.timeCreated ? <span>{new Date(file.timeCreated).toLocaleDateString()}</span> : null}
                                    </div>
                                </div>
                            </div>

                            <div className="hidden sm:block min-w-0 flex-1">
                                {/* Desktop layout title/metadata */}
                                <div className="font-semibold text-sm text-white truncate max-w-lg" title={file.name}>{file.name}</div>
                                <div className="mt-1 text-[11px] text-gray-500 font-mono truncate max-w-lg" title={displayPath}>{truncatePath(displayPath, 50)}</div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                    {file.size ? <span className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">{formatBytes(file.size)}</span> : null}
                                    {file.timeCreated ? <span>{new Date(file.timeCreated).toLocaleDateString()}</span> : null}
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 sm:shrink-0 pt-2 sm:pt-0 border-t border-white/5 sm:border-0 mt-1 sm:mt-0 justify-between sm:justify-end w-full sm:w-auto">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => previewUrl ? window.open(previewUrl, '_blank', 'noopener,noreferrer') : undefined}
                                        className="inline-flex items-center justify-center p-2 rounded-lg bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                        title={previewUrl ? "View File" : "Preview unavailable"}
                                        disabled={!previewUrl}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => previewUrl ? copyToClipboard(previewUrl) : undefined}
                                        className="inline-flex items-center justify-center p-2 rounded-lg bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                        title={previewUrl ? "Copy short-lived preview URL" : "Preview unavailable"}
                                        disabled={!previewUrl}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleDelete(file.id)}
                                    className="inline-flex items-center justify-center p-2 rounded-lg bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
                                    title="Delete File"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
