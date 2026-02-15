"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Lock, ShieldCheck, Heart, Share2, Download } from "lucide-react";
import { toast } from "sonner";
import { Drop } from "@/types/db";
import NextImage from "next/image";

interface ViewerClientProps {
    drop: Drop | null;
}

export function ViewerClient({ drop }: ViewerClientProps) {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Redirect if not logged in (once auth is ready)
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [authLoading, user, router]);

    // Check authorization
    useEffect(() => {
        if (drop && userProfile?.unlockedContent?.includes(drop.id)) {
            setIsAuthorized(true);
        } else {
            setIsAuthorized(false);
        }
    }, [drop, userProfile]);

    // Skeleton for AUTH loading only (Content is already here if drop exists)
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
                <Link href="/dashboard/library" className="text-brand-pink hover:underline">Back to Library</Link>
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
                    className="px-6 py-3 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-colors"
                >
                    Go to Marketplace
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black pb-20">
            {/* 1. Full-Width Media Viewer (Immersive) */}
            <div className="w-full bg-black relative">
                {/* Back Button Overlay */}
                <div className="absolute top-4 left-4 z-20">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/70 transition-all border border-white/10 text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden md:inline">Library</span>
                    </Link>
                </div>

                {/* Media Container - 16:9 on mobile, max-height constraints on desktop */}
                <div className="w-full aspect-video max-h-[85vh] mx-auto bg-zinc-900 flex items-center justify-center relative group">
                    {drop.contentUrl ? (
                        (() => {
                            const type = drop.fileMetadata?.type || "";
                            const url = drop.contentUrl;

                            if (type.startsWith("video/") || url.match(/\.(mp4|webm|ogg)$/i)) {
                                return (
                                    <video
                                        controls
                                        controlsList="nodownload"
                                        className="w-full h-full object-contain"
                                        poster={drop.imageUrl}
                                        autoPlay
                                    >
                                        <source src={url} type={type || "video/mp4"} />
                                    </video>
                                );
                            } else if (type.startsWith("audio/") || url.match(/\.(mp3|wav)$/i)) {
                                return (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black relative">
                                        <NextImage
                                            src={drop.imageUrl}
                                            alt="Album Art"
                                            fill
                                            className="object-cover opacity-30 blur-3xl"
                                        />
                                        <div className="relative z-10 w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl border border-white/10 mb-8">
                                            <NextImage src={drop.imageUrl} alt="Art" fill className="object-cover" />
                                        </div>
                                        <audio controls controlsList="nodownload" className="relative z-10 w-[90%] max-w-md">
                                            <source src={url} type={type || "audio/mpeg"} />
                                        </audio>
                                    </div>
                                );
                            } else if (type.startsWith("image/") || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                                return (
                                    <div className="relative w-full h-full">
                                        <NextImage
                                            src={url}
                                            alt="Content"
                                            fill
                                            className="object-contain"
                                            sizes="100vw"
                                        />
                                    </div>
                                );
                            } else {
                                // Fallback for Files
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
                            <button className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex items-center justify-center gap-2 border border-white/5">
                                <Heart className="w-5 h-5" /> <span className="text-sm">Like</span>
                            </button>
                            <button
                                className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex items-center justify-center gap-2 border border-white/5"
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    toast.success("Link copied!");
                                }}
                            >
                                <Share2 className="w-5 h-5" /> <span className="text-sm">Share</span>
                            </button>
                        </div>

                        {/* 4. Secondary Download (Tertiary) */}
                        {drop.contentUrl && (
                            <a
                                href={drop.contentUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-4 py-3 rounded-xl border border-white/10 text-gray-400 font-medium text-sm flex items-center justify-center gap-2 hover:bg-white/5 hover:text-white transition-all"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download File</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* 5. Retention: More Like This (Static Placeholder for now) */}
                <div className="mt-12 md:mt-20 border-t border-white/5 pt-8">
                    <h3 className="text-lg font-bold text-white mb-6">More from collection</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-50 pointer-events-none grayscale">
                        {/* Visual placeholders context */}
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-square bg-white/5 rounded-xl border border-white/5" />
                        ))}
                    </div>
                    <p className="text-center text-xs text-gray-600 mt-4">Exploring collection coming soon...</p>
                </div>
            </div>
        </div>
    );
}
