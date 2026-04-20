import Link from "next/link";
import NextImage from "next/image";
import { CheckCircle2, ShoppingBag, Download, Eye, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Drop } from "@/types/db";
import { formatUnwrappedLabel, sanitizeDropTags } from "../ViewerHelpers";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface DropInfoOverlayProps {
    drop: Drop;
    user: any;
    userProfile: any;
    contentBlobUrl: string | null;
    activeIndex: number;
    initialCreatorProfile?: { uid: string; displayName: string; username: string; photoURL: string | null; isVerified: boolean; } | null;
    following: boolean;
    submittingFollow: boolean;
    handleFollow: () => void;
    feedbackComplete: boolean;
    submittingFeedback: boolean;
    feedbackValue: boolean | null;
    handleFeedback: (val: boolean) => void;
    retentionDrops: Drop[];
    handleRelatedDropClick: (destination: string, type: string) => void;
    recordDownload: () => void;
}

export function DropInfoOverlay({
    drop,
    user,
    userProfile,
    contentBlobUrl,
    activeIndex,
    initialCreatorProfile,
    following,
    submittingFollow,
    handleFollow,
    feedbackComplete,
    submittingFeedback,
    feedbackValue,
    handleFeedback,
    retentionDrops,
    handleRelatedDropClick,
    recordDownload,
}: DropInfoOverlayProps) {
    const unwrappedAt = useMemo(() => {
        if (!userProfile?.unlockedContentTimestamps) return null;
        const raw = userProfile.unlockedContentTimestamps[drop.id];
        return Number.isFinite(raw) ? Math.floor(raw) : null;
    }, [drop.id, userProfile?.unlockedContentTimestamps]);

    const previewTags = useMemo(() => sanitizeDropTags(drop.tags), [drop.tags]);
    const totalUnlocks = useMemo(() => Number.isFinite(drop.totalUnlocks) ? Math.max(0, Math.floor(drop.totalUnlocks)) : 0, [drop.totalUnlocks]);

    return (
        <div className="max-w-4xl mx-auto px-4 mt-6 md:mt-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                    {initialCreatorProfile && (
                        <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 border border-white/10 rounded-2xl w-full max-w-sm">
                            <NextImage
                                src={initialCreatorProfile.photoURL || "/avatars/default.png"}
                                alt={initialCreatorProfile.displayName}
                                width={40} height={40} unoptimized
                                className="rounded-full bg-black border border-white/20 object-cover w-10 h-10"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <h3 className="text-sm font-bold text-white truncate">{initialCreatorProfile.displayName}</h3>
                                    {initialCreatorProfile.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-brand-purple shrink-0" />}
                                </div>
                                <p className="text-xs text-gray-400 truncate">@{initialCreatorProfile.username}</p>
                            </div>
                            <button
                                onClick={handleFollow} disabled={submittingFollow}
                                className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 border",
                                    following ? "bg-white/10 text-white border-white/20" : "bg-white text-black border-transparent hover:bg-gray-200"
                                )}
                            >
                                {submittingFollow ? <Loader2 className="w-3 h-3 animate-spin"/> : following ? "Following" : "Follow"}
                            </button>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-gray-400 mb-2">
                        <span className="px-2 py-0.5 rounded bg-white/10 border border-white/5 text-brand-purple font-mono uppercase tracking-wider">#{drop.id.slice(0, 4)}</span>
                        {previewTags.map((tag) => (
                            <span key={tag} className={cn("px-2 py-0.5 rounded border text-[11px] font-semibold uppercase tracking-wide",
                                tag === "Sweet" && "bg-brand-purple/20 text-brand-purple border-brand-purple/30",
                                tag === "Spicy" && "bg-white/10 text-white border-white/20",
                                tag === "RAW" && "bg-zinc-800/80 text-white border-white/20"
                            )}>{tag}</span>
                        ))}
                        <span className="opacity-50">•</span>
                        <span>{formatUnwrappedLabel(unwrappedAt)}</span>
                        <span className="opacity-50">•</span>
                        <div className="flex items-center gap-1.5 text-white/80 font-medium bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                            <Eye className="w-3.5 h-3.5 text-brand-purple" />
                            <span>{totalUnlocks.toLocaleString()} unwrapped</span>
                        </div>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">{drop.title}</h1>
                    <div className="prose prose-invert prose-purple max-w-2xl">
                        <p className="text-gray-400 leading-relaxed text-sm md:text-base">{drop.description}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto min-w-[200px]">
                    {user.uid === drop.creatorId && contentBlobUrl && (
                        <a href={contentBlobUrl} download={drop.title} onClick={recordDownload}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm mt-1 hover:bg-white/10"
                        >
                            <Download className="w-4 h-4" /><span>Download Source</span>
                        </a>
                    )}
                    <Link href="/drops" onClick={() => handleRelatedDropClick("/drops", "browse_more")}
                        className="w-full px-4 py-3 rounded-xl bg-white text-black font-black text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] mt-1"
                    >
                        <ShoppingBag className="w-4 h-4" /><span>Browse More Drops</span>
                    </Link>
                </div>
            </div>

            {user.uid !== drop.creatorId && (
                <div className="mt-8 md:mt-12 border border-white/10 rounded-2xl bg-gradient-to-br from-white/5 to-black p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 blur-3xl rounded-full" />
                    <div className="relative z-10 flex-1 text-center sm:text-left">
                        <h3 className="text-lg font-bold text-white mb-1">Did you enjoy this KandyDrop?</h3>
                        <p className="text-sm text-gray-400">Share feedback to earn <span className="font-bold text-brand-purple">10 GumDrops</span> 🍬</p>
                    </div>
                    <div className="relative z-10 flex items-center gap-3 w-full sm:w-auto">
                        {feedbackComplete ? (
                            <div className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-purple/20 border border-brand-purple/30 rounded-xl text-brand-purple font-bold">
                                <CheckCircle2 className="w-4 h-4" /><span>Reward Claimed</span>
                            </div>
                        ) : (
                            <>
                                <button onClick={() => handleFeedback(true)} disabled={submittingFeedback}
                                    className={cn("flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl border font-bold transition-all disabled:opacity-50",
                                        feedbackValue === true ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10 hover:bg-white/10 hover:scale-105")}
                                >
                                    <ThumbsUp className="w-4 h-4" /><span>Yes</span>
                                </button>
                                <button onClick={() => handleFeedback(false)} disabled={submittingFeedback}
                                    className={cn("flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl border font-bold transition-all disabled:opacity-50",
                                        feedbackValue === false ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10 hover:bg-white/10 hover:scale-105")}
                                >
                                    <ThumbsDown className="w-4 h-4" /><span>No</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {retentionDrops.length > 0 && (
                <div className="mt-8 md:mt-12 border-t border-white/5 pt-8">
                    <div className="flex items-center gap-3 mb-6">
                        <h3 className="text-lg font-bold text-white">Continue Unwrapping</h3>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                        {retentionDrops.map((retentionDrop) => (
                            <Link key={retentionDrop.id} href={`/dashboard/viewer?id=${retentionDrop.id}`} onClick={() => handleRelatedDropClick(retentionDrop.id, "library_related")} className="group block w-40 md:w-48 shrink-0 snap-start">
                                <div className="aspect-[3/4] bg-zinc-900 rounded-xl border border-white/10 overflow-hidden relative mb-3 shadow-lg">
                                    {retentionDrop.imageUrl ? (
                                        <NextImage src={retentionDrop.imageUrl} alt={retentionDrop.title} fill className="object-cover bg-black group-hover:scale-105 transition-transform duration-700 ease-out" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl">🍬</div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                                </div>
                                <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-brand-purple transition-colors leading-tight drop-shadow-sm">{retentionDrop.title}</p>
                                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 font-medium">
                                    <Eye className="w-3 h-3 text-brand-purple opacity-80" />
                                    <span>{(retentionDrop.totalUnlocks || 0).toLocaleString()} unwrapped</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
