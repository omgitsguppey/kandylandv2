"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Lock, ShieldCheck, Loader2, ShoppingBag, Download, Video, Images } from "lucide-react";

import { toast } from "sonner";
import { Drop } from "@/types/db";
import NextImage from "next/image";
import { authFetch } from "@/lib/authFetch";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { ContentViewer, ViewerMediaItem } from "@/components/ContentViewer";
import { sendGAEvent } from "@next/third-parties/google";
import { getSimulatedUnwrapsToday } from "@/lib/unwrap-simulator";
import { Eye } from "lucide-react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import useEmblaCarousel from "embla-carousel-react";



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

function formatUnwrappedLabel(unwrappedAt: number | null): string {
    if (!Number.isFinite(unwrappedAt) || !unwrappedAt) {
        return "Unwrapped";
    }

    return `Unwrapped ${new Date(unwrappedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })}`;
}

function sanitizeDropTags(tags: unknown): Array<"Sweet" | "Spicy" | "RAW"> {
    if (!Array.isArray(tags)) {
        return [];
    }

    return tags.filter(
        (tag): tag is "Sweet" | "Spicy" | "RAW" => tag === "Sweet" || tag === "Spicy" || tag === "RAW"
    );
}

export function ViewerClient({ drop, allDrops }: ViewerClientProps) {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [contentBlobUrl, setContentBlobUrl] = useState<string | null>(null);
    const [resolvedContent, setResolvedContent] = useState<ResolvedContent>({ kind: "unknown", mimeType: "" });
    const [contentLoading, setContentLoading] = useState(false);

    const [isSecurityTriggered, setIsSecurityTriggered] = useState(false);

    const videoFallbackTypes = ["video/mp4", "video/webm", "video/ogg"];
    const audioFallbackTypes = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm"];
    const unlockedDropIds = useMemo(() => (
        Array.isArray(userProfile?.unlockedContent) ? userProfile.unlockedContent : []
    ), [userProfile?.unlockedContent]);

    const unwrappedAt = useMemo(() => {
        if (!drop || !userProfile?.unlockedContentTimestamps) {
            return null;
        }

        const raw = userProfile.unlockedContentTimestamps[drop.id];
        if (!Number.isFinite(raw)) {
            return null;
        }

        return Math.floor(raw);
    }, [drop, userProfile?.unlockedContentTimestamps]);

    const previewTags = useMemo(() => sanitizeDropTags(drop?.tags), [drop?.tags]);

    const [simulativeUnwraps, setSimulativeUnwraps] = useState(0);

    useEffect(() => {
        if (drop) {
            setSimulativeUnwraps(getSimulatedUnwrapsToday(drop.id));
        }
    }, [drop]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [emblaRef, emblaApi] = useEmblaCarousel({ dragFree: true, containScroll: "trimSnaps" });

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.scrollTo(activeIndex);
    }, [emblaApi, activeIndex]);

    const availableUrls = useMemo(() => {
        if (!drop) return [];
        // Support both legacy contentUrl and modern contentUrls
        const urls = drop.contentUrls?.length ? [...drop.contentUrls] : (drop.contentUrl ? [drop.contentUrl] : []);
        // Remove duplicates or empty strings
        return Array.from(new Set(urls.filter(url => typeof url === 'string' && url.length > 0)));
    }, [drop]);

    const viewerItems = useMemo<ViewerMediaItem[]>(() => {
        if (!drop || !contentBlobUrl) {
            return [];
        }

        const mediaType = resolvedContent.kind === "video" ? "video" : "image";

        return [{
            id: `${drop.id}-${activeIndex}`,
            url: contentBlobUrl,
            type: mediaType,
            alt: drop.title,
        }];
    }, [contentBlobUrl, drop, resolvedContent.kind, activeIndex]);


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
                const token = await auth.currentUser?.getIdToken();
                if (!token) throw new Error("Not authenticated");

                const proxyUrl = `/api/drops/content?id=${currentDrop.id}&token=${token}&index=${activeIndex}`;
                const targetUrl = availableUrls[activeIndex];

                if (!cancelled) {
                    let guessedMimeType = currentDrop.fileMetadata?.type || "";

                    // If we have a target URL, try strictly parsing it's extension first. 
                    // This handles heterogeneous arrays (e.g., [img.jpg, video.mp4]) where the first fileMetadata.type shouldn't blindly dictate the rest.
                    if (targetUrl) {
                        try {
                            const urlObj = new URL(targetUrl);
                            const pathname = urlObj.pathname.toLowerCase();
                            if (pathname.match(/\.(mp4|webm|ogg|mov)$/)) {
                                guessedMimeType = "video/mp4";
                            } else if (pathname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
                                guessedMimeType = "image/jpeg";
                            }
                        } catch (e) {
                            // Ignore parse errors, fallback to default.
                        }
                    }

                    if (!guessedMimeType) {
                        guessedMimeType = "video/mp4"; // Default fallback
                    }

                    const nextResolvedContent = resolveContent(guessedMimeType, currentDrop.fileMetadata?.type);

                    setContentBlobUrl(proxyUrl);
                    setResolvedContent(nextResolvedContent);
                }
            } catch (err) {
                if (!cancelled) {
                    setResolvedContent({ kind: "unknown", mimeType: "" });
                    toast.error("Failed to load content securely");
                }
            } finally {
                if (!cancelled) setContentLoading(false);
            }
        }

        fetchContent();

        return () => {
            cancelled = true;
        };
    }, [isAuthorized, drop, activeIndex]);


    // Prevent right-click on media
    const preventContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    // Skeleton for AUTH loading only
    if (authLoading) {
        return (
            <SkeletonTheme baseColor="#1a1a1a" highlightColor="#2a2a2a">
                <div className="max-w-4xl mx-auto pt-20">
                    <div className="flex justify-between mb-6">
                        <Skeleton width={100} height={16} />
                        <Skeleton width={128} height={24} borderRadius={9999} />
                    </div>
                    <div className="mb-8">
                        <Skeleton height={400} borderRadius={24} />
                    </div>
                    <Skeleton height={32} width="50%" className="mb-4" />
                    <Skeleton count={2} height={16} className="mb-2" />
                </div>
            </SkeletonTheme>
        );
    }

    if (!user) return null; // Redirecting

    if (!drop) {
        return (
            <div className="text-center py-20 pt-32">
                <h2 className="text-xl font-bold text-white mb-2">Drop Not Found</h2>
                <Link href="/dashboard/library" className="text-brand-purple">Back to Library</Link>
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
        <div className="w-full bg-black">
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
                        "w-full min-h-[38vh] max-h-[70vh] max-w-5xl mx-auto bg-zinc-900 flex items-center justify-center relative group select-none transition-all duration-300 rounded-2xl border border-white/10 overflow-hidden"
                    )}
                    onContextMenu={preventContextMenu}
                    style={{ WebkitUserSelect: "none", userSelect: "none", WebkitUserDrag: "none" } as any}
                >
                    {/* Security Warning Overlay */}
                    {isSecurityTriggered && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-sm">
                            <div className="bg-zinc-900/90 px-6 py-5 rounded-3xl flex flex-col items-center gap-3 border border-white/10 shadow-xl">
                                <ShieldCheck className="w-10 h-10 text-brand-purple animate-pulse" />
                                <div className="text-center">
                                    <p className="text-white font-bold text-lg mb-0.5">Content Protected</p>
                                    <p className="text-xs text-gray-400 font-medium">Capture or recording detected.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={cn("w-full h-full flex items-center justify-center transition-all duration-500", isSecurityTriggered ? "blur-xl opacity-50" : "")}>
                        {contentLoading ? (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-10 h-10 text-brand-purple animate-spin" />
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
                                            className="w-full h-full max-h-[70vh] object-contain bg-black"
                                            poster={drop.imageUrl}
                                            autoPlay
                                            playsInline
                                            preload="auto"
                                            onContextMenu={preventContextMenu}
                                            draggable={false}
                                            onPlay={() => {
                                                sendGAEvent("event", "video_played", {
                                                    content_id: drop.id,
                                                    video_title: drop.title
                                                });
                                            }}
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
                                        <div className="relative w-full h-full bg-black">
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

                {/* 1.5 Multi-File Thumbnail Slider */}
                {availableUrls.length > 1 && (
                    <div className="w-full max-w-5xl mx-auto px-4 mt-6">
                        <div className="overflow-hidden pb-6 pt-2 px-2" ref={emblaRef}>
                            <div className="flex gap-4">
                                {availableUrls.map((url, idx) => {
                                    // Predict if thumbnail should be an image or if it's a video
                                    let isVideo = false;
                                    try {
                                        const parsed = new URL(url).pathname.toLowerCase();
                                        if (parsed.match(/\.(mp4|webm|ogg|mov)$/)) isVideo = true;
                                    } catch (e) { }

                                    // Authenticate proxy route directly for images to allow previews
                                    const thumbUrl = !isVideo && user
                                        ? `/api/drops/content?id=${drop.id}&index=${idx}`
                                        : drop.imageUrl;

                                    return (
                                        <button
                                            key={`thumb-${idx}`}
                                            onClick={() => setActiveIndex(idx)}
                                            className={cn(
                                                "relative flex-[0_0_auto] w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all transform",
                                                activeIndex === idx
                                                    ? "border-brand-purple scale-110 shadow-[0_0_15px_rgba(178,140,255,0.4)] z-10"
                                                    : "border-white/10 opacity-50 hover:opacity-100 hover:border-white/30"
                                            )}
                                        >
                                            <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 z-30">
                                                {isVideo ? <Video className="w-3 h-3 text-white" /> : <Images className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 top-auto bg-gradient-to-t from-black via-black/50 to-transparent flex items-end justify-center pb-0.5 text-[9px] font-bold text-white/50 z-20 pointer-events-none h-6">
                                                {idx + 1}
                                            </div>
                                            <NextImage
                                                src={thumbUrl}
                                                alt={`Thumbnail ${idx + 1}`}
                                                fill
                                                className="object-cover opacity-60 pointer-events-none bg-zinc-900"
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <p className="text-center text-xs text-gray-500 w-full mt-[-8px]">
                            {activeIndex + 1} of {availableUrls.length} files
                        </p>
                    </div>
                )}
            </div>

            {/* 2. Content Info & Engagement */}
            <div className="max-w-4xl mx-auto px-4 mt-6 md:mt-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

                    {/* Title & Metadata */}
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-gray-400 mb-2">
                            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/5 text-brand-purple font-mono uppercase tracking-wider">
                                #{drop.id.slice(0, 4)}
                            </span>
                            {previewTags.map((tag) => (
                                <span
                                    key={tag}
                                    className={cn(
                                        "px-2 py-0.5 rounded border text-[11px] font-semibold uppercase tracking-wide",
                                        tag === "Sweet" && "bg-brand-purple/20 text-brand-purple border-brand-purple/30",
                                        tag === "Spicy" && "bg-white/10 text-white border-white/20",
                                        tag === "RAW" && "bg-zinc-800/80 text-white border-white/20"
                                    )}
                                >
                                    {tag}
                                </span>
                            ))}
                            <span className="opacity-50">•</span>
                            <span>{formatUnwrappedLabel(unwrappedAt)}</span>
                            <span className="opacity-50">•</span>
                            <div className="flex items-center gap-1.5 text-white/80 font-medium bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                <Eye className="w-3.5 h-3.5 text-brand-purple" />
                                <span>{simulativeUnwraps} unwrapped today</span>
                            </div>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">
                            {drop.title}
                        </h1>
                        <div className="prose prose-invert prose-purple max-w-2xl">
                            <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                                {drop.description}
                            </p>
                        </div>
                    </div>

                    {/* 3. Navigation */}
                    <div className="flex flex-col gap-3 w-full md:w-auto min-w-[200px]">
                        {user.uid === drop.creatorId && contentBlobUrl && (
                            <a
                                href={contentBlobUrl}
                                download={drop.title}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm mt-1 hover:bg-white/10"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download Source</span>
                            </a>
                        )}
                        <Link
                            href="/drops"
                            className="w-full px-4 py-3 rounded-xl bg-white text-black font-black text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] mt-1"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            <span>Browse More Drops</span>
                        </Link>
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
                                                className="object-contain bg-black group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl">🍬</div>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-brand-purple transition-colors">{retentionDrop.title}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
