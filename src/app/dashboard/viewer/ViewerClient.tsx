"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Lock, ShieldCheck, Heart, Share2, Download, Loader2, ShoppingBag } from "lucide-react";

import { toast } from "sonner";
import { Drop } from "@/types/db";
import NextImage from "next/image";
import { authFetch } from "@/lib/authFetch";
import { useUI } from "@/context/UIContext";
import { cn } from "@/lib/utils";

const DOWNLOAD_COST = 100;

interface ViewerClientProps {
    drop: Drop | null;
    allDrops?: Drop[];
}

type ContentKind = "video" | "audio" | "image" | "pdf" | "unknown";

interface ResolvedContent {
    kind: ContentKind;
    mimeType: string;
}

const MIME_TYPE_WITHOUT_PARAMETERS = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/;
const GENERIC_BINARY_MIME_TYPES = new Set([
    "application/octet-stream",
    "binary/octet-stream",
    "application/x-download",
    "application/force-download",
]);

function normalizeMimeType(input: string | undefined): string {
    if (!input) return "";

    const value = input.trim().toLowerCase();
    if (!value) return "";

    const [typeWithoutParameters] = value.split(";");
    const normalized = typeWithoutParameters.trim();

    if (!MIME_TYPE_WITHOUT_PARAMETERS.test(normalized)) {
        return "";
    }

    return normalized;
}

function resolveContentKind(mimeType: string): ContentKind {
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType === "application/pdf") return "pdf";
    return "unknown";
}

function resolveContent(blobType: string, metadataType?: string): ResolvedContent {
    const normalizedBlobType = normalizeMimeType(blobType);
    const normalizedMetadataType = normalizeMimeType(metadataType);

    const blobKind = resolveContentKind(normalizedBlobType);
    const metadataKind = resolveContentKind(normalizedMetadataType);

    const blobTypeIsSpecific = normalizedBlobType !== "" && !GENERIC_BINARY_MIME_TYPES.has(normalizedBlobType);

    // Blob MIME comes from the fetched payload and should be the primary source when specific.
    if (blobTypeIsSpecific && blobKind !== "unknown") {
        return {
            kind: blobKind,
            mimeType: normalizedBlobType,
        };
    }

    // Storage providers sometimes respond with generic binary MIME values.
    // In that case we intentionally fall back to trusted metadata collected at upload time.
    if (metadataKind !== "unknown") {
        return {
            kind: metadataKind,
            mimeType: normalizedMetadataType,
        };
    }

    if (blobTypeIsSpecific) {
        return {
            kind: blobKind,
            mimeType: normalizedBlobType,
        };
    }

    return {
        kind: "unknown",
        mimeType: "",
    };
}

export function ViewerClient({ drop, allDrops }: ViewerClientProps) {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { openInsufficientBalanceModal } = useUI();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [contentBlobUrl, setContentBlobUrl] = useState<string | null>(null);
    const [resolvedContent, setResolvedContent] = useState<ResolvedContent>({ kind: "unknown", mimeType: "" });
    const [contentLoading, setContentLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [isSecurityTriggered, setIsSecurityTriggered] = useState(false);

    const videoFallbackTypes = ["video/mp4", "video/webm", "video/ogg"];
    const audioFallbackTypes = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm"];
    const unlockedDropIds = useMemo(() => (
        Array.isArray(userProfile?.unlockedContent) ? userProfile.unlockedContent : []
    ), [userProfile?.unlockedContent]);

    // Redirect if not logged in (once auth is ready)
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [authLoading, user, router]);

    // Check authorization
    useEffect(() => {
        if (drop && unlockedDropIds.includes(drop.id)) {
            setIsAuthorized(true);
        } else {
            setIsAuthorized(false);
        }
    }, [drop, unlockedDropIds]);

    useEffect(() => {
        if (isAuthorized) return;

        setContentBlobUrl(null);
        setResolvedContent({ kind: "unknown", mimeType: "" });
    }, [isAuthorized]);

    // Security Hooks for Anti-Ripping
    useEffect(() => {
        if (!isAuthorized || !drop) return;

        const logViolation = async (reason: string) => {
            setIsSecurityTriggered(true);
            try {
                // Fire and forget telemetry
                authFetch("/api/security/log-attempt", {
                    method: "POST",
                    body: JSON.stringify({ dropId: drop.id, reason }),
                }).catch(console.error);
            } catch (err) { }

            // Auto unblur after 5 seconds to reduce annoyance for false positives
            setTimeout(() => {
                setIsSecurityTriggered(false);
            }, 5000);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // macOS: Cmd+Shift+3/4/5
            const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5');
            // Windows: Win+Shift+S
            const isWinScreenshot = e.metaKey && e.shiftKey && e.key.toLowerCase() === 's';
            // Global: PrintScreen
            const isPrintScreen = e.key === 'PrintScreen' || e.code === 'PrintScreen';

            if (isMacScreenshot || isWinScreenshot || isPrintScreen) {
                logViolation("screenshot_hotkey");
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                logViolation("window_blur");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [isAuthorized, drop]);

    // Fetch content directly to avoid massive Blob memory allocations
    useEffect(() => {
        if (!isAuthorized || !drop) return;

        const currentDrop = drop;
        let cancelled = false;

        async function fetchContent() {
            setContentLoading(true);
            try {
                const res = await authFetch(`/api/drops/content?id=${currentDrop.id}`, {
                    headers: {
                        Accept: "application/json",
                    },
                });

                if (!res.ok) throw new Error("Failed to load content");

                const data = await res.json();
                if (!data.url) throw new Error("No URL returned");

                if (!cancelled) {
                    let guessedMimeType = currentDrop.fileMetadata?.type || "";
                    if (!guessedMimeType) {
                        const lowerUrl = data.url.toLowerCase();
                        if (lowerUrl.includes(".mp4") || lowerUrl.includes(".webm") || lowerUrl.includes(".mov")) guessedMimeType = "video/mp4";
                        else if (lowerUrl.includes(".jpg") || lowerUrl.includes(".jpeg") || lowerUrl.includes(".png") || lowerUrl.includes(".webp") || lowerUrl.includes(".gif")) guessedMimeType = "image/jpeg";
                        else if (lowerUrl.includes(".mp3") || lowerUrl.includes(".wav") || lowerUrl.includes(".ogg")) guessedMimeType = "audio/mpeg";
                        else if (lowerUrl.includes(".pdf")) guessedMimeType = "application/pdf";
                    }

                    const nextResolvedContent = resolveContent(guessedMimeType, currentDrop.fileMetadata?.type);

                    setContentBlobUrl(data.url);
                    setResolvedContent(nextResolvedContent);
                }
            } catch (err) {
                console.error("Content load error:", err);
                if (!cancelled) {
                    setResolvedContent({ kind: "unknown", mimeType: "" });
                    toast.error("Failed to load content");
                }
            } finally {
                if (!cancelled) setContentLoading(false);
            }
        }

        fetchContent();

        return () => {
            cancelled = true;
        };
    }, [isAuthorized, drop]);

    const handleDownload = useCallback(async () => {
        if (!drop || downloading) return;

        const balance = typeof userProfile?.gumDropsBalance === "number" ? userProfile.gumDropsBalance : 0;
        if (balance < DOWNLOAD_COST) {
            openInsufficientBalanceModal(DOWNLOAD_COST);
            return;
        }

        const confirmed = window.confirm(
            `Downloading this content costs ${DOWNLOAD_COST} Gum Drops. Continue?`
        );
        if (!confirmed) return;

        setDownloading(true);
        try {
            const res = await authFetch("/api/drops/download", {
                method: "POST",
                body: JSON.stringify({ dropId: drop.id }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Download failed");
            }

            // Trigger the actual download
            const link = document.createElement("a");
            link.href = data.downloadUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.click();

            toast.success(`Downloaded! -${DOWNLOAD_COST} Gum Drops`);
        } catch (err: any) {
            toast.error(err.message || "Download failed");
        } finally {
            setDownloading(false);
        }
    }, [drop, downloading, openInsufficientBalanceModal, userProfile?.gumDropsBalance]);


    // Prevent right-click on media
    const preventContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    // Skeleton for AUTH loading only
    if (authLoading) {
        return (
            <div className="max-w-4xl mx-auto pt-20 animate-pulse">
                <div className="flex justify-between mb-6">
                    <div className="h-4 w-24 bg-white/10 rounded" />
                    <div className="h-6 w-32 bg-white/10 rounded-full" />
                </div>
                <div className="aspect-video bg-white/5 rounded-3xl mb-8" />
                <div className="h-8 w-1/2 bg-white/10 rounded mb-4" />
                <div className="h-4 w-3/4 bg-white/5 rounded" />
            </div>
        );
    }

    if (!user) return null; // Redirecting

    if (!drop) {
        return (
            <div className="text-center py-20 pt-32">
                <h2 className="text-xl font-bold text-white mb-2">Drop Not Found</h2>
                <Link href="/dashboard/library" className="text-brand-pink">Back to Library</Link>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 pt-20">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-gray-400 mb-8 max-w-md">
                    You do not own this drop. Please purchase it from the marketplace to unlock this content.
                </p>
                <Link
                    href="/"
                    className="px-6 py-3 rounded-full bg-white text-black font-bold transition-colors"
                >
                    Go to Marketplace
                </Link>
            </div>
        );
    }

    // Calculate retention drops
    const retentionDrops = (allDrops || [])
        .filter((d) => unlockedDropIds.includes(d.id) && d.id !== drop.id)
        .slice(0, 4);

    return (
        <div className="min-h-screen bg-black pb-20">
            {/* 1. Full-Width Media Viewer (Immersive) */}
            <div className="w-full bg-black relative">
                {/* Back Button Overlay */}
                <div className="absolute top-4 left-4 z-20">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md text-white/80 transition-all border border-white/10 text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden md:inline">Library</span>
                    </Link>
                </div>

                {/* Media Container */}
                <div
                    className={cn(
                        "w-full min-h-[50vh] max-h-[85vh] mx-auto bg-zinc-900 flex items-center justify-center relative group select-none transition-all duration-300",
                        isSecurityTriggered ? "blur-2xl grayscale" : ""
                    )}
                    onContextMenu={preventContextMenu}
                    style={{ WebkitUserSelect: "none", userSelect: "none", WebkitUserDrag: "none" } as any}
                >
                    {/* Security Warning Overlay */}
                    {isSecurityTriggered && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/90 px-8 py-6 rounded-3xl flex flex-col items-center gap-4 border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.3)]">
                                <ShieldCheck className="w-12 h-12 text-red-500 animate-pulse" />
                                <div className="text-center">
                                    <p className="text-white font-black tracking-widest text-xl mb-1">CONTENT PROTECTED</p>
                                    <p className="text-sm text-red-400 font-medium">Recording capture detected.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {contentLoading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-10 h-10 text-brand-pink animate-spin" />
                            <p className="text-sm text-gray-400">Loading content...</p>
                        </div>
                    ) : contentBlobUrl ? (
                        (() => {
                            if (resolvedContent.kind === "video") {
                                return (
                                    <video
                                        controls
                                        controlsList="nodownload noplaybackrate"
                                        disablePictureInPicture
                                        className="w-full h-full max-h-[85vh] object-contain"
                                        poster={drop.imageUrl}
                                        autoPlay
                                        playsInline
                                        preload="auto"
                                        onContextMenu={preventContextMenu}
                                        draggable={false}
                                    >
                                        <source src={contentBlobUrl} type={resolvedContent.mimeType} />
                                        {videoFallbackTypes.filter((type) => type !== resolvedContent.mimeType).map((type) => (
                                            <source key={type} src={contentBlobUrl} type={type} />
                                        ))}
                                    </video>
                                );
                            } else if (resolvedContent.kind === "audio") {
                                return (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black relative">
                                        <NextImage
                                            src={drop.imageUrl}
                                            alt="Album Art"
                                            fill
                                            className="object-cover opacity-30 blur-3xl"
                                        />
                                        <div className="relative z-10 w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl border border-white/10 mb-8">
                                            <NextImage src={drop.imageUrl} alt="Art" fill priority className="object-cover" />
                                        </div>
                                        <audio
                                            controls
                                            controlsList="nodownload"
                                            className="relative z-10 w-[90%] max-w-md"
                                            onContextMenu={preventContextMenu}
                                        >
                                            <source src={contentBlobUrl} type={resolvedContent.mimeType} />
                                            {audioFallbackTypes.filter((type) => type !== resolvedContent.mimeType).map((type) => (
                                                <source key={type} src={contentBlobUrl} type={type} />
                                            ))}
                                        </audio>
                                    </div>
                                );
                            } else if (resolvedContent.kind === "image") {
                                return (
                                    <div className="relative w-full h-full">
                                        <img
                                            src={contentBlobUrl}
                                            alt="Content"
                                            className="w-full h-full object-contain"
                                            draggable={false}
                                            onContextMenu={preventContextMenu}
                                        />
                                    </div>
                                );
                            } else if (resolvedContent.kind === "pdf") {
                                return (
                                    <div className="w-full h-[85vh] bg-white rounded-md overflow-hidden">
                                        <object
                                            data={contentBlobUrl}
                                            type="application/pdf"
                                            className="w-full h-full"
                                        >
                                            <p className="p-4 text-black text-center">
                                                Your browser doesn't support built-in PDF viewing.
                                                <a href={contentBlobUrl} className="text-brand-purple ml-2 underline" download>
                                                    Download Instead
                                                </a>
                                            </p>
                                        </object>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="text-center p-10">
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <ShieldCheck className="w-10 h-10 text-gray-400" />
                                        </div>
                                        <p className="text-gray-400">File Preview Not Available</p>
                                    </div>
                                );
                            }
                        })()
                    ) : (
                        <div className="text-gray-500">Content Unavailable</div>
                    )}
                </div>
            </div>

            {/* 2. Content Info & Engagement */}
            <div className="max-w-4xl mx-auto px-4 mt-6 md:mt-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

                    {/* Title & Metadata */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 text-xs md:text-sm text-gray-400 mb-2">
                            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/5 text-brand-pink font-mono uppercase tracking-wider">
                                #{drop.id.slice(0, 4)}
                            </span>
                            <span>•</span>
                            <span>Unlocked Just Now</span>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">
                            {drop.title}
                        </h1>
                        <p className="text-gray-400 leading-relaxed text-sm md:text-base max-w-2xl">
                            {drop.description}
                        </p>
                    </div>

                    {/* 3. Engagement & Actions */}
                    <div className="flex flex-col gap-3 w-full md:w-auto min-w-[200px]">
                        {/* Primary Actions Row */}
                        <div className="flex items-center gap-2">
                            <button className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 border border-white/5">
                                <Heart className="w-4 h-4" /> <span className="text-sm">Like</span>
                            </button>
                            <button
                                className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 border border-white/5"
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    toast.success("Link copied!");
                                }}
                            >
                                <Share2 className="w-4 h-4" /> <span className="text-sm">Share</span>
                            </button>
                        </div>

                        {/* Navigation Loop */}
                        <Link
                            href="/drops"
                            className="w-full px-4 py-3 rounded-xl bg-white text-black font-black text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] mt-1"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            <span>Browse More Drops</span>
                        </Link>

                        {/* 4. Paid Download */}
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="w-full px-4 py-3 rounded-xl border border-brand-pink/20 bg-brand-pink/10 text-brand-pink font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {downloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            <span>{downloading ? "Processing..." : `Download (${DOWNLOAD_COST} Gum Drops)`}</span>
                        </button>
                    </div>
                </div>

                {/* 5. Retention: More Like This */}
                {retentionDrops.length > 0 && (
                    <div className="mt-12 md:mt-20 border-t border-white/5 pt-8">
                        <h3 className="text-lg font-bold text-white mb-6">More from your collection</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {retentionDrops.map((retentionDrop) => (
                                <Link
                                    key={retentionDrop.id}
                                    href={`/dashboard/viewer?id=${retentionDrop.id}`}
                                    className="group block"
                                >
                                    <div className="aspect-square bg-zinc-900 rounded-xl border border-white/5 overflow-hidden relative mb-2">
                                        {retentionDrop.imageUrl ? (
                                            <NextImage
                                                src={retentionDrop.imageUrl}
                                                alt={retentionDrop.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl">🍬</div>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-brand-pink transition-colors">{retentionDrop.title}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
