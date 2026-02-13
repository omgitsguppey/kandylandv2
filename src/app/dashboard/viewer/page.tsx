"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useDrops } from "@/hooks/useDrops";
import { Loader2, ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { Drop } from "@/types/db";

function ViewerContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const { user, userProfile, loading: authLoading } = useAuth();
    const { drops, loading: dropsLoading } = useDrops(null);
    const router = useRouter();

    const [drop, setDrop] = useState<Drop | null>(null);
    const [isAuthorized, setIsAuthorized] = useState(false);

    const loading = authLoading || dropsLoading;

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/");
                return;
            }

            if (!id) {
                return;
            }

            const foundDrop = drops.find(d => d.id === id);
            setDrop(foundDrop || null);

            if (foundDrop && userProfile?.unlockedContent?.includes(foundDrop.id)) {
                setIsAuthorized(true);
            } else {
                setIsAuthorized(false);
            }
        }
    }, [id, user, userProfile, drops, loading, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-brand-pink animate-spin" />
            </div>
        );
    }

    if (!id || !drop) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-bold text-white mb-2">Drop Not Found</h2>
                <Link href="/dashboard/library" className="text-brand-pink hover:underline">Back to Library</Link>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
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
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <Link href="/dashboard/library" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Library
                </Link>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green border border-brand-green/20 text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" />
                    Secure Environment
                </div>
            </div>

            <div
                className="glass-panel p-1 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative"
                onContextMenu={(e) => e.preventDefault()}
            >
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                    {drop.contentUrl ? (
                        (() => {
                            // Determine type from metadata or URL extension
                            const type = drop.fileMetadata?.type || "";
                            const url = drop.contentUrl;

                            if (type.startsWith("video/") || url.match(/\.(mp4|webm|ogg)$/i)) {
                                return (
                                    <video
                                        controls
                                        controlsList="nodownload"
                                        className="w-full h-full object-contain"
                                        poster={drop.imageUrl}
                                    >
                                        <source src={url} type={type || "video/mp4"} />
                                        Your browser does not support the video tag.
                                    </video>
                                );
                            } else if (type.startsWith("audio/") || url.match(/\.(mp3|wav)$/i)) {
                                return (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-900 to-black">
                                        <div className="w-32 h-32 rounded-full overflow-hidden mb-8 border-4 border-white/10 animate-[spin_10s_linear_infinite]">
                                            <img src={drop.imageUrl} alt="Album Art" className="w-full h-full object-cover" />
                                        </div>
                                        <audio controls controlsList="nodownload" className="w-full max-w-md">
                                            <source src={url} type={type || "audio/mpeg"} />
                                            Your browser does not support the audio element.
                                        </audio>
                                    </div>
                                );
                            } else if (type.startsWith("image/") || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                                return (
                                    <img
                                        src={url}
                                        alt="Secure Content"
                                        className="w-full h-full object-contain pointer-events-none select-none"
                                        draggable={false}
                                    />
                                );
                            } else {
                                // Fallback for Zip / PDF / Other
                                return (
                                    <div className="flex flex-col items-center justify-center p-12 text-center">
                                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
                                            <ShieldCheck className="w-8 h-8 text-brand-cyan" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">Ready to Download</h3>
                                        <p className="text-gray-400 mb-6">This content is available for direct download.</p>
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-8 py-3 bg-brand-pink text-white font-bold rounded-full hover:bg-pink-600 transition-colors shadow-lg shadow-brand-pink/20"
                                        >
                                            Download File
                                        </a>
                                    </div>
                                );
                            }
                        })()
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Content not available
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8">
                <h1 className="text-3xl font-bold text-white mb-2">{drop.title}</h1>
                <p className="text-gray-400 leading-relaxed max-w-2xl">{drop.description}</p>
            </div>
        </div>
    );
}

export default function ViewerPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 text-brand-pink animate-spin" /></div>}>
            <ViewerContent />
        </Suspense>
    );
}
